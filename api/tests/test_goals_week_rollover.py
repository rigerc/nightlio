from datetime import datetime, timedelta
import sqlite3

from fastapi.testclient import TestClient
from api.main import create_app

TEST_DB_PATH = "/tmp/nightlio_test_goals.db"


def _week_start_iso(d=None):
    if d is None:
        d = datetime.now().date()
    start = d - timedelta(days=d.weekday())
    return start.strftime("%Y-%m-%d")


def _auth_headers(client):
    resp = client.post("/api/auth/local/login")
    assert resp.status_code == 200
    token = resp.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_goals_reset_on_new_week_list_endpoint(tmp_path):
    db_path = str(tmp_path / "test_goals.db")
    client = TestClient(create_app(db_path=db_path))

    headers = _auth_headers(client)
    resp = client.post(
        "/api/goals",
        json={"title": "Daily Walk", "description": "30 mins", "frequency_per_week": 7},
        headers=headers,
    )
    assert resp.status_code in (200, 201)
    goal_id = resp.json().get("id")
    assert goal_id

    last_week_monday = _week_start_iso(datetime.now().date() - timedelta(days=7))
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            "UPDATE goals SET completed = ?, period_start = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (3, last_week_monday, goal_id),
        )
        conn.commit()

    resp = client.get("/api/goals", headers=headers)
    assert resp.status_code == 200
    lst = resp.json()
    assert isinstance(lst, list)
    g = next((x for x in lst if x["id"] == goal_id), None)
    assert g is not None
    assert g["completed"] == 0, "expected completed to reset at new week start"
    assert g["period_start"] == _week_start_iso()
