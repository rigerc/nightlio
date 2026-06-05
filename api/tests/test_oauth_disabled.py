from fastapi.testclient import TestClient
from api.main import create_app

TEST_DB = "/tmp/nightlio_test_oauth.db"


def test_oauth_routes_not_registered_when_disabled():
    client = TestClient(create_app(db_path=TEST_DB), raise_server_exceptions=False)
    # With default config (ENABLE_GOOGLE_OAUTH=false) OAuth routes should return 404
    resp = client.get("/api/auth/login/google")
    assert resp.status_code in (404, 405)
