import os
import pytest
from fastapi.testclient import TestClient
from api.main import create_app

TEST_DB_PATH = "/tmp/nightlio_test_slider_groups.db"


def _reset_test_db():
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


@pytest.fixture()
def client():
    _reset_test_db()
    yield TestClient(create_app(db_path=TEST_DB_PATH))
    _reset_test_db()


def _auth_headers(client):
    resp = client.post("/api/auth/local/login")
    assert resp.status_code == 200
    token = resp.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def _create_slider_group(client, **overrides):
    payload = {
        "name": "Sleep Quality",
        "type": "slider",
        "slider_min": 1,
        "slider_max": 5,
        "slider_labels": ["Terrible", "Bad", "Okay", "Good", "Awesome"],
    }
    payload.update(overrides)
    resp = client.post("/api/groups", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()["group_id"]


def test_create_slider_group_and_shape(client):
    group_id = _create_slider_group(client)

    groups_resp = client.get("/api/groups")
    assert groups_resp.status_code == 200
    groups = {g["id"]: g for g in groups_resp.json()}
    group = groups[group_id]

    assert group["type"] == "slider"
    assert group["slider_min"] == 1
    assert group["slider_max"] == 5
    assert group["slider_labels"] == ["Terrible", "Bad", "Okay", "Good", "Awesome"]
    assert group["options"] == []


def test_create_slider_group_rejects_mismatched_labels(client):
    resp = client.post(
        "/api/groups",
        json={
            "name": "Positivity",
            "type": "slider",
            "slider_min": 1,
            "slider_max": 5,
            "slider_labels": ["Only one label"],
        },
    )
    assert resp.status_code == 400


def test_create_slider_group_rejects_invalid_range(client):
    resp = client.post(
        "/api/groups",
        json={"name": "Bad Range", "type": "slider", "slider_min": 5, "slider_max": 1},
    )
    assert resp.status_code == 400


def test_entry_slider_values_persist_and_replace(client):
    headers = _auth_headers(client)
    group_id = _create_slider_group(client)

    create_resp = client.post(
        "/api/mood",
        headers=headers,
        json={
            "mood": 3,
            "date": "2024-01-02",
            "content": "Slept okay",
            "slider_values": {str(group_id): 4},
        },
    )
    assert create_resp.status_code == 201
    entry_id = create_resp.json()["entry_id"]

    values_resp = client.get(f"/api/mood/{entry_id}/slider-values", headers=headers)
    assert values_resp.status_code == 200
    values = values_resp.json()
    assert len(values) == 1
    assert values[0]["group_id"] == group_id
    assert values[0]["value"] == 4
    assert values[0]["group_name"] == "Sleep Quality"
    assert values[0]["slider_min"] == 1
    assert values[0]["slider_max"] == 5
    assert values[0]["slider_labels"] == ["Terrible", "Bad", "Okay", "Good", "Awesome"]

    update_resp = client.put(
        f"/api/mood/{entry_id}",
        headers=headers,
        json={"slider_values": {str(group_id): 2}},
    )
    assert update_resp.status_code == 200
    updated_entry = update_resp.json()["entry"]
    assert [sv["value"] for sv in updated_entry["slider_values"]] == [2]

    clear_resp = client.put(
        f"/api/mood/{entry_id}",
        headers=headers,
        json={"slider_values": {}},
    )
    assert clear_resp.status_code == 200
    cleared_entry = clear_resp.json()["entry"]
    assert cleared_entry["slider_values"] == []

    final_values_resp = client.get(f"/api/mood/{entry_id}/slider-values", headers=headers)
    assert final_values_resp.status_code == 200
    assert final_values_resp.json() == []
