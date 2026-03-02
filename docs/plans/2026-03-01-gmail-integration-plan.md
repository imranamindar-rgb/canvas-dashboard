# Gmail Email Task Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Gmail to fetch EMBA announcement emails, extract action items using Claude API, and display them alongside Canvas assignments grouped by source.

**Architecture:** Extend existing Google OAuth to include Gmail readonly scope. New `gmail_client.py` fetches emails, `email_extractor.py` uses Claude API to extract structured tasks, `email_store.py` stores them in-memory. Frontend adds `useEmail` hook (following `useCalendar` pattern), `EmailBar` component, and source-based grouping.

**Tech Stack:** Flask, Gmail API, Anthropic Claude API, React 18, TypeScript, Tailwind CSS

---

## Context

The EMBA program sends weekly announcement emails every Tuesday with embedded action items (surveys, RSVPs, registrations). These aren't in Canvas and are easy to miss. This feature fetches those emails via Gmail API, uses Claude to extract action items with deadlines, and shows them in the dashboard alongside Canvas assignments — grouped by source so the user knows where each task came from.

---

## Task 1: Add `anthropic` dependency and update .env

**Files:**
- Modify: `canvas-dashboard/backend/requirements.txt`
- Modify: `canvas-dashboard/backend/.env.example`
- Modify: `canvas-dashboard/backend/.env`

**Step 1: Add anthropic to requirements.txt**

Add `anthropic==0.49.0` to the end of `requirements.txt`.

**Step 2: Update .env.example**

Add `ANTHROPIC_API_KEY=your_anthropic_key_here` after `CACHE_TTL_SECONDS`.

**Step 3: Add actual key to .env**

Add `ANTHROPIC_API_KEY=sk-ant-api03-...` (user's actual key) to `.env`.

**Step 4: Install the dependency**

Run: `cd canvas-dashboard/backend && .venv/bin/pip install anthropic==0.49.0`

**Step 5: Commit**
```bash
git add backend/requirements.txt backend/.env.example
git commit -m "chore: add anthropic dependency for email task extraction"
```

---

## Task 2: Create EmailTask data model

**Files:**
- Modify: `canvas-dashboard/backend/models.py`
- Modify: `canvas-dashboard/backend/tests/test_models.py`

**Step 1: Write the failing test**

In `tests/test_models.py`, add:
```python
from models import EmailTask

def test_email_task_to_dict():
    task = EmailTask(
        id="email-abc123-0",
        name="Complete weekend survey",
        due_at=datetime(2026, 2, 25, 17, 0, tzinfo=timezone.utc),
        email_subject="EMBA '27 | ANNOUNCEMENTS | February 24, 2026",
        email_date=datetime(2026, 2, 24, 22, 0, tzinfo=timezone.utc),
        description="Please take a few minutes to complete the weekend survey",
        html_url="https://mail.google.com/mail/u/0/#inbox/abc123",
    )
    d = task.to_dict()
    assert d["id"] == "email-abc123-0"
    assert d["name"] == "Complete weekend survey"
    assert d["source"] == "email"
    assert d["urgency"] in ("critical", "high", "medium", "runway")
    assert d["course_name"] == "EMBA Announcements"
    assert d["submitted"] is False

def test_email_task_urgency_classification():
    now = datetime.now(timezone.utc)
    task = EmailTask(
        id="email-x-0",
        name="Task",
        due_at=now + timedelta(hours=6),
        email_subject="Test",
        email_date=now,
        description="",
        html_url="",
    )
    assert task.to_dict()["urgency"] == "critical"
```

**Step 2: Run test to verify it fails**

Run: `cd canvas-dashboard/backend && .venv/bin/python -m pytest tests/test_models.py::test_email_task_to_dict -v`
Expected: FAIL — ImportError: cannot import name 'EmailTask'

**Step 3: Write minimal implementation**

In `models.py`, after the Assignment class (after line 48), add:

```python
@dataclass
class EmailTask:
    id: str
    name: str
    due_at: datetime
    email_subject: str
    email_date: datetime
    description: str
    html_url: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "course_name": "EMBA Announcements",
            "course_id": 0,
            "due_at": self.due_at.isoformat(),
            "points_possible": None,
            "urgency": classify_urgency(self.due_at),
            "html_url": self.html_url,
            "description": self.description,
            "submission_types": [],
            "locked": False,
            "submitted": False,
            "source": "email",
            "email_subject": self.email_subject,
            "email_date": self.email_date.isoformat(),
        }
```

**Step 4: Run tests**

Run: `.venv/bin/python -m pytest tests/test_models.py -v`
Expected: All pass

**Step 5: Add `source` field to Assignment.to_dict()**

In `models.py`, in `Assignment.to_dict()` (around line 48), add `"source": "canvas",` to the returned dict.

**Step 6: Update existing assignment tests**

In `tests/test_models.py`, find any test that asserts on the dict keys and add `assert d["source"] == "canvas"`.

**Step 7: Run all tests**

Run: `.venv/bin/python -m pytest tests/ -v`

**Step 8: Commit**
```bash
git add backend/models.py backend/tests/test_models.py
git commit -m "feat: add EmailTask data model and source field to Assignment"
```

---

## Task 3: Extend OAuth to include Gmail scope

**Files:**
- Modify: `canvas-dashboard/backend/gcal_client.py:13`
- Modify: `canvas-dashboard/backend/tests/test_gcal_client.py`

**Step 1: Write the failing test**

In `tests/test_gcal_client.py`, update or add:
```python
def test_scopes_include_gmail_readonly():
    from gcal_client import SCOPES
    assert "https://www.googleapis.com/auth/gmail.readonly" in SCOPES
```

**Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_gcal_client.py::test_scopes_include_gmail_readonly -v`
Expected: FAIL

**Step 3: Update SCOPES**

In `gcal_client.py` line 13, change:
```python
SCOPES = ["https://www.googleapis.com/auth/calendar.events"]
```
To:
```python
SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/gmail.readonly",
]
```

**Step 4: Run all tests**

Run: `.venv/bin/python -m pytest tests/ -v`

**Step 5: Delete token.json to force re-authorization**

The user will need to re-authorize to get the new Gmail scope. Note: existing token.json only has calendar scope and will NOT work for Gmail. Delete it so the next authorize() call requests both scopes.

Run: `rm -f canvas-dashboard/backend/token.json`

**Step 6: Commit**
```bash
git add backend/gcal_client.py backend/tests/test_gcal_client.py
git commit -m "feat: add Gmail readonly scope to Google OAuth"
```

---

## Task 4: Create Gmail client

**Files:**
- Create: `canvas-dashboard/backend/gmail_client.py`
- Create: `canvas-dashboard/backend/tests/test_gmail_client.py`

**Step 1: Write the failing tests**

Create `tests/test_gmail_client.py`:
```python
from unittest.mock import patch, MagicMock
from gmail_client import fetch_latest_announcements


@patch("gmail_client._get_gmail_service")
def test_fetch_returns_email_data(mock_service_fn):
    mock_service = MagicMock()
    mock_service_fn.return_value = mock_service

    # Mock messages.list
    mock_service.users().messages().list.return_value.execute.return_value = {
        "messages": [{"id": "msg123"}]
    }

    # Mock messages.get (full message)
    mock_service.users().messages().get.return_value.execute.return_value = {
        "id": "msg123",
        "payload": {
            "headers": [
                {"name": "Subject", "value": "EMBA '27 | ANNOUNCEMENTS | Feb 24"},
                {"name": "Date", "value": "Tue, 24 Feb 2026 22:00:00 +0000"},
            ],
            "body": {"data": "PGh0bWw+SGVsbG88L2h0bWw+"},  # base64 of "<html>Hello</html>"
        },
    }

    result = fetch_latest_announcements()
    assert result is not None
    assert result["message_id"] == "msg123"
    assert "ANNOUNCEMENTS" in result["subject"]
    assert "<html>" in result["body"]


@patch("gmail_client._get_gmail_service")
def test_fetch_returns_none_when_no_emails(mock_service_fn):
    mock_service = MagicMock()
    mock_service_fn.return_value = mock_service
    mock_service.users().messages().list.return_value.execute.return_value = {}

    result = fetch_latest_announcements()
    assert result is None
```

**Step 2: Run to verify failure**

Run: `.venv/bin/python -m pytest tests/test_gmail_client.py -v`
Expected: FAIL — ModuleNotFoundError

**Step 3: Create gmail_client.py**

```python
"""Gmail client for fetching EMBA announcement emails."""

import base64
import os
from email.utils import parsedate_to_datetime

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

TOKEN_FILE = os.path.join(os.path.dirname(__file__), "token.json")
SEARCH_QUERY = 'from:"MIT Executive MBA Program" subject:ANNOUNCEMENTS'


def _get_gmail_service():
    """Build authenticated Gmail API service."""
    from googleapiclient.discovery import build

    creds = Credentials.from_authorized_user_file(TOKEN_FILE)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return build("gmail", "v1", credentials=creds)


def fetch_latest_announcements() -> dict | None:
    """Fetch the most recent EMBA announcement email.

    Returns dict with keys: message_id, subject, date, body (HTML string)
    or None if no matching emails found.
    """
    service = _get_gmail_service()
    results = (
        service.users()
        .messages()
        .list(userId="me", q=SEARCH_QUERY, maxResults=1)
        .execute()
    )
    messages = results.get("messages", [])
    if not messages:
        return None

    msg = (
        service.users()
        .messages()
        .get(userId="me", id=messages[0]["id"], format="full")
        .execute()
    )

    headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
    subject = headers.get("Subject", "")
    date_str = headers.get("Date", "")

    # Decode body
    body_data = _extract_body(msg["payload"])
    body = base64.urlsafe_b64decode(body_data).decode("utf-8") if body_data else ""

    date = None
    if date_str:
        try:
            date = parsedate_to_datetime(date_str)
        except Exception:
            date = None

    return {
        "message_id": msg["id"],
        "subject": subject,
        "date": date.isoformat() if date else None,
        "body": body,
    }


def _extract_body(payload: dict) -> str | None:
    """Recursively extract HTML body from Gmail message payload."""
    if payload.get("mimeType") == "text/html":
        return payload.get("body", {}).get("data")
    for part in payload.get("parts", []):
        result = _extract_body(part)
        if result:
            return result
    # Fallback to top-level body
    return payload.get("body", {}).get("data")
```

**Step 4: Run tests**

Run: `.venv/bin/python -m pytest tests/test_gmail_client.py -v`
Expected: All pass

**Step 5: Commit**
```bash
git add backend/gmail_client.py backend/tests/test_gmail_client.py
git commit -m "feat: add Gmail client for fetching EMBA announcements"
```

---

## Task 5: Create email extractor (Claude API)

**Files:**
- Create: `canvas-dashboard/backend/email_extractor.py`
- Create: `canvas-dashboard/backend/tests/test_email_extractor.py`

**Step 1: Write the failing test**

Create `tests/test_email_extractor.py`:
```python
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone
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
def test_extract_tasks_handles_no_deadline(mock_anthropic_cls):
    mock_client = MagicMock()
    mock_anthropic_cls.return_value = mock_client
    mock_client.messages.create.return_value.content = [
        MagicMock(text='[{"name": "Register for event", "deadline": null, "description": "Click to register"}]')
    ]

    email_data = {
        "message_id": "msg456",
        "subject": "EMBA Announcements",
        "date": "2026-02-24T22:00:00+00:00",
        "body": "<html>Register for event</html>",
    }

    tasks = extract_tasks(email_data, api_key="test-key")
    assert len(tasks) == 1
    # Should default to email_date + 7 days when no deadline
    assert tasks[0].due_at.day == 3  # Feb 24 + 7 = Mar 3


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
```

**Step 2: Run to verify failure**

Run: `.venv/bin/python -m pytest tests/test_email_extractor.py -v`
Expected: FAIL — ModuleNotFoundError

**Step 3: Create email_extractor.py**

```python
"""Extract action items from EMBA announcement emails using Claude API."""

import json
import logging
from datetime import datetime, timedelta, timezone

import anthropic

from models import EmailTask

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """You are extracting action items from an MIT Executive MBA program announcement email.

Identify ONLY items that require the student to take action (submit surveys, RSVP, register for events, complete assignments, etc.). Do NOT include informational items or events that are just FYI.

For each action item, extract:
- name: short action description (e.g., "Complete weekend survey", "RSVP for Bring Your Boss Day")
- deadline: ISO 8601 datetime string if a deadline is mentioned, or null if no specific deadline
- description: one sentence of context from the email

Return a JSON array. If no action items found, return [].

Example output:
[{"name": "Complete weekend survey", "deadline": "2026-02-25T12:00:00-06:00", "description": "Please take a few minutes to complete the weekend survey by Wednesday, February 25, at 12:00 p.m."}]

Email content:
"""


def extract_tasks(email_data: dict, api_key: str) -> list[EmailTask]:
    """Extract action items from email using Claude API.

    Args:
        email_data: dict with keys message_id, subject, date, body
        api_key: Anthropic API key

    Returns:
        List of EmailTask objects, empty list on failure
    """
    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": EXTRACTION_PROMPT + email_data["body"],
                }
            ],
        )

        raw = response.content[0].text
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
        items = json.loads(raw)
    except Exception:
        logger.exception("Failed to extract tasks from email")
        return []

    email_date = datetime.fromisoformat(email_data["date"])
    tasks = []
    for i, item in enumerate(items):
        deadline = item.get("deadline")
        if deadline:
            try:
                due_at = datetime.fromisoformat(deadline)
                if due_at.tzinfo is None:
                    due_at = due_at.replace(tzinfo=timezone.utc)
            except (ValueError, TypeError):
                due_at = email_date + timedelta(days=7)
        else:
            due_at = email_date + timedelta(days=7)

        tasks.append(
            EmailTask(
                id=f"email-{email_data['message_id']}-{i}",
                name=item.get("name", "Unknown task"),
                due_at=due_at,
                email_subject=email_data["subject"],
                email_date=email_date,
                description=item.get("description", ""),
                html_url=f"https://mail.google.com/mail/u/0/#inbox/{email_data['message_id']}",
            )
        )

    return tasks
```

**Step 4: Run tests**

Run: `.venv/bin/python -m pytest tests/test_email_extractor.py -v`
Expected: All pass

**Step 5: Commit**
```bash
git add backend/email_extractor.py backend/tests/test_email_extractor.py
git commit -m "feat: add Claude-powered email task extraction"
```

---

## Task 6: Create email task store

**Files:**
- Create: `canvas-dashboard/backend/email_store.py`
- Create: `canvas-dashboard/backend/tests/test_email_store.py`

**Step 1: Write the failing test**

Create `tests/test_email_store.py`:
```python
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
    assert result[0]["name"] == "Task B"  # Earlier due date first


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
```

**Step 2: Run to verify failure**

Run: `.venv/bin/python -m pytest tests/test_email_store.py -v`
Expected: FAIL — ModuleNotFoundError

**Step 3: Create email_store.py**

```python
"""In-memory store for email-extracted tasks."""

import threading
from datetime import datetime, timezone

from models import EmailTask


class EmailTaskStore:
    def __init__(self) -> None:
        self._tasks: list[EmailTask] = []
        self._last_sync: datetime | None = None
        self._last_message_id: str | None = None
        self._error: str | None = None
        self._lock = threading.Lock()

    def update(self, tasks: list[EmailTask], last_message_id: str | None = None) -> None:
        with self._lock:
            self._tasks = tasks
            self._last_sync = datetime.now(timezone.utc)
            self._last_message_id = last_message_id or self._last_message_id
            self._error = None

    def get_all(self) -> list[dict]:
        with self._lock:
            items = list(self._tasks)
        items.sort(key=lambda t: t.due_at)
        return [t.to_dict() for t in items]

    def should_process(self, message_id: str) -> bool:
        return self._last_message_id != message_id

    @property
    def last_message_id(self) -> str | None:
        return self._last_message_id

    @property
    def last_sync(self) -> datetime | None:
        return self._last_sync

    @property
    def error(self) -> str | None:
        return self._error

    @error.setter
    def error(self, value: str | None) -> None:
        self._error = value
```

**Step 4: Run tests**

Run: `.venv/bin/python -m pytest tests/test_email_store.py -v`
Expected: All pass

**Step 5: Commit**
```bash
git add backend/email_store.py backend/tests/test_email_store.py
git commit -m "feat: add EmailTaskStore for in-memory email task storage"
```

---

## Task 7: Add Flask routes for email tasks

**Files:**
- Modify: `canvas-dashboard/backend/app.py`
- Modify: `canvas-dashboard/backend/tests/test_app.py`

**Step 1: Write the failing tests**

In `tests/test_app.py`, add:
```python
def test_email_status_route(client):
    res = client.get("/api/email/status")
    assert res.status_code == 200
    data = res.get_json()
    assert "authorized" in data
    assert "last_sync" in data


def test_email_tasks_route(client):
    res = client.get("/api/email/tasks")
    assert res.status_code == 200
    data = res.get_json()
    assert isinstance(data, list)
```

**Step 2: Run to verify failure**

Run: `.venv/bin/python -m pytest tests/test_app.py::test_email_status_route -v`
Expected: FAIL — 404

**Step 3: Add routes to app.py**

After the existing gcal routes (around line 72), add:

```python
from email_store import EmailTaskStore
from gmail_client import fetch_latest_announcements
from email_extractor import extract_tasks as extract_email_tasks

email_store = EmailTaskStore()
anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")


@app.route("/api/email/status")
def email_status():
    return jsonify({
        "authorized": gcal_client.is_authorized(),
        "last_sync": email_store.last_sync.isoformat() if email_store.last_sync else None,
        "task_count": len(email_store.get_all()),
        "error": email_store.error,
    })


@app.route("/api/email/tasks")
def email_tasks():
    return jsonify(email_store.get_all())


@app.route("/api/email/sync", methods=["POST"])
def email_sync():
    if not anthropic_key:
        return jsonify({"error": "ANTHROPIC_API_KEY not configured"}), 400
    try:
        email_data = fetch_latest_announcements()
        if email_data is None:
            return jsonify({"synced": 0, "message": "No announcement emails found"})

        if not email_store.should_process(email_data["message_id"]):
            return jsonify({
                "synced": len(email_store.get_all()),
                "message": "Already processed latest email",
            })

        tasks = extract_email_tasks(email_data, api_key=anthropic_key)
        email_store.update(tasks, last_message_id=email_data["message_id"])
        return jsonify({"synced": len(tasks), "message": f"Extracted {len(tasks)} tasks"})
    except Exception as e:
        email_store.error = str(e)
        return jsonify({"error": str(e)}), 500
```

Also add `import os` at the top if not already present (it is — line 1).

**Step 4: Run tests**

Run: `.venv/bin/python -m pytest tests/test_app.py -v`
Expected: All pass

**Step 5: Commit**
```bash
git add backend/app.py backend/tests/test_app.py
git commit -m "feat: add Flask routes for email task sync and retrieval"
```

---

## Task 8: Frontend — Add EmailTask type and source field

**Files:**
- Modify: `canvas-dashboard/frontend/src/types.ts`

**Step 1: Add `source` to Assignment interface**

In `types.ts`, after `submitted: boolean;` (line 15), add:
```typescript
  source: "canvas" | "email";
```

**Step 2: Add optional email fields**

After `source`, add:
```typescript
  email_subject?: string;
  email_date?: string;
```

**Step 3: Run `npm run build`**

Run: `cd canvas-dashboard/frontend && npm run build`
Expected: Clean build (source field is now expected but backend sends it)

**Step 4: Commit**
```bash
git add frontend/src/types.ts
git commit -m "feat: add source and email fields to Assignment type"
```

---

## Task 9: Frontend — Create useEmail hook

**Files:**
- Create: `canvas-dashboard/frontend/src/hooks/useEmail.ts`

**Step 1: Create the hook** (following useCalendar.ts pattern)

```typescript
import { useState, useEffect, useCallback } from "react";
import type { Assignment } from "../types";

interface EmailState {
  authorized: boolean;
  loading: boolean;
  syncing: boolean;
  lastSync: string | null;
  taskCount: number;
  error: string | null;
  lastResult: string | null;
  tasks: Assignment[];
}

export function useEmail() {
  const [state, setState] = useState<EmailState>({
    authorized: false,
    loading: true,
    syncing: false,
    lastSync: null,
    taskCount: 0,
    error: null,
    lastResult: null,
    tasks: [],
  });

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/email/status");
      const data = await res.json();
      setState((s) => ({
        ...s,
        authorized: data.authorized,
        lastSync: data.last_sync,
        taskCount: data.task_count,
        error: data.error,
        loading: false,
      }));
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/email/tasks");
      const data: Assignment[] = await res.json();
      setState((s) => ({ ...s, tasks: data }));
    } catch {
      // tasks will remain stale
    }
  }, []);

  const syncEmail = useCallback(async () => {
    setState((s) => ({ ...s, syncing: true, error: null, lastResult: null }));
    try {
      const res = await fetch("/api/email/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setState((s) => ({ ...s, error: data.error, syncing: false }));
      } else {
        setState((s) => ({
          ...s,
          lastResult: data.message,
          syncing: false,
        }));
        await fetchTasks();
        await checkStatus();
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        error: "Failed to sync email tasks",
        syncing: false,
      }));
    }
  }, [fetchTasks, checkStatus]);

  useEffect(() => {
    checkStatus();
    fetchTasks();
  }, [checkStatus, fetchTasks]);

  return {
    ...state,
    syncEmail,
  };
}
```

**Step 2: Run `npm run build`**

Expected: Clean build

**Step 3: Commit**
```bash
git add frontend/src/hooks/useEmail.ts
git commit -m "feat: add useEmail hook for Gmail task integration"
```

---

## Task 10: Frontend — Create EmailBar component

**Files:**
- Create: `canvas-dashboard/frontend/src/components/EmailBar.tsx`

**Step 1: Create the component** (following CalendarBar.tsx pattern)

```typescript
interface Props {
  authorized: boolean;
  loading: boolean;
  syncing: boolean;
  lastResult: string | null;
  error: string | null;
  onSync: () => void;
}

export function EmailBar({
  authorized,
  loading,
  syncing,
  lastResult,
  error,
  onSync,
}: Props) {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            authorized ? "bg-green-500" : "bg-gray-300"
          }`}
        />
        <span className="text-sm text-gray-600">
          Email Tasks: {authorized ? "Ready" : "Authorize Google first"}
        </span>
      </div>

      {authorized && (
        <button
          onClick={onSync}
          disabled={syncing || loading}
          className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
        >
          {syncing ? "Extracting..." : "Sync Email Tasks"}
        </button>
      )}

      {lastResult && (
        <span className="text-sm text-green-600">{lastResult}</span>
      )}

      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
```

**Step 2: Run `npm run build`**

Expected: Clean build

**Step 3: Commit**
```bash
git add frontend/src/components/EmailBar.tsx
git commit -m "feat: add EmailBar component for Gmail sync status"
```

---

## Task 11: Frontend — Add source grouping to AssignmentTable

**Files:**
- Modify: `canvas-dashboard/frontend/src/components/AssignmentTable.tsx`

**Step 1: Add grouping by source function**

After the existing `groupAssignmentsByCourse` function, add:

```typescript
function groupBySource(assignments: Assignment[]) {
  const canvas = assignments.filter((a) => a.source !== "email");
  const email = assignments.filter((a) => a.source === "email");
  const groups: { label: string; icon: string; items: Assignment[] }[] = [];
  if (canvas.length > 0) groups.push({ label: "Canvas", icon: "canvas", items: canvas });
  if (email.length > 0) groups.push({ label: "Email", icon: "email", items: email });
  return groups;
}
```

**Step 2: Update Props interface**

Add `groupBySource: boolean` to the Props interface.

**Step 3: Update rendering logic**

In `renderDesktopRows()` and `renderMobileCards()`, add a third grouping path:
- If `groupBySource` is true, use source grouping (with source header icons)
- The source header row should use a purple background for Email group and blue for Canvas

**Step 4: Run `npm run build`**

Expected: Clean build

**Step 5: Commit**
```bash
git add frontend/src/components/AssignmentTable.tsx
git commit -m "feat: add source-based grouping to AssignmentTable"
```

---

## Task 12: Frontend — Wire everything in App.tsx

**Files:**
- Modify: `canvas-dashboard/frontend/src/App.tsx`

**Step 1: Import new hook and component**

```typescript
import { useEmail } from "./hooks/useEmail";
import { EmailBar } from "./components/EmailBar";
```

**Step 2: Use the hook**

```typescript
const {
  authorized: emailAuthorized,
  loading: emailLoading,
  syncing: emailSyncing,
  lastResult: emailLastResult,
  error: emailError,
  tasks: emailTasks,
  syncEmail,
} = useEmail();
```

**Step 3: Add groupBySource state**

```typescript
const [groupBySource, setGroupBySource] = useState(false);
```

**Step 4: Merge assignments + email tasks**

```typescript
const allTasks = [...assignments, ...emailTasks];
```

**Step 5: Add "Group by source" checkbox** next to existing toggles

**Step 6: Add EmailBar component** after CalendarBar

```tsx
<EmailBar
  authorized={emailAuthorized}
  loading={emailLoading}
  syncing={emailSyncing}
  lastResult={emailLastResult}
  error={emailError}
  onSync={syncEmail}
/>
```

**Step 7: Update AssignmentTable** to use `allTasks` and pass `groupBySource`

```tsx
<AssignmentTable
  assignments={allTasks}
  loading={loading}
  checkedIds={checkedIds}
  onToggleChecked={toggleChecked}
  groupByCourse={groupByCourse}
  groupBySource={groupBySource}
/>
```

**Step 8: Run `npm run build`**

Expected: Clean build

**Step 9: Commit**
```bash
git add frontend/src/App.tsx
git commit -m "feat: wire email task integration into App"
```

---

## Verification

1. **Backend tests:** `cd canvas-dashboard/backend && .venv/bin/python -m pytest tests/ -v` — expect ~48+ tests passing
2. **Frontend build:** `cd canvas-dashboard/frontend && npm run build` — clean, no TS errors
3. **Manual smoke test:**
   - Start backend: `cd canvas-dashboard/backend && .venv/bin/python app.py`
   - Start frontend: `cd canvas-dashboard/frontend && npm run dev`
   - Open `http://localhost:5173`
   - Click "Authorize Google" (if not already authorized) — consent screen should show Gmail permission
   - Click "Sync Email Tasks" — should extract tasks from latest EMBA email
   - Tasks appear in the table with source: "email"
   - Toggle "Group by source" — Canvas and Email sections appear separately
   - Checkboxes work on email tasks (localStorage)
   - Urgency badges show correct urgency based on extracted deadlines
