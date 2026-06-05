from fastapi.testclient import TestClient
from api.main import create_app

TEST_DB = "/tmp/nightlio_test_errors.db"


def test_not_found_returns_error_json():
    client = TestClient(create_app(db_path=TEST_DB), raise_server_exceptions=False)
    response = client.get("/api/non-existent-route-xyz")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
