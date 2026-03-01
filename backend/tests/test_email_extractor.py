from unittest.mock import patch, MagicMock
from email_extractor import extract_tasks


@patch("email_extractor.anthropic.Anthropic")
def test_extract_tasks_returns_structured_data(mock_anthropic_cls):
    mock_client = MagicMock()
    mock_anthropic_cls.return_value = mock_client
    mock_client.messages.create.return_value.content = [
        MagicMock(text='[{"name": "Complete weekend survey", "deadline": "2026-02-25T17:00:00+00:00", "description": "Take the weekend survey by Wednesday"}]')
    ]

    email_data = {
        "message_id": "msg123",
        "subject": "EMBA '27 | ANNOUNCEMENTS | February 24, 2026",
        "date": "2026-02-24T22:00:00+00:00",
        "body": "<html><body>Please complete the survey by Wednesday</body></html>",
    }

    tasks = extract_tasks(email_data, api_key="test-key")
    assert len(tasks) == 1
    assert tasks[0].name == "Complete weekend survey"
    assert tasks[0].id == "email-msg123-0"
    assert tasks[0].email_subject == email_data["subject"]


@patch("email_extractor.anthropic.Anthropic")
def test_extract_tasks_returns_empty_on_api_error(mock_anthropic_cls):
    mock_client = MagicMock()
    mock_anthropic_cls.return_value = mock_client
    mock_client.messages.create.side_effect = Exception("API error")

    email_data = {
        "message_id": "msg789",
        "subject": "Test",
        "date": "2026-02-24T22:00:00+00:00",
        "body": "<html>Test</html>",
    }

    tasks = extract_tasks(email_data, api_key="test-key")
    assert tasks == []
