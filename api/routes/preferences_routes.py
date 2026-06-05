from flask import Blueprint, request, jsonify
from api.services.preferences_service import PreferencesService
from api.utils.auth_middleware import require_auth, get_current_user_id


def create_preferences_routes(preferences_service: PreferencesService):
    preferences_bp = Blueprint("preferences", __name__)

    @preferences_bp.route("/preferences/mood-icons", methods=["GET"])
    @require_auth
    def get_mood_icons():
        try:
            user_id = get_current_user_id()
            if user_id is None:
                return jsonify({"error": "Unauthorized"}), 401
            icons = preferences_service.get_mood_icons(user_id)
            return jsonify({"icons": icons})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @preferences_bp.route("/preferences/mood-icons", methods=["PUT"])
    @require_auth
    def save_mood_icons():
        try:
            user_id = get_current_user_id()
            if user_id is None:
                return jsonify({"error": "Unauthorized"}), 401
            data = request.json or {}
            icons = data.get("icons", {})
            if not isinstance(icons, dict):
                return jsonify({"error": "icons must be an object"}), 400
            # Validate keys are mood values 1-5 and values are strings
            validated = {}
            for k, v in icons.items():
                try:
                    mood_val = int(k)
                    if 1 <= mood_val <= 5:
                        validated[str(mood_val)] = str(v)
                except (TypeError, ValueError):
                    pass
            preferences_service.save_mood_icons(user_id, validated)
            return jsonify({"status": "success", "icons": validated})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return preferences_bp
