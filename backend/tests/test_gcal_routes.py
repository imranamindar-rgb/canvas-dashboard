import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta

import pytest

from models import Assignment


def _make_assignment(id, name, hours, course="Test", course_id=1):
    return Assignment(
        id=id, name=name, course_name=course, course_id=course_id,
        due_at=datetime.now(timezone.utc) + timedelta(hours=hours),
        points_possible=10,
        html_url=f"https://canvas.mit.edu/courses/{course_id}/assignments/{id}",
        description="<p>Desc</p>", submission_types=["online_upload"], locked=False,
    )


@pytest.fixture
def client():
    with patch.dict("os.environ", {
        "CANVAS_API_URL": "https://canvas.mit.edu",
        "CANVAS_API_TOKEN": "fake_token",
        "CACHE_TTL_SECONDS": "300",
    }):
        with patch("scheduler.AssignmentStore.start_background_sync"):
            with patch("scheduler.AssignmentStore.sync"):
                import importlib
                import app as app_module
                importlib.reload(app_module)
                app_module.app.config["TESTING"] = True
                with app_module.app.test_client() as c:
                    app_module.store.update([
                        _make_assignment(1, "PS1", 48, "6.042", 1),
                    ])
                    yield c


@patch("gcal_client.is_authorized", return_value=False)
def test_gcal_auth_not_authorized(mock_auth, client):
    resp = client.get("/api/gcal/auth")
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert data["authorized"] is False


@patch("app.google_available", True)
@patch("gcal_client.is_authorized", return_value=True)
def test_gcal_auth_authorized(mock_auth, client):
    resp = client.get("/api/gcal/auth")
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert data["authorized"] is True


@patch("app.google_available", True)
@patch("gcal_client.get_auth_url", return_value="https://accounts.google.com/oauth?state=x")
def test_gcal_authorize(mock_get_url, client):
    """POST /api/gcal/authorize now returns {auth_url} for web redirect flow."""
    resp = client.post("/api/gcal/authorize")
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert "auth_url" in data
    assert data["auth_url"].startswith("https://accounts.google.com")
    mock_get_url.assert_called_once()


@patch("app.google_available", True)
@patch("gcal_client.sync_to_calendar", return_value={"synced": 1})
def test_gcal_sync(mock_sync, client):
    resp = client.post("/api/gcal/sync")
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert data["synced"] == 1
    mock_sync.assert_called_once()
