from api.database import MoodDatabase
from api.services.user_service import UserService

TEST_DB = "/tmp/nightlio_test_user_upsert.db"


def test_handle_oauth_login_idempotent():
    db = MoodDatabase(TEST_DB)
    user_service = UserService(db)

    provider = "google"
    sub = "test-google-sub-123"
    email = "user@example.com"
    name = "Test User"
    avatar = "https://example.com/a.png"

    u1 = user_service.handle_oauth_login(provider, sub, email, name, avatar)
    u2 = user_service.handle_oauth_login(provider, sub, email, name, avatar)

    assert u1["id"] == u2["id"]
    assert u2["email"] == email
    assert u2["name"] == name
