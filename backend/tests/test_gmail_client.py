from unittest.mock import patch, MagicMock
from gmail_client import fetch_latest_announcements


@patch("gmail_client._get_gmail_service")
def test_fetch_returns_email_data(mock_service_fn):
    mock_service = MagicMock()
    mock_service_fn.return_value = mock_service

    mock_service.users().messages().list.return_value.execute.return_value = {
        "messages": [{"id": "msg123"}]
    }

    mock_service.users().messages().get.return_value.execute.return_value = {
        "id": "msg123",
        "payload": {
            "headers": [
                {"name": "Subject", "value": "EMBA '27 | ANNOUNCEMENTS | Feb 24"},
                {"name": "Date", "value": "Tue, 24 Feb 2026 22:00:00 +0000"},
            ],
            "body": {"data": "PGh0bWw+SGVsbG88L2h0bWw-"},
        },
    }

    result = fetch_latest_announcements()
    assert result is not None
    assert result["message_id"] == "msg123"
    assert "ANNOUNCEMENTS" in result["subject"]


@patch("gmail_client._get_gmail_service")
def test_fetch_returns_none_when_no_emails(mock_service_fn):
    mock_service = MagicMock()
    mock_service_fn.return_value = mock_service
    mock_service.users().messages().list.return_value.execute.return_value = {}

    result = fetch_latest_announcements()
    assert result is None
