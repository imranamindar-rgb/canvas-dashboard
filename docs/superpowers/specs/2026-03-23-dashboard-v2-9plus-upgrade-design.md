# Canvas Dashboard v2 — "9+ Upgrade" Design Spec

## Overview

Upgrade the Canvas Dashboard from a functional but utilitarian tool (overall 7.05/10) to a polished, modern SaaS-quality application (target 9.1/10). The upgrade is structured in 5 phases, ordered by user-facing impact first, engineering rigor second.

**Stack**: Flask backend (Python 3.11), React 19 + TypeScript frontend (Vite), Tailwind CSS v4, SQLite.
**Deployment**: Render.com (single-user, MIT EMBA student).
**Live URL**: https://canvas-dashboard-06aa.onrender.com

---

## Phase 1: Visual Overhaul

### 1.1 Design System

**Visual direction**: Modern SaaS inspired by Linear/Vercel. Dark mode default.

- **Color palette**: Zinc/slate neutral scale. Dark background `zinc-900`/`zinc-950`, cards `zinc-800`/`zinc-850`, borders `zinc-700`. Light mode inverts to white/gray-50/gray-100.
- **Accent colors**: Urgency retains semantic meaning — red (critical), orange (high), blue (medium), green (runway), gray (overdue) — but rendered as subtle left-border accents on rows/cards rather than full-row background tints.
- **Typography**: System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`). Tighter line heights. Smaller, lighter secondary text. Bold only for headings and assignment names.
- **Spacing**: Consistent 4px grid. Tighter vertical density than current design.
- **Borders & shadows**: 1px borders with low-opacity whites in dark mode. Subtle `shadow-sm` on cards. Hover: slight lift (`translate-y-[-1px]`) with shadow increase.
- **Border radius**: `rounded-lg` (8px) for cards, `rounded-md` (6px) for buttons/inputs, `rounded-full` for pills/badges.

### 1.2 Dark/Light Theme Toggle

- Theme state persisted in `localStorage` key `theme`.
- Default: dark. Toggle button in header (sun/moon icon).
- Implementation: CSS custom properties on `:root` toggled by `data-theme="dark|light"` on `<html>`. Tailwind `dark:` variant wired to `[data-theme="dark"]` selector.
- New utility: `useTheme()` hook — returns `{ theme, toggle }`.

### 1.3 Component Redesign

**Header**: Compact single row. Left: app title. Center: sync status as small pill badge ("Synced 2m ago" / "Syncing..." / "Error"). Right: theme toggle + settings gear icon.

**Stats/Summary bar**: Row of 3-4 metric cards — "Due Today" / "This Week" / "Total" / optionally "Overdue". Each card: large number, small label below, subtle background color hint. Micro-animation: count number rolls up on load.

**Stats bar (urgency filters)**: Horizontal pill buttons with counts. Active state: filled accent color. Inactive: ghost/outline. Zero-count pills show but are disabled and dimmed.

**Course filter**: Horizontal scrollable row of course pills with deterministic colors (keep existing hash system). Active: filled. Inactive: outline.

**Assignment table (desktop)**:
- Rows: compact, 40-44px height. Left urgency border (3px colored line). Checkbox, course badge (small pill), name (medium weight), due (relative time, muted), points, effort badge.
- Hover: subtle background shift + row shadow.
- Focused row: indigo ring (keep existing).
- Group headers: sticky, semi-transparent background, uppercase small text.

**Assignment cards (mobile)**:
- Full-width cards with urgency left border. Course badge top-left. Name, due time, effort. Tap to expand.

**Weekly planner** (see 1.5 for drag-and-drop details):
- 7-column grid. Today column has accent header.
- Day columns: vertical stack of assignment cards. Drop zone indicator when dragging.
- Unscheduled section below/beside the grid.

### 1.4 Onboarding Wizard

Replace the current text-heavy setup modal with a 3-step wizard:

1. **Welcome**: "Set up your Canvas Dashboard" — brief intro, "Get Started" button.
2. **Canvas API**: Input field for API token. Link to Canvas settings page. "Test Connection" button that hits `/api/canvas/status`. Green check on success.
3. **Google (optional)**: "Connect Google" button for Calendar + Gmail. Skip button. Shows connected state if already authorized.

Wizard appears on first visit (detected by absence of Canvas config or a localStorage flag). Can be re-opened from settings.

State machine: `welcome → canvas → google → done`. Each step validates before advancing.

### 1.5 Drag-and-Drop Weekly Planner

**Dependencies**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

**Architecture**:
- `DndContext` wraps the entire planner.
- Each day column is a `useDroppable` zone with id `day-YYYY-MM-DD`.
- Unscheduled sections are droppable zones with id `unscheduled-{week}`.
- Each assignment card is a `useDraggable` item with id matching assignment id.
- On `onDragEnd`: call `PUT /api/assignments/{id}/planned-day` with new date (or null if dropped back to unscheduled).
- Optimistic update: move card immediately, rollback on API error.
- Visual feedback: drag overlay (semi-transparent clone), drop zone highlight (dashed border + background tint), spring animation on drop.

**Sorting within days**: `@dnd-kit/sortable` for reordering within a day column (order persisted as array in localStorage, not backend — lightweight).

---

## Phase 2: UX Polish

### 2.1 Animations

**Dependency**: `framer-motion`.

- **Page/view transitions**: `AnimatePresence` on dashboard ↔ weekly plan switch. Fade + slight slide.
- **List animations**: `layout` prop on assignment rows for smooth reorder on filter/sort changes.
- **Expand/collapse**: `motion.div` with height auto-animation for assignment detail panel.
- **Checkbox**: Scale bounce (1 → 1.2 → 1) + opacity transition on check.
- **Toast notifications**: Slide in from bottom-right, progress bar countdown, slide out. Stack multiple toasts.
- **Skeleton loaders**: Shimmer gradient animation (left-to-right sweep) on loading placeholders.
- **Sync button**: Progress ring animation (SVG circle stroke-dashoffset) while syncing.

### 2.2 Command Palette

**Dependency**: `cmdk` (by Paco Coursey, used by Vercel/Linear).

- Trigger: `Cmd+K` (Mac) / `Ctrl+K` (Windows).
- Sections: "Assignments" (fuzzy search), "Actions" (Refresh, Sync Calendar, Sync Email, Toggle Theme), "Navigation" (Dashboard, Weekly Plan).
- Assignment results show course badge + due date.
- Selecting an assignment scrolls to and expands it.

### 2.3 Side Panel (Desktop Assignment Detail)

Replace inline row expansion with a slide-out side panel on desktop (keep inline expansion on mobile).

- Panel slides in from right, ~400px wide.
- Contents: assignment name (h2), course badge, due date, points, urgency badge, effort selector, Canvas link, full description (rendered markdown/HTML with DOMPurify), next action editor with AI suggest button.
- Panel closes on Escape, clicking outside, or clicking a different row.
- URL updates with `?detail={id}` for deep-linking.

### 2.4 Filter Improvements

- **Sticky filter bar**: Filters stick to top on scroll with backdrop blur.
- **Filter pills**: Active filters shown as removable pills below the filter bar.
- **Animated transitions**: Filters animate in/out with `framer-motion`.

---

## Phase 3: Security & Persistence

### 3.1 Password Gate

- Env var: `DASHBOARD_PASSWORD` (required in production, optional in dev).
- Frontend: Full-screen password input on load. On submit, POST to `/api/auth` with `{ password }`.
- Backend: `/api/auth` compares with `DASHBOARD_PASSWORD` env var. On match, returns a session token (random UUID stored in server memory with TTL of 7 days).
- Token stored in `localStorage` and sent as `Authorization: Bearer {token}` header on all API calls.
- All `/api/*` routes (except `/api/auth` and `/api/health`) check for valid token. Return 401 if missing/invalid.
- Logout: clear localStorage token. No backend endpoint needed.
- Rate limit login attempts: 5 per minute per IP.

### 3.2 Credential Cleanup

- Remove `backend/google_credentials.json` from git tracking: `git rm --cached`.
- Add `google_credentials.json` to `.gitignore`.
- Update README and onboarding to use `GOOGLE_CLIENT_JSON` env var exclusively.
- Remove fallback to file-based credentials in `gcal_client.py._load_client_config()` for production (keep for local dev).

### 3.3 CSRF Protection

- Backend generates CSRF token on auth, returned in `/api/auth` response.
- Frontend sends as `X-CSRF-Token` header on POST/PUT/DELETE.
- Backend middleware validates on state-changing routes.

### 3.4 Email Task Persistence

New SQLite table:

```sql
CREATE TABLE email_tasks (
    id TEXT PRIMARY KEY,           -- "email-{message_id}-{index}"
    name TEXT NOT NULL,
    due_at TEXT NOT NULL,          -- ISO datetime
    email_subject TEXT,
    email_date TEXT,
    description TEXT,
    html_url TEXT,
    source_message_id TEXT,       -- Gmail message ID
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- `EmailTaskStore` reads from DB on startup, writes on sync.
- `email_store.py` updated to use `db.cursor()` context manager.
- Existing in-memory lock retained for thread safety during write operations.
- Migration: `db.py._init_db()` creates table if not exists (same pattern as `assignment_meta`).

---

## Phase 4: Testing & Documentation

### 4.1 Frontend Component Tests

Using Vitest + Testing Library (already configured):

- `Header.test.tsx`: Theme toggle, sync status display, settings modal.
- `AssignmentTable.test.tsx`: Rendering with groups, empty states, sort toggling.
- `WeeklyPlan.test.tsx`: Drag-and-drop placement (mock dnd-kit), day rendering, week navigation.
- `CalendarBar.test.tsx`: Auth states, sync button states.
- `OnboardingWizard.test.tsx`: Step progression, validation, skip.
- `CommandPalette.test.tsx`: Open/close, search filtering, action execution.
- `SidePanel.test.tsx`: Open/close, content rendering.

Target: 80%+ component coverage.

### 4.2 E2E Tests

**Dependency**: Playwright (dev).

Test scenarios:
1. **Auth flow**: Load → password gate → enter password → dashboard loads.
2. **Browse & filter**: Load assignments → filter by urgency → filter by course → search → clear filters.
3. **Assignment workflow**: Click assignment → side panel opens → edit next action → set effort → close panel.
4. **Weekly planner**: Switch to planner → drag assignment to day → verify placement → remove from plan.
5. **Calendar sync**: Click sync → modal preview → confirm → success toast.
6. **Theme toggle**: Toggle dark/light → verify persists on reload.

Run against mocked backend (Playwright `route` interception).

### 4.3 Backend Test Additions

- `test_auth.py`: Password gate, token validation, 401 on missing token, rate limiting.
- `test_csrf.py`: CSRF token validation on POST/PUT.
- `test_email_persistence.py`: Email tasks survive store restart, deduplication.
- Update existing tests to include auth headers.

Target: 90%+ route coverage.

### 4.4 Documentation

**API Reference** (`docs/api-reference.md`):
- Every endpoint: method, path, request body, response body, auth requirement, rate limit.
- Examples with curl.

**Architecture Diagram** (Mermaid in README):
- Frontend → Backend → Canvas API / Google APIs / Claude API / SQLite.
- Show data flow for assignment sync, email extraction, calendar sync.

**Updated README**:
- New screenshots (dark mode).
- Setup instructions for password gate.
- Env-var-only Google credential setup.
- Remove references to `google_credentials.json` file.

---

## Phase 5: DevOps

### 5.1 CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):

```yaml
on: [push, pull_request]
jobs:
  backend:
    - pip install -r requirements.txt
    - pytest tests/ -v --tb=short
    - flake8 / ruff check
  frontend:
    - npm ci
    - npm run lint
    - npx tsc --noEmit
    - npm test
    - npm run build
```

Render auto-deploys on `main` push (already configured).

### 5.2 Monitoring

Enhance `/api/health` response:

```json
{
  "status": "ok",
  "uptime_seconds": 3600,
  "last_sync": "2026-03-23T10:00:00Z",
  "last_sync_duration_ms": 1200,
  "assignment_count": 42,
  "email_task_count": 5,
  "sync_errors": [],
  "google_authorized": true,
  "canvas_configured": true
}
```

Structured JSON logging via Python `logging` with JSON formatter.

### 5.3 Performance

- Frontend code-splitting: `React.lazy()` for WeeklyPlan, OnboardingWizard, CommandPalette, SidePanel.
- Backend: ETag header on `/api/assignments` (hash of last_sync timestamp). 304 Not Modified if unchanged.
- Bundle analysis: `rollup-plugin-visualizer` in vite config (dev only).

---

## New Dependencies Summary

| Package | Purpose | Phase |
|---|---|---|
| `@dnd-kit/core` | Drag-and-drop primitives | 1 |
| `@dnd-kit/sortable` | Sortable lists within day columns | 1 |
| `@dnd-kit/utilities` | CSS utilities for transforms | 1 |
| `framer-motion` | Animations and transitions | 2 |
| `cmdk` | Command palette | 2 |
| `playwright` (dev) | E2E testing | 4 |
| `rollup-plugin-visualizer` (dev) | Bundle analysis | 5 |

Backend: No new Python dependencies.

---

## Score Projections

| Dimension | Before | After | Key Driver |
|---|---|---|---|
| Concept & Purpose | 8.0 | 8.5 | Onboarding makes it accessible |
| Architecture | 7.0 | 9.0 | Persistent email tasks, auth layer |
| Code Quality | 8.0 | 9.0 | Component tests, strict patterns |
| UI/Visual Design | 6.0 | 9.5 | Complete redesign, dark mode, design system |
| UX & Interaction | 7.5 | 9.5 | Drag-and-drop, Cmd+K, side panel, animations |
| Feature Completeness | 7.0 | 8.5 | Onboarding, command palette, better planner |
| Security | 6.5 | 9.0 | Password gate, CSRF, credential cleanup |
| DevOps & Deployment | 7.0 | 9.0 | CI/CD, monitoring, code-splitting |
| Documentation | 6.5 | 9.0 | API ref, architecture diagram, updated README |
| Testing | 7.0 | 9.0 | Component tests, E2E, 90% backend coverage |
| **Overall** | **7.05** | **9.1** | |
