# Gmail Integration Design

## Problem

The EMBA program sends weekly announcement emails every Tuesday containing action items with deadlines (surveys, RSVPs, registrations). These tasks aren't tracked in Canvas and are easy to miss. The dashboard should surface these alongside Canvas assignments.

## Decision

Extend the existing Google OAuth flow to include Gmail readonly scope. Use the Gmail API to fetch EMBA announcement emails, then use Claude API to extract structured action items with deadlines. Display them in the dashboard grouped by source (Canvas vs Email).

## Data Model

```python
@dataclass
class EmailTask:
    id: str              # "email-{message_id}-{index}"
    name: str            # "Complete weekend survey"
    source: str          # "email"
    due_at: datetime     # extracted deadline or email_date + 7 days
    email_subject: str   # original email subject line
    email_date: datetime # when the email was sent
    description: str     # context from the email
    html_url: str        # link to email in Gmail
    urgency: str         # computed via classify_urgency()
```

Existing `Assignment.to_dict()` gains `source: "canvas"` field.

## Backend Components

### gmail_client.py
- Reuses `google_credentials.json` and `token.json`
- Adds `gmail.readonly` scope (one-time re-auth)
- `fetch_latest_announcements()` searches for `from:"MIT Executive MBA Program" subject:ANNOUNCEMENTS`
- Returns email HTML body, subject, date, message ID

### email_extractor.py
- Takes email HTML + Claude API key
- Sends structured prompt asking for JSON action items: `[{name, deadline, description}]`
- Parses response into `EmailTask` objects
- Falls back gracefully if API unavailable

### email_store.py
- In-memory store for `EmailTask` objects (mirrors AssignmentStore pattern)
- Tracks last processed message ID to avoid re-extraction
- Thread-safe with Lock

### New Flask Routes
- `GET /api/email/tasks` — returns extracted email tasks
- `POST /api/email/sync` — triggers Gmail fetch + Claude extraction
- `GET /api/email/status` — Gmail auth status and last sync info

### OAuth Changes
- `gcal_client.py` updated to request both `calendar.events` and `gmail.readonly` scopes
- Single authorization flow covers both services
- Users who already authorized will need to re-authorize once for the new scope

## Frontend Changes

### Source Grouping
- New grouping mode in AssignmentTable: "Group by Source"
- Two sections: Canvas (assignments) and Email (extracted tasks)
- Collapsible headers with counts
- Email tasks show envelope icon to distinguish from Canvas

### Unified Rendering
- Email tasks share the same card/row UI as Canvas assignments
- Checkbox, urgency badge, relative time, expand for details all work the same
- Expanded view shows email context and link to original email

### Email Sync Bar
- Small status bar (like CalendarBar) for Gmail connection
- Shows connection status and "Sync Email Tasks" button

## Dependencies

- `anthropic` Python package (new)
- Existing `google-api-python-client` and `google-auth-oauthlib` support Gmail API

## Configuration

New `.env` entries:
```
ANTHROPIC_API_KEY=sk-ant-...
```
