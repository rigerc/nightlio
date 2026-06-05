from fastapi.testclient import TestClient
from api.main import create_app

TEST_DB = "/tmp/nightlio_test_config.db"


def test_config_endpoint_client():
    client = TestClient(create_app(db_path=TEST_DB))
    resp = client.get("/api/config")
    assert resp.status_code == 200
    data = resp.json()
    assert set(data.keys()) == {
        "enable_google_oauth",
        "enable_mood_music",
        "google_client_id",
    }
    assert isinstance(data["enable_google_oauth"], bool)
    assert isinstance(data["enable_mood_music"], bool)
