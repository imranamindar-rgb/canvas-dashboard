"""Tests for email task SQLite persistence, deduplication, and source_message_id tracking."""
from datetime import datetime, timezone, timedelta

from email_store import EmailTaskStore, _extract_source_message_id
from models import EmailTask
import db as db_module


def _make_task(task_id: str, name: str, hours_until_due: int = 48) -> EmailTask:
    now = datetime.now(timezone.utc)
    return EmailTask(
        id=task_id,
        name=name,
        due_at=now + timedelta(hours=hours_until_due),
        email_subject="Weekly Announcements",
        email_date=now,
        description="Read the case materials",
        html_url="https://mail.google.com/mail/u/0/#inbox/test",
    )


# ---------------------------------------------------------------------------
# Persistence across store restarts
# ---------------------------------------------------------------------------

class TestPersistence:
    """Email tasks survive EmailTaskStore restart (backed by SQLite)."""

    def test_tasks_survive_store_restart(self):
        store1 = EmailTaskStore()
        tasks = [
            _make_task("email-msg100-0", "Prepare case brief"),
            _make_task("email-msg100-1", "Review slides", hours_until_due=72),
        ]
        store1.update(tasks, last_message_id="msg100")
        assert len(store1.get_all()) == 2

        # Create a brand-new store instance — should reload from DB
        store2 = EmailTaskStore()
        reloaded = store2.get_all()
        assert len(reloaded) == 2
        names = {t["name"] for t in reloaded}
        assert "Prepare case brief" in names
        assert "Review slides" in names

    def test_last_message_id_survives_restart(self):
        store1 = EmailTaskStore()
        store1.update([_make_task("email-msgABC-0", "Task")], last_message_id="msgABC")
        assert store1.last_message_id == "msgABC"

        store2 = EmailTaskStore()
        # _load_last_message_id reads source_message_id from DB
        assert store2.last_message_id == "msgABC"


# ---------------------------------------------------------------------------
# Deduplication (ON CONFLICT … DO UPDATE)
# ---------------------------------------------------------------------------

class TestDeduplication:
    """Updating the same tasks does not create duplicates."""

    def test_upsert_does_not_duplicate(self):
        store = EmailTaskStore()
        task = _make_task("email-dup1-0", "Original name")
        store.update([task])
        assert len(store.get_all()) == 1

        # Update same id with new name
        updated = _make_task("email-dup1-0", "Updated name")
        store.update([updated])
        results = store.get_all()
        assert len(results) == 1
        assert results[0]["name"] == "Updated name"

    def test_multiple_updates_same_set(self):
        store = EmailTaskStore()
        tasks = [
            _make_task("email-set1-0", "Task A"),
            _make_task("email-set1-1", "Task B"),
        ]
        for _ in range(5):
            store.update(tasks)

        assert len(store.get_all()) == 2


# ---------------------------------------------------------------------------
# source_message_id extraction and tracking
# ---------------------------------------------------------------------------

class TestSourceMessageId:
    """source_message_id is correctly extracted and stored."""

    def test_extract_source_message_id_standard(self):
        assert _extract_source_message_id("email-abc123-0") == "abc123"
        assert _extract_source_message_id("email-abc123-5") == "abc123"

    def test_extract_source_message_id_complex_id(self):
        # Gmail message IDs can contain alphanumerics
        assert _extract_source_message_id("email-18f3a2b1c4d-0") == "18f3a2b1c4d"

    def test_extract_source_message_id_invalid(self):
        assert _extract_source_message_id("not-an-email-id") is None
        assert _extract_source_message_id("") is None

    def test_source_message_id_stored_in_db(self):
        store = EmailTaskStore()
        store.update([_make_task("email-gmailXYZ-0", "DB task")], last_message_id="gmailXYZ")

        with db_module.cursor() as cur:
            cur.execute("SELECT source_message_id FROM email_tasks WHERE id = ?",
                        ("email-gmailXYZ-0",))
            row = cur.fetchone()
        assert row is not None
        assert row["source_message_id"] == "gmailXYZ"
