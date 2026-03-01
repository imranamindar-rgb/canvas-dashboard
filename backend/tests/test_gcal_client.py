import os
from unittest.mock import patch, MagicMock, mock_open
from datetime import datetime, timezone, timedelta

import pytest

from gcal_client import (
    SCOPES,
    CREDENTIALS_FILE,
    TOKEN_FILE,
    URGENCY_COLORS,
    is_authorized,
    authorize,
    build_event,
    sync_to_calendar,
)
from models import Assignment


def _make_assignment(id, name, hours, course="Test", course_id=1):
    return Assignment(
        id=id, name=name, course_name=course, course_id=course_id,
        due_at=datetime.now(timezone.utc) + timedelta(hours=hours),
        points_possible=10,
        html_url=f"https://canvas.mit.edu/courses/{course_id}/assignments/{id}",
        description="<p>Desc</p>", submission_types=["online_upload"], locked=False,
    )


def test_scopes_include_calendar_events():
    assert "https://www.googleapis.com/auth/calendar.events" in SCOPES


def test_urgency_colors_all_defined():
    for urgency in ("critical", "high", "medium", "runway"):
        assert urgency in URGENCY_COLORS


def test_is_authorized_no_token_file():
    with patch("os.path.exists", return_value=False):
        assert is_authorized() is False


def test_is_authorized_valid_token():
    mock_creds = MagicMock()
    mock_creds.valid = True
    with patch("os.path.exists", return_value=True):
        with patch("gcal_client.Credentials.from_authorized_user_file", return_value=mock_creds):
            assert is_authorized() is True


def test_is_authorized_expired_but_refreshable():
    mock_creds = MagicMock()
    mock_creds.valid = False
    mock_creds.expired = True
    mock_creds.refresh_token = "refresh_tok"
    mock_creds.to_json.return_value = '{"token": "refreshed"}'
    with patch("os.path.exists", return_value=True):
        with patch("gcal_client.Credentials.from_authorized_user_file", return_value=mock_creds):
            with patch.object(mock_creds, "refresh"):
                with patch("builtins.open", mock_open()):
                    assert is_authorized() is True
                    mock_creds.refresh.assert_called_once()


def test_build_event_structure():
    a = _make_assignment(42, "Problem Set 3", 48, "6.042", 100)
    event = build_event(a.to_dict())

    assert event["summary"] == "[6.042] Problem Set 3"
    assert "canvas.mit.edu" in event["description"]
    assert "10" in event["description"]
    assert event["colorId"] == URGENCY_COLORS["high"]
    assert event["extendedProperties"]["private"]["canvas_assignment_id"] == "42"
    assert event["reminders"]["useDefault"] is False
    assert len(event["reminders"]["overrides"]) == 2


def test_build_event_no_points():
    a = Assignment(
        id=1, name="Survey", course_name="Test", course_id=1,
        due_at=datetime.now(timezone.utc) + timedelta(days=3),
        points_possible=None,
        html_url="https://canvas.mit.edu/courses/1/assignments/1",
        description="", submission_types=[], locked=False,
    )
    event = build_event(a.to_dict())
    assert "Points" not in event["description"]


def _setup_batch_mock(mock_service):
    """Create a mock batch that simulates calling the callback on execute."""
    mock_batch = MagicMock()

    def fake_execute():
        callback = mock_service.new_batch_http_request.call_args
        cb = callback[1].get("callback") if callback[1] else None
        if cb:
            for i in range(mock_batch.add.call_count):
                cb(str(i), {}, None)

    mock_batch.execute.side_effect = fake_execute
    mock_service.new_batch_http_request.return_value = mock_batch
    return mock_batch


@patch("gcal_client.build")
@patch("gcal_client.is_authorized", return_value=True)
@patch("gcal_client.Credentials.from_authorized_user_file")
def test_sync_creates_new_events(mock_creds_load, mock_auth, mock_build):
    mock_creds = MagicMock()
    mock_creds.valid = True
    mock_creds.expired = False
    mock_creds_load.return_value = mock_creds

    mock_service = MagicMock()
    mock_build.return_value = mock_service

    # No existing events
    mock_service.events().list().execute.return_value = {"items": []}

    mock_batch = _setup_batch_mock(mock_service)

    assignments = [_make_assignment(1, "PS1", 48).to_dict()]
    result = sync_to_calendar(assignments)

    assert result["synced"] == 1
    mock_batch.add.assert_called_once()
    mock_batch.execute.assert_called_once()


@patch("gcal_client.build")
@patch("gcal_client.is_authorized", return_value=True)
@patch("gcal_client.Credentials.from_authorized_user_file")
def test_sync_updates_existing_events(mock_creds_load, mock_auth, mock_build):
    mock_creds = MagicMock()
    mock_creds.valid = True
    mock_creds.expired = False
    mock_creds_load.return_value = mock_creds

    mock_service = MagicMock()
    mock_build.return_value = mock_service

    # Existing event for assignment 1
    mock_service.events().list().execute.return_value = {
        "items": [{"id": "evt_1", "extendedProperties": {"private": {"canvas_assignment_id": "1"}}}]
    }

    mock_batch = _setup_batch_mock(mock_service)

    assignments = [_make_assignment(1, "PS1", 48).to_dict()]
    result = sync_to_calendar(assignments)

    assert result["synced"] == 1
    mock_batch.add.assert_called_once()
    mock_batch.execute.assert_called_once()


@patch("gcal_client.build")
@patch("gcal_client.is_authorized", return_value=True)
@patch("gcal_client.Credentials.from_authorized_user_file")
def test_sync_uses_batch_api(mock_creds_load, mock_auth, mock_build):
    """Test that sync with multiple assignments uses batch API correctly."""
    mock_creds = MagicMock()
    mock_creds.valid = True
    mock_creds.expired = False
    mock_creds_load.return_value = mock_creds

    mock_service = MagicMock()
    mock_build.return_value = mock_service

    # One existing event (assignment 2), two new ones (1 and 3)
    mock_service.events().list().execute.return_value = {
        "items": [{"id": "evt_2", "extendedProperties": {"private": {"canvas_assignment_id": "2"}}}]
    }

    mock_batch = _setup_batch_mock(mock_service)

    assignments = [
        _make_assignment(1, "PS1", 24).to_dict(),
        _make_assignment(2, "PS2", 48).to_dict(),
        _make_assignment(3, "PS3", 72).to_dict(),
    ]
    result = sync_to_calendar(assignments)

    assert result["synced"] == 3
    assert mock_batch.add.call_count == 3
    mock_batch.execute.assert_called_once()
    mock_service.new_batch_http_request.assert_called_once()
