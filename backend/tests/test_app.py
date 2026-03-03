import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta

import pytest

from models import Assignment


def _make_assignment(id, name, hours_until_due, course_name="Test", course_id=1):
    return Assignment(
        id=id, name=name, course_name=course_name, course_id=course_id,
        due_at=datetime.now(timezone.utc) + timedelta(hours=hours_until_due),
        points_possible=10, html_url=f"https://canvas.mit.edu/courses/{course_id}/assignments/{id}",
        description="<p>Desc</p>", submission_types=["online_upload"], locked=False,
    )


@pytest.fixture
def client():
    # Patch environment before importing app
    with patch.dict("os.environ", {
        "CANVAS_API_URL": "https://canvas.mit.edu",
        "CANVAS_API_TOKEN": "fake_token",
        "CACHE_TTL_SECONDS": "300",
    }):
        # Patch the store's background sync so it doesn't actually run
        with patch("scheduler.AssignmentStore.start_background_sync"):
            with patch("scheduler.AssignmentStore.sync"):
                import importlib
                import app as app_module
                importlib.reload(app_module)
                app_module.app.config["TESTING"] = True
                with app_module.app.test_client() as c:
                    # Seed some assignments
                    app_module.store.update([
                        _make_assignment(1, "PS1", 6, "6.042", 1),
                        _make_assignment(2, "HW1", 48, "18.06", 2),
                        _make_assignment(3, "Lab", 200, "6.042", 1),
                    ])
                    yield c


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert data["status"] == "ok"
    assert data["assignment_count"] == 3


def test_assignments_unfiltered(client):
    resp = client.get("/api/assignments")
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert len(data) == 3


def test_assignments_filter_urgency(client):
    resp = client.get("/api/assignments?urgency=critical")
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert len(data) == 1
    assert data[0]["name"] == "PS1"


def test_assignments_filter_course(client):
    resp = client.get("/api/assignments?course=6.042")
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert len(data) == 2


def test_stats(client):
    resp = client.get("/api/stats")
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert data["total"] == 3
    assert data["by_urgency"]["critical"] == 1
    assert data["by_course"]["6.042"] == 2
    assert "due_today" in data
    assert "due_this_week" in data


def test_email_status_route(client):
    res = client.get("/api/email/status")
    assert res.status_code == 200
    data = res.get_json()
    # When google_available=False (no credentials in test env), response
    # has connected/available keys; last_sync is present in both code paths.
    assert "last_sync" in data

def test_email_tasks_route(client):
    res = client.get("/api/email/tasks")
    assert res.status_code == 200
    data = res.get_json()
    assert isinstance(data, list)


def test_app_binds_to_localhost():
    with open("app.py") as f:
        source = f.read()
    assert '0.0.0.0' not in source
    assert '127.0.0.1' in source


def test_refresh_returns_error_on_failure(client, monkeypatch):
    """Verify /api/refresh returns structured error, not raw traceback."""
    import app as app_module
    monkeypatch.setattr(app_module.store, "sync", lambda: (_ for _ in ()).throw(RuntimeError("Canvas down")))
    resp = client.post("/api/refresh")
    assert resp.status_code == 500
    data = resp.get_json()
    assert "error" in data
    # Should NOT contain raw exception text
    assert "Canvas down" not in data["error"]


def test_email_sync_error_does_not_leak(client, monkeypatch):
    """Verify /api/email/sync errors don't expose internal details."""
    import app as app_module
    monkeypatch.setattr(app_module, "google_available", True)
    monkeypatch.setattr(app_module, "anthropic_key", "fake-key")
    monkeypatch.setattr(app_module, "fetch_latest_announcements",
                        lambda: {"message_id": "test", "subject": "test", "date": None, "body": "test"})
    monkeypatch.setattr(app_module.email_store, "should_process", lambda mid: True)
    monkeypatch.setattr(app_module, "extract_email_tasks",
                        lambda data, api_key: (_ for _ in ()).throw(RuntimeError("API key invalid")))
    resp = client.post("/api/email/sync")
    assert resp.status_code == 500
    data = resp.get_json()
    assert "API key invalid" not in data.get("error", "")
