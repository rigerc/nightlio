from fastapi.testclient import TestClient
from api.main import create_app

TEST_DB = "/tmp/nightlio_test_local_auth.db"


def test_local_login_success():
    client = TestClient(create_app(db_path=TEST_DB))
    resp = client.post("/api/auth/local/login")
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert "user" in data and "id" in data["user"]
