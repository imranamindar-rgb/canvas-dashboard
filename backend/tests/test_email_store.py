from datetime import datetime, timezone, timedelta
from email_store import EmailTaskStore
from models import EmailTask


def _make_task(id: str, name: str, hours_until_due: int = 48) -> EmailTask:
    now = datetime.now(timezone.utc)
    return EmailTask(
        id=id,
        name=name,
        due_at=now + timedelta(hours=hours_until_due),
        email_subject="Test Subject",
        email_date=now,
        description="Test description",
        html_url="https://mail.google.com/mail/u/0/#inbox/test",
    )


def test_store_get_all_returns_sorted_tasks():
    store = EmailTaskStore()
    t1 = _make_task("email-a-0", "Task A", hours_until_due=72)
    t2 = _make_task("email-b-0", "Task B", hours_until_due=24)
    store.update([t1, t2])
    result = store.get_all()
    assert len(result) == 2
    assert result[0]["name"] == "Task B"


def test_store_tracks_last_message_id():
    store = EmailTaskStore()
    store.update([_make_task("email-msg123-0", "Task")], last_message_id="msg123")
    assert store.last_message_id == "msg123"


def test_store_skips_if_same_message_id():
    store = EmailTaskStore()
    assert store.should_process("msg123") is True
    store.update([], last_message_id="msg123")
    assert store.should_process("msg123") is False
    assert store.should_process("msg456") is True
