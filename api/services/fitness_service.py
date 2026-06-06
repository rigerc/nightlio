"""Fitness service: Google Health API v4 integration.

Handles PKCE token storage (encrypted at rest), data sync from Google Health API v4,
and automatic tag injection into mood entries.
"""
from __future__ import annotations

import base64
import hashlib
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)

GOOGLE_HEALTH_BASE = "https://health.googleapis.com/v4"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

# Google Health API v4 exercise activityName values → Sports group option names
ACTIVITY_TO_TAG: Dict[str, str] = {
    "running": "ran",
    "run": "ran",
    "trail running": "ran",
    "trail_running": "ran",
    "walking": "walked",
    "walk": "walked",
    "hiking": "walked",
    "cycling": "cycled",
    "biking": "cycled",
    "bike": "cycled",
    "mountain biking": "cycled",
    "mountain_biking": "cycled",
    "indoor cycling": "cycled",
    "indoor_cycling": "cycled",
    "workout": "worked out",
    "strength training": "worked out",
    "strength_training": "worked out",
    "weightlifting": "worked out",
    "weight training": "worked out",
    "swimming": "worked out",
    "rowing": "worked out",
    "aerobics": "worked out",
    "high intensity interval training": "worked out",
    "hiit": "worked out",
    "yoga": "yoga",
    "stretching": "stretched",
    "stretch": "stretched",
    # Legacy Google Fit numeric activity codes
    "7": "ran",
    "8": "walked",
    "1": "cycled",
    "9": "worked out",
    "82": "worked out",
    "83": "yoga",
}

# Steps thresholds → Health group tags (first match wins)
STEPS_TAGS = [
    (10000, "active"),
    (6000, "healthy"),
    (0, "sluggish"),
]

# Sleep duration thresholds in minutes → Sleep group tags
SLEEP_TAGS = [
    (420, "well-rested"),   # >= 7 hours
    (300, "tired"),          # 5–7 hours
    (0, "exhausted"),        # < 5 hours
]


def _derive_fernet_key(secret: str) -> bytes:
    raw = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(raw)


class FitnessService:
    """Manages Google Health API v4 connections, token lifecycle, and data sync."""

    def __init__(self, db: Any) -> None:
        self.db = db
        self._fernet: Optional[Any] = None

    # --- Encryption helpers ---

    def _get_fernet(self, cfg: Any) -> Any:
        if self._fernet is None:
            from cryptography.fernet import Fernet  # late import; optional dep
            key = (
                cfg.FITNESS_TOKEN_KEY.encode()
                if cfg.FITNESS_TOKEN_KEY
                else _derive_fernet_key(cfg.JWT_SECRET)
            )
            self._fernet = Fernet(key)
        return self._fernet

    def _encrypt(self, plaintext: str, cfg: Any) -> str:
        return self._get_fernet(cfg).encrypt(plaintext.encode()).decode()

    def _decrypt(self, ciphertext: str, cfg: Any) -> str:
        return self._get_fernet(cfg).decrypt(ciphertext.encode()).decode()

    # --- Public API ---

    def store_tokens(
        self,
        user_id: int,
        provider: str,
        access_token: str,
        refresh_token: Optional[str],
        expires_in: Optional[int],
        cfg: Any,
    ) -> None:
        access_enc = self._encrypt(access_token, cfg)
        refresh_enc = self._encrypt(refresh_token, cfg) if refresh_token else None
        expires_at: Optional[str] = None
        if expires_in:
            expires_at = (
                datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            ).isoformat()
        self.db.upsert_fitness_connection(user_id, provider, access_enc, refresh_enc, expires_at)
        logger.info("Stored fitness tokens for user %s provider %s", user_id, provider)

    def get_connection_status(self, user_id: int, provider: str) -> Dict:
        row = self.db.get_fitness_connection(user_id, provider)
        if not row:
            return {"connected": False, "provider": None, "last_synced_at": None}
        return {
            "connected": True,
            "provider": row["provider"],
            "last_synced_at": row.get("last_synced_at"),
        }

    def disconnect(self, user_id: int, provider: str) -> None:
        self.db.delete_fitness_connection(user_id, provider)
        self.db.delete_fitness_data_by_provider(user_id, provider)
        logger.info("Fitness disconnected for user %s provider %s", user_id, provider)

    def sync(self, user_id: int, provider: str, cfg: Any, days: int = 30) -> int:
        row = self.db.get_fitness_connection(user_id, provider)
        if not row:
            raise ValueError(f"No fitness connection for user {user_id} provider {provider}")

        # Skip if synced within the last hour to avoid hammering the API on every page load
        if row.get("last_synced_at"):
            try:
                last = datetime.fromisoformat(row["last_synced_at"].replace("Z", "+00:00"))
                if (datetime.now(timezone.utc) - last).total_seconds() < 3600:
                    logger.info("Sync skipped (last sync < 1h ago) for user %s", user_id)
                    return 0
            except Exception:
                pass

        access_token = self._maybe_refresh_token(row, cfg)
        end = date.today()
        start = end - timedelta(days=days - 1)

        raw_data = self._fetch_google_health_data(access_token, start, end)

        count = 0
        for point in raw_data:
            self.db.upsert_fitness_data(
                user_id=user_id,
                provider=provider,
                data_type=point["data_type"],
                date=point["date"],
                value=point["value"],
                metadata=point.get("metadata"),
            )
            count += 1

        self._apply_fitness_to_entries(user_id, raw_data)
        self.db.update_fitness_last_synced(user_id, provider)
        logger.info("Synced %d fitness data points for user %s", count, user_id)
        return count

    def get_data(
        self,
        user_id: int,
        *,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[Dict]:
        return self.db.get_fitness_data(user_id, start_date=start_date, end_date=end_date)

    def get_data_for_dates(self, user_id: int, dates: List[str]) -> Dict[str, List[Dict]]:
        return self.db.get_fitness_data_for_dates(user_id, dates)

    # --- Internal helpers ---

    def _maybe_refresh_token(self, row: Dict, cfg: Any) -> str:
        access_token = self._decrypt(row["access_token"], cfg)
        expires_at = row.get("expires_at")
        if expires_at:
            try:
                expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                if expiry - datetime.now(timezone.utc) > timedelta(minutes=5):
                    return access_token
            except Exception:
                pass

        refresh_enc = row.get("refresh_token")
        if not refresh_enc:
            logger.warning("No refresh token available; using potentially-expired access token")
            return access_token

        try:
            refresh_token = self._decrypt(refresh_enc, cfg)
            resp = requests.post(
                GOOGLE_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": cfg.GOOGLE_HEALTH_CLIENT_ID,
                },
                timeout=15,
            )
            resp.raise_for_status()
            token_data = resp.json()
            new_token = token_data["access_token"]
            new_expires = (
                datetime.now(timezone.utc)
                + timedelta(seconds=token_data.get("expires_in", 3600))
            ).isoformat()
            self.db.update_fitness_tokens(
                row["user_id"], row["provider"],
                self._encrypt(new_token, cfg), new_expires,
            )
            return new_token
        except Exception as exc:
            logger.error("Token refresh failed: %s", exc)
            return access_token

    def _fetch_google_health_data(
        self, access_token: str, start: date, end: date
    ) -> List[Dict]:
        """Fetch health data for the date range from Google Health API v4."""
        headers = {"Authorization": f"Bearer {access_token}"}
        # Civil datetime format (no timezone) for interval/session types
        civil_start = f"{start.isoformat()}T00:00:00"
        # Use end + 1 day as exclusive upper bound (< operator in filter)
        civil_end = f"{(end + timedelta(days=1)).isoformat()}T00:00:00"
        # RFC 3339 for sample types
        rfc_start = f"{start.isoformat()}T00:00:00Z"
        rfc_end = f"{(end + timedelta(days=1)).isoformat()}T00:00:00Z"

        result: List[Dict] = []

        # Steps: interval type, filter on civil_start_time
        result.extend(self._list_data_type(
            "steps", headers,
            f'steps.interval.civil_start_time >= "{civil_start}" AND steps.interval.civil_start_time < "{civil_end}"',
            self._parse_steps,
        ))

        # Sleep: session type, filter on interval.end_time (RFC 3339)
        result.extend(self._list_data_type(
            "sleep", headers,
            f'sleep.interval.end_time >= "{rfc_start}" AND sleep.interval.end_time < "{rfc_end}"',
            self._parse_sleep,
        ))

        # Heart rate: sample type, filter on physical_time (RFC 3339)
        result.extend(self._list_data_type(
            "heart-rate", headers,
            f'heart_rate.sample_time.physical_time >= "{rfc_start}" AND heart_rate.sample_time.physical_time < "{rfc_end}"',
            self._parse_heart_rate,
        ))

        # Exercise sessions: session type, filter on civil_start_time
        result.extend(self._list_data_type(
            "exercise", headers,
            f'exercise.interval.civil_start_time >= "{civil_start}" AND exercise.interval.civil_start_time < "{civil_end}"',
            self._parse_exercise,
        ))

        # Total calories: only supports dailyRollUp
        result.extend(self._daily_rollup(
            "total-calories", headers, start, end, "calories",
        ))

        # Active minutes: only supports dailyRollUp
        result.extend(self._daily_rollup(
            "active-minutes", headers, start, end, "active_minutes",
        ))

        return result

    def _list_data_type(
        self,
        type_name: str,
        headers: Dict,
        filter_expr: str,
        parser,
    ) -> List[Dict]:
        url = f"{GOOGLE_HEALTH_BASE}/users/me/dataTypes/{type_name}/dataPoints"
        try:
            resp = requests.get(
                url,
                headers=headers,
                params={"filter": filter_expr, "pageSize": 1000},
                timeout=20,
            )
            if resp.status_code == 404:
                logger.debug("Data type %s not available (404)", type_name)
                return []
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            logger.warning("Failed to fetch %s: %s", type_name, exc)
            return []

        result = []
        for pt in data.get("dataPoints", []):
            try:
                parsed = parser(pt)
                if parsed:
                    result.extend(parsed if isinstance(parsed, list) else [parsed])
            except Exception as exc:
                logger.debug("Failed to parse %s data point: %s", type_name, exc)
        return result

    def _daily_rollup(
        self,
        type_name: str,
        headers: Dict,
        start: date,
        end: date,
        output_type: str,
    ) -> List[Dict]:
        url = f"{GOOGLE_HEALTH_BASE}/users/me/dataTypes/{type_name}/dataPoints:dailyRollUp"
        body = {
            "range": {
                "start": {"date": {"year": start.year, "month": start.month, "day": start.day}},
                "end": {"date": {"year": end.year, "month": end.month, "day": end.day}},
            },
            "windowSizeDays": 1,
        }
        try:
            resp = requests.post(url, headers=headers, json=body, timeout=20)
            if resp.status_code in (404, 405):
                logger.debug("dailyRollUp not available for %s (%d)", type_name, resp.status_code)
                return []
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            logger.warning("dailyRollUp failed for %s: %s", type_name, exc)
            return []

        result = []
        for pt in data.get("rollupDataPoints", []):
            try:
                # The day is encoded in the civil_start_time of the interval field
                # or in a top-level date field depending on the API version
                day = _extract_day_from_rollup(pt)
                value = _extract_rollup_value(pt, type_name)
                if day and value is not None:
                    result.append({
                        "data_type": output_type,
                        "date": day,
                        "value": round(float(value), 2),
                        "metadata": None,
                    })
            except Exception as exc:
                logger.debug("Failed to parse rollup point for %s: %s", type_name, exc)
        return result

    # --- Data point parsers ---

    def _parse_steps(self, pt: Dict) -> Optional[Dict]:
        payload = pt.get("steps", {})
        count = payload.get("count")
        if count is None:
            return None
        interval = payload.get("interval", {})
        day = _civil_to_date(interval.get("civilStartTime") or interval.get("civil_start_time", ""))
        if not day:
            return None
        return {"data_type": "steps", "date": day, "value": float(count), "metadata": None}

    def _parse_sleep(self, pt: Dict) -> Optional[Dict]:
        payload = pt.get("sleep", {})
        interval = payload.get("interval", {})
        start_str = interval.get("startTime") or interval.get("start_time", "")
        end_str = interval.get("endTime") or interval.get("end_time", "")
        if not (start_str and end_str):
            return None
        try:
            start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
            end_dt = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
            minutes = (end_dt - start_dt).total_seconds() / 60
            day = end_dt.date().isoformat()
            return {"data_type": "sleep_minutes", "date": day, "value": round(minutes, 1), "metadata": None}
        except Exception:
            return None

    def _parse_heart_rate(self, pt: Dict) -> Optional[Dict]:
        payload = pt.get("heartRate", pt.get("heart_rate", {}))
        bpm = payload.get("beatsPerMinute") or payload.get("beats_per_minute")
        if bpm is None:
            return None
        sample = payload.get("sampleTime", payload.get("sample_time", {}))
        ts = sample.get("physicalTime") or sample.get("physical_time", "")
        day = ts[:10] if len(ts) >= 10 else None
        if not day:
            return None
        return {"data_type": "heart_rate_avg", "date": day, "value": float(bpm), "metadata": None}

    def _parse_exercise(self, pt: Dict) -> List[Dict]:
        payload = pt.get("exercise", {})
        activity = str(payload.get("activityName", payload.get("activity_name", ""))).lower().strip()
        interval = payload.get("interval", {})

        start_str = interval.get("civilStartTime") or interval.get("civil_start_time", "")
        end_str = interval.get("civilEndTime") or interval.get("civil_end_time", start_str)
        day = _civil_to_date(start_str)
        if not day:
            return []

        try:
            s = datetime.fromisoformat(start_str)
            e = datetime.fromisoformat(end_str) if end_str else s
            duration_sec = max(0, int((e - s).total_seconds()))
        except Exception:
            duration_sec = 0

        meta: Dict[str, Any] = {
            "activity_type": activity,
            "duration_seconds": duration_sec,
        }

        distance_m = _float_or_none(payload.get("distance"))
        calories = _float_or_none(payload.get("calories"))

        if distance_m and distance_m > 0:
            meta["distance_meters"] = round(distance_m, 1)
            if duration_sec > 0:
                meta["avg_pace_s_per_km"] = round(duration_sec / (distance_m / 1000))
                meta["avg_speed_m_s"] = round(distance_m / duration_sec, 2)
        if calories and calories > 0:
            meta["calories"] = round(calories)

        # Also emit aggregated calories/distance as separate data points for the entry list
        result = [{"data_type": "workout", "date": day, "value": 1.0, "metadata": meta}]
        return result

    # --- Entry-tag injection ---

    def _apply_fitness_to_entries(self, user_id: int, synced_data: List[Dict]) -> None:
        """Auto-add matching activity tags to mood entries for each synced date."""
        by_date: Dict[str, List[Dict]] = {}
        for pt in synced_data:
            by_date.setdefault(pt["date"], []).append(pt)

        for day, points in by_date.items():
            entry_id = self.db.get_entry_id_for_date(user_id, day)
            if not entry_id:
                continue

            tags_to_add: set = set()
            for pt in points:
                dtype = pt["data_type"]
                value = pt["value"]
                meta = pt.get("metadata") or {}

                if dtype == "steps":
                    for threshold, tag in STEPS_TAGS:
                        if value >= threshold:
                            tags_to_add.add(tag)
                            break

                elif dtype == "sleep_minutes":
                    for threshold, tag in SLEEP_TAGS:
                        if value >= threshold:
                            tags_to_add.add(tag)
                            break

                elif dtype == "workout":
                    activity = str(meta.get("activity_type", "")).lower().strip()
                    tag = ACTIVITY_TO_TAG.get(activity)
                    if tag:
                        tags_to_add.add(tag)

            for tag_name in tags_to_add:
                option_id = self.db.get_option_id_by_name(tag_name)
                if option_id:
                    self.db.insert_entry_selection_if_absent(entry_id, option_id, "google_health")


# --- Utility helpers ---

def _civil_to_date(civil: str) -> Optional[str]:
    """Extract YYYY-MM-DD from a civil datetime string like '2026-01-15T07:30:00'."""
    if civil and len(civil) >= 10:
        return civil[:10]
    return None


def _float_or_none(v: Any) -> Optional[float]:
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _extract_day_from_rollup(pt: Dict) -> Optional[str]:
    """Try to extract the YYYY-MM-DD date from a rollup data point."""
    # Various possible locations depending on API version
    for field in pt.values():
        if isinstance(field, dict):
            interval = field.get("interval", {})
            start = (
                interval.get("civilStartTime")
                or interval.get("civil_start_time", "")
            )
            if start and len(start) >= 10:
                return start[:10]
            # Check for a `date` field
            d = field.get("date") or field.get("civilDate")
            if isinstance(d, dict):
                y, m, day_ = d.get("year"), d.get("month"), d.get("day")
                if y and m and day_:
                    return f"{y:04d}-{m:02d}-{day_:02d}"
    return None


def _extract_rollup_value(pt: Dict, type_name: str) -> Optional[float]:
    """Extract the numeric value from a rollup data point."""
    snake = type_name.replace("-", "_")
    payload = pt.get(snake, pt.get(type_name, {}))
    if not isinstance(payload, dict):
        return None
    # Common value field names
    for key in ("energy", "value", "count", "minutes", "beatsPerMinute", "beats_per_minute"):
        v = payload.get(key)
        if v is not None:
            try:
                return float(v)
            except (TypeError, ValueError):
                pass
    # Last resort: first numeric value in the dict
    for v in payload.values():
        if isinstance(v, (int, float)):
            return float(v)
    return None
