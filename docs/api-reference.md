# Canvas Dashboard API Reference

Base URL: `https://canvas-dashboard-06aa.onrender.com` (production) or `http://localhost:8000` (local dev).

## Authentication

All endpoints except `/api/auth` and `/api/health` require a valid session token via the `Authorization: Bearer <token>` header. State-changing methods (POST, PUT, DELETE) additionally require a `X-CSRF-Token` header.

When `DASHBOARD_PASSWORD` is not set (dev mode), auth is bypassed automatically.

On any `401` response, clear the stored token and redirect the user to the login screen.

---

### POST /api/auth

Login to get a session token.

**Auth required**: No

**Rate limit**: 5/minute

**Request body**:
```json
{ "password": "string" }
```

**Response** (200 -- success):
```json
{
  "token": "url-safe-base64-string",
  "csrf_token": "hex-string",
  "expires_at": "ISO-8601 datetime"
}
```

**Response** (200 -- dev mode, no `DASHBOARD_PASSWORD` set):
```json
{
  "token": "dev",
  "csrf_token": "dev",
  "expires_at": "2099-12-31T00:00:00Z"
}
```

**Response** (401 -- invalid password):
```json
{ "error": "invalid_password" }
```

**curl example**:
```bash
curl -X POST http://localhost:8000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"password": "your-password"}'
```

---

### GET /api/health

Health check and system status.

**Auth required**: No

**Rate limit**: None (default)

**Request body**: None

**Response** (200):
```json
{
  "status": "ok | error",
  "last_sync": "ISO-8601 datetime | null",
  "assignment_count": 42,
  "error": "string | null",
  "sync_errors": [],
  "anthropic_available": true
}
```

**curl example**:
```bash
curl http://localhost:8000/api/health
```

---

### GET /api/assignments

Retrieve all assignments, enriched with persistent metadata (next_action, effort, planned_day, checked).

**Auth required**: Yes

**Rate limit**: None (default)

**Query parameters**:
| Parameter | Type   | Description                                      |
|-----------|--------|--------------------------------------------------|
| `urgency` | string | Filter by urgency level (e.g. `critical`, `high`, `medium`, `runway`) |
| `course`  | string | Filter by course name                            |
| `view`    | string | View mode filter                                 |

**Response** (200):
```json
[
  {
    "id": 12345,
    "name": "Case Study Analysis",
    "course_name": "Finance 101",
    "due_at": "2026-03-28T23:59:00Z",
    "points_possible": 100,
    "html_url": "https://canvas.mit.edu/...",
    "urgency": "high",
    "next_action": "Read case pp. 12-18 | null",
    "effort": "M | null",
    "planned_day": "2026-03-27 | null",
    "checked": false,
    "checked_at": "ISO-8601 datetime | null"
  }
]
```

**Response** (401 -- unauthorized):
```json
{ "error": "unauthorized" }
```

**curl example**:
```bash
curl http://localhost:8000/api/assignments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### GET /api/stats

Retrieve aggregated assignment statistics (counts by urgency, due today, this week, etc.).

**Auth required**: Yes

**Rate limit**: None (default)

**Request body**: None

**Response** (200):
```json
{
  "total": 42,
  "due_today": 3,
  "due_this_week": 12,
  "overdue": 1,
  "by_urgency": {
    "critical": 2,
    "high": 5,
    "medium": 8,
    "runway": 27
  }
}
```

**curl example**:
```bash
curl http://localhost:8000/api/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### POST /api/refresh

Force a sync of assignments from the Canvas API.

**Auth required**: Yes (+ CSRF token)

**Rate limit**: None (default)

**Request body**: None

**Response** (200 -- success):
```json
{
  "status": "ok",
  "assignments": [ ... ]
}
```

**Response** (500 -- sync failure):
```json
{
  "status": "error",
  "error": "Failed to refresh assignments. Check server logs."
}
```

**curl example**:
```bash
curl -X POST http://localhost:8000/api/refresh \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN"
```

---

### GET /api/canvas/status

Check whether the Canvas API is configured.

**Auth required**: Yes

**Rate limit**: None (default)

**Request body**: None

**Response** (200):
```json
{
  "configured": true,
  "api_url": "https://canvas.mit.edu"
}
```

If not configured, `api_url` is `null`.

**curl example**:
```bash
curl http://localhost:8000/api/canvas/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### GET /api/gcal/auth

Check Google Calendar authorization status.

**Auth required**: Yes

**Rate limit**: None (default)

**Request body**: None

**Response** (200 -- Google credentials available):
```json
{
  "authorized": true,
  "available": true
}
```

**Response** (200 -- Google credentials not configured):
```json
{
  "authorized": false,
  "available": false
}
```

**curl example**:
```bash
curl http://localhost:8000/api/gcal/auth \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### POST /api/gcal/authorize

Initiate the Google OAuth 2.0 flow. Returns the authorization URL for the user to visit.

**Auth required**: Yes (+ CSRF token)

**Rate limit**: None (default)

**Request body**: None

**Response** (200 -- success):
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

**Response** (400 -- Google not configured):
```json
{
  "error": "Google integration not configured. Set GOOGLE_CLIENT_JSON env var on Render, or add google_credentials.json locally."
}
```

**curl example**:
```bash
curl -X POST http://localhost:8000/api/gcal/authorize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN"
```

---

### GET /api/gcal/callback

OAuth 2.0 callback endpoint. Google redirects the user here after authorization. Not called directly by the frontend.

**Auth required**: Yes

**Rate limit**: None (default)

**Query parameters**:
| Parameter | Type   | Description                        |
|-----------|--------|------------------------------------|
| `code`    | string | Authorization code from Google     |
| `error`   | string | Error code if user denied access   |

**Response**: Redirects to `/?gcal=authorized` on success or `/?gcal=error&reason=...` on failure.

---

### POST /api/gcal/sync

Sync current assignments to Google Calendar.

**Auth required**: Yes (+ CSRF token)

**Rate limit**: None (default)

**Request body**: None

**Response** (200 -- success):
```json
{
  "created": 5,
  "updated": 2,
  "deleted": 0,
  "errors": []
}
```

**Response** (400 -- Google not configured):
```json
{
  "error": "Google integration not configured"
}
```

**curl example**:
```bash
curl -X POST http://localhost:8000/api/gcal/sync \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN"
```

---

### GET /api/email/status

Check email integration status and task count.

**Auth required**: Yes

**Rate limit**: None (default)

**Request body**: None

**Response** (200 -- Google available):
```json
{
  "authorized": true,
  "last_sync": "ISO-8601 datetime | null",
  "task_count": 5,
  "error": "string | null"
}
```

**Response** (200 -- Google not available):
```json
{
  "connected": false,
  "available": false,
  "last_sync": null,
  "task_count": 0,
  "error": null
}
```

**curl example**:
```bash
curl http://localhost:8000/api/email/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### GET /api/email/tasks

Retrieve all extracted email tasks.

**Auth required**: Yes

**Rate limit**: None (default)

**Request body**: None

**Response** (200):
```json
[
  {
    "id": "email-abc123-0",
    "name": "Submit team preferences",
    "due_at": "2026-03-30T23:59:00Z",
    "email_subject": "Team Formation Deadline",
    "email_date": "2026-03-20T10:00:00Z",
    "description": "...",
    "html_url": "https://mail.google.com/...",
    "source_message_id": "abc123"
  }
]
```

**curl example**:
```bash
curl http://localhost:8000/api/email/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### POST /api/email/sync

Fetch latest announcement emails from Gmail and extract tasks using Claude AI.

**Auth required**: Yes (+ CSRF token)

**Rate limit**: 10/hour

**Request body**: None

**Response** (200 -- tasks extracted):
```json
{
  "synced": 3,
  "message": "Extracted 3 tasks"
}
```

**Response** (200 -- no new emails):
```json
{
  "synced": 0,
  "message": "No announcement emails found"
}
```

**Response** (200 -- already processed):
```json
{
  "synced": 5,
  "message": "Already processed latest email"
}
```

**Response** (400 -- Google not configured):
```json
{
  "error": "Google integration not configured"
}
```

**Response** (400 -- Anthropic not configured):
```json
{
  "error": "ANTHROPIC_API_KEY not configured"
}
```

**Response** (500 -- sync failure):
```json
{
  "error": "Email sync failed. Check server logs for details."
}
```

**curl example**:
```bash
curl -X POST http://localhost:8000/api/email/sync \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN"
```

---

### GET /api/assignments/\<id\>/meta

Retrieve metadata for a single assignment.

**Auth required**: Yes

**Rate limit**: None (default)

**URL parameters**:
| Parameter | Type   | Description         |
|-----------|--------|---------------------|
| `id`      | string | Assignment ID       |

**Response** (200):
```json
{
  "next_action": "string | null",
  "effort": "S | M | L | XL | null",
  "checked": false,
  "checked_at": "ISO-8601 datetime | null",
  "planned_day": "YYYY-MM-DD | null"
}
```

**Response** (500):
```json
{
  "error": "Failed to load. Please try again."
}
```

**curl example**:
```bash
curl http://localhost:8000/api/assignments/12345/meta \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### PUT /api/assignments/\<id\>/next-action

Set or update the next action text for an assignment.

**Auth required**: Yes (+ CSRF token)

**Rate limit**: None (default)

**URL parameters**:
| Parameter | Type   | Description         |
|-----------|--------|---------------------|
| `id`      | string | Assignment ID       |

**Request body**:
```json
{
  "next_action": "string (max 500 chars)"
}
```

**Response** (200 -- success):
```json
{ "ok": true }
```

**Response** (400 -- too long):
```json
{
  "error": "next_action too long (max 500 chars)"
}
```

**Response** (500):
```json
{
  "error": "Failed to save. Please try again."
}
```

**curl example**:
```bash
curl -X PUT http://localhost:8000/api/assignments/12345/next-action \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"next_action": "Read case study pp. 12-18"}'
```

---

### POST /api/assignments/\<id\>/next-action/suggest

Use Claude AI to suggest a next action for the assignment. The suggestion is automatically saved.

**Auth required**: Yes (+ CSRF token)

**Rate limit**: 10/minute

**URL parameters**:
| Parameter | Type   | Description         |
|-----------|--------|---------------------|
| `id`      | string | Assignment ID       |

**Request body**:
```json
{
  "name": "string (required)",
  "description": "string (optional, max 2000 chars used)",
  "course_name": "string (optional, max 120 chars used)"
}
```

**Response** (200 -- success):
```json
{
  "suggestion": "Read Case pp. 12-18 and highlight 3 key tensions.",
  "saved": true
}
```

**Response** (400 -- missing name):
```json
{
  "error": "name required"
}
```

**Response** (400 -- Anthropic not configured):
```json
{
  "error": "ANTHROPIC_API_KEY not configured"
}
```

**Response** (500):
```json
{
  "error": "Suggestion failed. Check server logs."
}
```

**curl example**:
```bash
curl -X POST http://localhost:8000/api/assignments/12345/next-action/suggest \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Case Study Analysis", "description": "Analyze the Tesla case...", "course_name": "Finance 101"}'
```

---

### PUT /api/assignments/\<id\>/effort

Set the effort estimate for an assignment.

**Auth required**: Yes (+ CSRF token)

**Rate limit**: None (default)

**URL parameters**:
| Parameter | Type   | Description         |
|-----------|--------|---------------------|
| `id`      | string | Assignment ID       |

**Request body**:
```json
{
  "effort": "S | M | L | XL"
}
```

**Response** (200 -- success):
```json
{ "ok": true }
```

**Response** (400 -- invalid value):
```json
{
  "error": "effort must be S, M, L, or XL"
}
```

**Response** (500):
```json
{
  "error": "Failed to save. Please try again."
}
```

**curl example**:
```bash
curl -X PUT http://localhost:8000/api/assignments/12345/effort \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"effort": "M"}'
```

---

### PUT /api/assignments/\<id\>/checked

Mark or unmark an assignment as checked (completed).

**Auth required**: Yes (+ CSRF token)

**Rate limit**: None (default)

**URL parameters**:
| Parameter | Type   | Description         |
|-----------|--------|---------------------|
| `id`      | string | Assignment ID       |

**Request body**:
```json
{
  "checked": true
}
```

**Response** (200 -- success):
```json
{ "ok": true }
```

**Response** (400 -- invalid type):
```json
{
  "error": "checked must be a boolean"
}
```

**Response** (500):
```json
{
  "error": "Failed to save. Please try again."
}
```

**curl example**:
```bash
curl -X PUT http://localhost:8000/api/assignments/12345/checked \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"checked": true}'
```

---

### PUT /api/assignments/\<id\>/planned-day

Schedule an assignment to a specific day in the weekly planner, or unschedule it.

**Auth required**: Yes (+ CSRF token)

**Rate limit**: None (default)

**URL parameters**:
| Parameter | Type   | Description         |
|-----------|--------|---------------------|
| `id`      | string | Assignment ID       |

**Request body**:
```json
{
  "planned_day": "YYYY-MM-DD | null"
}
```

Pass `null` to remove from the weekly plan.

**Response** (200 -- success):
```json
{ "ok": true }
```

**Response** (400 -- invalid format):
```json
{
  "error": "planned_day must be YYYY-MM-DD or null"
}
```

**Response** (500):
```json
{
  "error": "Failed to save. Please try again."
}
```

**curl example**:
```bash
curl -X PUT http://localhost:8000/api/assignments/12345/planned-day \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planned_day": "2026-03-27"}'
```

---

## Error Responses

All endpoints may return these common error responses:

### 401 Unauthorized
```json
{ "error": "unauthorized" }
```
Missing or invalid `Authorization: Bearer <token>` header.

### 403 CSRF Invalid
```json
{ "error": "csrf_invalid" }
```
Missing or invalid `X-CSRF-Token` header on POST/PUT/DELETE requests.

### 429 Too Many Requests
Rate limit exceeded. Response includes `Retry-After` header.

## Rate Limits Summary

| Endpoint                                        | Limit        |
|-------------------------------------------------|--------------|
| `POST /api/auth`                                | 5/minute     |
| `POST /api/email/sync`                          | 10/hour      |
| `POST /api/assignments/<id>/next-action/suggest` | 10/minute    |
| All other endpoints                             | No limit     |
