from fastapi.testclient import TestClient
from api.main import create_app

TEST_DB = "/tmp/nightlio_test_app.db"


def _client():
    return TestClient(create_app(db_path=TEST_DB))


def test_health_check():
    client = _client()
    resp = client.get("/api/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"


def test_time_endpoint():
    client = _client()
    resp = client.get("/api/time")
    assert resp.status_code == 200
    assert "time" in resp.json()


def test_groups_endpoint():
    client = _client()
    resp = client.get("/api/groups")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_moods_endpoint_requires_auth():
    client = _client()
    resp = client.get("/api/moods")
    assert resp.status_code in (401, 403)


def test_moods_endpoint_with_auth():
    client = _client()
    login = client.post("/api/auth/local/login")
    token = login.json()["token"]
    resp = client.get("/api/moods", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
