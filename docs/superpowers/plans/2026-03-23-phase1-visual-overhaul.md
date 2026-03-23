# Phase 1: Visual Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Canvas Dashboard from a utilitarian Tailwind template into a polished, dark-mode-first SaaS dashboard inspired by Linear/Vercel.

**Architecture:** Dark mode via Tailwind CSS v4 `@variant` directive + `data-theme` attribute on `<html>`. All existing components redesigned with new color palette (zinc neutrals, subtle borders, accent left-borders for urgency). Weekly planner rebuilt with `@dnd-kit` for drag-and-drop. New onboarding wizard replaces text-heavy setup modal.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, @dnd-kit/core, Vite 7

**Spec:** `docs/superpowers/specs/2026-03-23-dashboard-v2-9plus-upgrade-design.md`

---

## File Structure

### New Files
- `frontend/src/hooks/useTheme.ts` — dark/light theme toggle hook
- `frontend/src/components/OnboardingWizard.tsx` — 3-step setup wizard
- `frontend/src/hooks/useOnboarding.ts` — onboarding state management

### Modified Files
- `frontend/index.html` — add `data-theme="dark"` default
- `frontend/src/index.css` — add `@variant dark`, CSS custom properties, base styles
- `frontend/src/main.tsx` — initialize theme from localStorage before render
- `frontend/src/utils/urgencyStyles.ts` — dark-mode-aware styles with left-border accent pattern
- `frontend/src/utils/courseColors.ts` — dark-mode-aware course color palette
- `frontend/src/components/Header.tsx` — compact redesign with theme toggle
- `frontend/src/components/SummaryBar.tsx` — metric cards redesign
- `frontend/src/components/SearchBar.tsx` — dark-mode styling
- `frontend/src/components/StatsBar.tsx` — pill button redesign
- `frontend/src/components/CourseFilter.tsx` — dark-mode pill buttons
- `frontend/src/components/AssignmentRow.tsx` — compact row with urgency left-border
- `frontend/src/components/AssignmentCard.tsx` — dark-mode cards
- `frontend/src/components/AssignmentTable.tsx` — dark-mode table shell
- `frontend/src/components/CalendarBar.tsx` — dark-mode redesign
- `frontend/src/components/EmailBar.tsx` — dark-mode redesign
- `frontend/src/components/WeeklyPlan.tsx` — full rewrite with dnd-kit
- `frontend/src/App.tsx` — dark background, wire onboarding, updated layout
- `frontend/package.json` — add @dnd-kit dependencies

---

### Task 1: Install Dependencies

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install @dnd-kit packages**

```bash
cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npm install @dnd-kit/core @dnd-kit/utilities
```

Note: `@dnd-kit/sortable` (within-day reordering) is deferred to a future iteration. Phase 1 focuses on drag-between-zones only.

- [ ] **Step 2: Verify installation**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npm ls @dnd-kit/core`
Expected: Shows @dnd-kit/core version

- [ ] **Step 3: Commit**

```bash
cd /Users/imranamindar/Claude_Projects/canvas-dashboard && git add frontend/package.json frontend/package-lock.json && git commit -m "feat: add @dnd-kit dependencies for drag-and-drop planner"
```

---

### Task 2: Dark Mode Infrastructure — CSS

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/index.html`

- [ ] **Step 1: Update index.css with Tailwind v4 dark variant and base styles**

Replace the entire contents of `frontend/src/index.css` with:

```css
@import "tailwindcss";

/* Wire dark: variant to data-theme attribute (Tailwind CSS v4) */
@variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

/* Base styles */
@layer base {
  :root {
    --color-surface: 250 250 250;      /* gray-50 */
    --color-surface-raised: 255 255 255; /* white */
    --color-surface-overlay: 243 244 246; /* gray-100 */
    --color-border: 229 231 235;       /* gray-200 */
    --color-text-primary: 17 24 39;    /* gray-900 */
    --color-text-secondary: 107 114 128; /* gray-500 */
    --color-text-muted: 156 163 175;   /* gray-400 */
    --color-accent: 99 102 241;        /* indigo-500 */
  }

  [data-theme="dark"] {
    --color-surface: 9 9 11;           /* zinc-950 */
    --color-surface-raised: 24 24 27;  /* zinc-900 */
    --color-surface-overlay: 39 39 42; /* zinc-800 */
    --color-border: 63 63 70;          /* zinc-700 */
    --color-text-primary: 244 244 245; /* zinc-100 */
    --color-text-secondary: 161 161 170; /* zinc-400 */
    --color-text-muted: 113 113 122;   /* zinc-500 */
    --color-accent: 129 140 248;       /* indigo-400 */
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

- [ ] **Step 2: Add `data-theme="dark"` to index.html and update loader colors**

Update `frontend/index.html`:
- Add `data-theme="dark"` to the `<html>` tag
- Update the loader div background to dark: `background:#09090B` (zinc-950)
- Update loader text color to `color:#71717A` (zinc-500)
- Update spinner stroke colors: track `#27272A` (zinc-800), arc `#818CF8` (indigo-400)

```html
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Canvas Dashboard by Imran Dar</title>
  </head>
  <body>
    <div id="app-loader" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#09090B;z-index:9999;font-family:system-ui,sans-serif;flex-direction:column;gap:16px;">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="animation:spin 0.8s linear infinite;">
        <circle cx="20" cy="20" r="16" stroke="#27272A" stroke-width="4"/>
        <path d="M36 20A16 16 0 0 0 20 4" stroke="#818CF8" stroke-width="4" stroke-linecap="round"/>
      </svg>
      <span style="color:#71717A;font-size:14px;font-weight:500;">Canvas Dashboard</span>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Verify build succeeds**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npx tsc --noEmit && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/imranamindar/Claude_Projects/canvas-dashboard && git add frontend/src/index.css frontend/index.html && git commit -m "feat: add dark mode CSS infrastructure with Tailwind v4 @variant"
```

---

### Task 3: useTheme Hook

**Files:**
- Create: `frontend/src/hooks/useTheme.ts`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Create useTheme hook**

```typescript
// frontend/src/hooks/useTheme.ts
import { useState, useCallback, useEffect } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "theme";
const DEFAULT_THEME: Theme = "dark";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return DEFAULT_THEME;
}

/** Apply theme to <html> element immediately (call before React renders). */
export function initTheme(): void {
  const theme = getInitialTheme();
  document.documentElement.setAttribute("data-theme", theme);

  // Also update the loader background if it still exists
  const loader = document.getElementById("app-loader");
  if (loader) {
    loader.style.background = theme === "dark" ? "#09090B" : "#F8FAFC";
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle } as const;
}
```

- [ ] **Step 2: Initialize theme in main.tsx before React render**

Update `frontend/src/main.tsx` to call `initTheme()` before `createRoot`:

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initTheme } from "./hooks/useTheme";
import "./index.css";
import App from "./App.tsx";

// Apply theme before first render to prevent flash
initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/imranamindar/Claude_Projects/canvas-dashboard && git add frontend/src/hooks/useTheme.ts frontend/src/main.tsx && git commit -m "feat: add useTheme hook with localStorage persistence"
```

---

### Task 4: Update urgencyStyles for Dark Mode

**Files:**
- Modify: `frontend/src/utils/urgencyStyles.ts`

- [ ] **Step 1: Rewrite urgencyStyles.ts with dark-mode-aware classes and left-border accent pattern**

The new design uses subtle left-border accents instead of full-row background tints. In dark mode, backgrounds are zinc-based.

```typescript
// frontend/src/utils/urgencyStyles.ts

/** Badge styles for urgency pills */
export const URGENCY_STYLES: Record<string, string> = {
  overdue: "bg-gray-200 text-gray-600 dark:bg-zinc-700 dark:text-zinc-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  runway: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

/** Left border accent color for assignment rows */
export const URGENCY_BORDER: Record<string, string> = {
  overdue: "border-l-gray-400 dark:border-l-zinc-500",
  critical: "border-l-red-500 dark:border-l-red-400",
  high: "border-l-orange-500 dark:border-l-orange-400",
  medium: "border-l-blue-500 dark:border-l-blue-400",
  runway: "border-l-green-500 dark:border-l-green-400",
};

/** Card backgrounds for mobile cards */
export const CARD_BG: Record<string, string> = {
  overdue: "bg-gray-50 border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-700",
  critical: "bg-white border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-700",
  high: "bg-white border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-700",
  medium: "bg-white border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-700",
  runway: "bg-white border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-700",
};

/** Table row background — now minimal, urgency communicated via left border */
export const ROW_BG: Record<string, string> = {
  overdue: "",
  critical: "",
  high: "",
  medium: "",
  runway: "",
};

/** Table row hover */
export const ROW_HOVER: Record<string, string> = {
  overdue: "hover:bg-gray-50 dark:hover:bg-zinc-800/50",
  critical: "hover:bg-gray-50 dark:hover:bg-zinc-800/50",
  high: "hover:bg-gray-50 dark:hover:bg-zinc-800/50",
  medium: "hover:bg-gray-50 dark:hover:bg-zinc-800/50",
  runway: "hover:bg-gray-50 dark:hover:bg-zinc-800/50",
};
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/imranamindar/Claude_Projects/canvas-dashboard && git add frontend/src/utils/urgencyStyles.ts && git commit -m "feat: redesign urgency styles with dark mode and left-border accents"
```

---

### Task 5: Update courseColors for Dark Mode

**Files:**
- Modify: `frontend/src/utils/courseColors.ts`

- [ ] **Step 1: Read the current file and update with dark-mode-aware colors**

Update the palette to include `dark` variants for bg, text, and border. Keep the same hash function. Each palette entry needs light and dark mode classes.

```typescript
// frontend/src/utils/courseColors.ts

interface CourseColor {
  bg: string;
  text: string;
  border: string;
}

const PALETTE: CourseColor[] = [
  { bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-700 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800" },
  { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
  { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" },
  { bg: "bg-rose-50 dark:bg-rose-900/20", text: "text-rose-700 dark:text-rose-400", border: "border-rose-200 dark:border-rose-800" },
  { bg: "bg-sky-50 dark:bg-sky-900/20", text: "text-sky-700 dark:text-sky-400", border: "border-sky-200 dark:border-sky-800" },
  { bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-700 dark:text-violet-400", border: "border-violet-200 dark:border-violet-800" },
  { bg: "bg-teal-50 dark:bg-teal-900/20", text: "text-teal-700 dark:text-teal-400", border: "border-teal-200 dark:border-teal-800" },
  { bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-700 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800" },
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getCourseColor(courseName: string): CourseColor {
  return PALETTE[hash(courseName) % PALETTE.length];
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/imranamindar/Claude_Projects/canvas-dashboard && git add frontend/src/utils/courseColors.ts && git commit -m "feat: add dark mode to course color palette"
```

---

### Task 6: Redesign Header Component

**Files:**
- Modify: `frontend/src/components/Header.tsx`

- [ ] **Step 1: Rewrite Header.tsx**

New design: Compact single row. Left: app title. Center: sync status pill badge. Right: theme toggle (sun/moon SVG) + settings gear + refresh button. All with dark mode classes.

Key changes:
- Accept `theme`, `onToggleTheme`, and optional `onResetOnboarding` as props (do NOT import `useTheme` — theme state lives in App.tsx)
- Add theme toggle button with sun/moon icon (calls `onToggleTheme` prop)
- Compact layout: single flex row
- Sync status as a small pill badge in center
- All colors use `dark:` variants
- Setup modal gets dark mode styling
- Remove "by Imran Dar" subtitle to keep it compact

The full rewrite of Header.tsx should:
- Keep all existing functionality (setup modal, canvas status, health display)
- Use `theme` and `onToggleTheme` props for the theme toggle button (theme state is owned by App.tsx via `useTheme` hook)
- Update all className strings with `dark:` variants:
  - `bg-gray-50` → `bg-gray-50 dark:bg-zinc-950`
  - `border-gray-200` → `border-gray-200 dark:border-zinc-800`
  - `text-gray-900` → `text-gray-900 dark:text-zinc-100`
  - `text-gray-500` → `text-gray-500 dark:text-zinc-400`
  - `bg-white` → `bg-white dark:bg-zinc-900`
  - `hover:bg-gray-100` → `hover:bg-gray-100 dark:hover:bg-zinc-800`
  - Modal overlay: `bg-black/50` → `bg-black/60`
  - Modal content: `bg-white` → `bg-white dark:bg-zinc-900`
  - Code blocks: `bg-gray-100` → `bg-gray-100 dark:bg-zinc-800`
- Add theme toggle button (SVG sun for dark mode, moon for light mode) between settings gear and refresh button
- Header background: `bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800`
- Refresh button: `bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900`

- [ ] **Step 2: Verify build**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/imranamindar/Claude_Projects/canvas-dashboard && git add frontend/src/components/Header.tsx && git commit -m "feat: redesign Header with dark mode and theme toggle"
```

---

### Task 7: Redesign SummaryBar Component

**Files:**
- Modify: `frontend/src/components/SummaryBar.tsx`

- [ ] **Step 1: Rewrite SummaryBar as metric cards**

New design: Row of 3 metric cards with large numbers, small labels, subtle background tints. Dark mode support.

```typescript
import type { Stats } from "../types";

interface Props {
  stats: Stats | null;
}

export function SummaryBar({ stats }: Props) {
  if (!stats) {
    return (
      <div className="flex gap-3 px-4 py-3 sm:px-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  const metrics = [
    { value: stats.due_today, label: "Due Today", accent: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/10" },
    { value: stats.due_this_week, label: "This Week", accent: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/10" },
    { value: stats.total, label: "Total", accent: "text-zinc-900 dark:text-zinc-100", bg: "bg-gray-50 dark:bg-zinc-800/50" },
  ];

  return (
    <div className="flex gap-3 px-4 py-3 sm:px-6">
      {metrics.map(({ value, label, accent, bg }) => (
        <div
          key={label}
          className={`flex flex-col rounded-lg px-4 py-2.5 ${bg}`}
        >
          <span className={`text-2xl font-bold tabular-nums ${accent}`}>
            {value}
          </span>
          <span className="text-xs text-gray-500 dark:text-zinc-500">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
cd /Users/imranamindar/Claude_Projects/canvas-dashboard && git add frontend/src/components/SummaryBar.tsx && git commit -m "feat: redesign SummaryBar as metric cards with dark mode"
```

---

### Task 8: Redesign SearchBar, StatsBar, CourseFilter

**Files:**
- Modify: `frontend/src/components/SearchBar.tsx`
- Modify: `frontend/src/components/StatsBar.tsx`
- Modify: `frontend/src/components/CourseFilter.tsx`

- [ ] **Step 1: Update SearchBar with dark mode classes**

Key changes to SearchBar.tsx:
- Input: `bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:ring-gray-200 dark:focus:ring-zinc-600 focus:border-gray-300 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-800`
- Search icon: `text-gray-400 dark:text-zinc-500`
- Clear button: `text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300`

- [ ] **Step 2: Update StatsBar with dark mode pill styles**

Key changes to StatsBar.tsx TIERS array — update `color` and `activeColor` for each tier:
- `color` gets `dark:` variants: e.g., `"bg-gray-200 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"`
- `activeColor` gets `dark:` variants
- Disabled state: `"bg-gray-100 text-gray-400 dark:bg-zinc-800/50 dark:text-zinc-600 cursor-default"`
- Container: no changes needed (inherits)

- [ ] **Step 3: Update CourseFilter with dark mode**

Key changes to CourseFilter.tsx:
- Active pill: `bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900`
- Inactive pill: `bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700`

- [ ] **Step 4: Verify build**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
cd /Users/imranamindar/Claude_Projects/canvas-dashboard && git add frontend/src/components/SearchBar.tsx frontend/src/components/StatsBar.tsx frontend/src/components/CourseFilter.tsx && git commit -m "feat: add dark mode to SearchBar, StatsBar, CourseFilter"
```

---

### Task 9: Redesign AssignmentRow with Left-Border Accent

**Files:**
- Modify: `frontend/src/components/AssignmentRow.tsx`

- [ ] **Step 1: Update AssignmentRow.tsx**

Key changes:
- Import `URGENCY_BORDER` from urgencyStyles (new export from Task 4)
- Row `<tr>`: Add `border-l-[3px] ${URGENCY_BORDER[assignment.urgency]}` class. Remove `ROW_BG` usage (rows are now neutral). Keep `ROW_HOVER`.
- All text colors: add `dark:` variants
  - `text-gray-900` → `text-gray-900 dark:text-zinc-100`
  - `text-gray-600` → `text-gray-600 dark:text-zinc-400`
  - `text-gray-400` → `text-gray-400 dark:text-zinc-500`
  - `text-gray-500` → `text-gray-500 dark:text-zinc-400`
- Borders: `border-gray-100` → `border-gray-100 dark:border-zinc-800`
- Expanded row: `bg-gray-50` → `bg-gray-50 dark:bg-zinc-800/50`
- Checkbox:
  - Unchecked: `border-gray-300 dark:border-zinc-600 hover:border-gray-400 dark:hover:border-zinc-500`
  - Checked: keep green
- Next action input: `border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:border-indigo-500 dark:focus:border-indigo-400`
- Effort buttons: `bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700`
- Active effort: `bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900`
- Suggest button: `border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400`
- Save button: `bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900`
- Canvas link: `text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300`
- `<hr>` tags: `border-gray-200 dark:border-zinc-700`

- [ ] **Step 2: Verify build**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
cd /Users/imranamindar/Claude_Projects/canvas-dashboard && git add frontend/src/components/AssignmentRow.tsx && git commit -m "feat: redesign AssignmentRow with dark mode and urgency left-border"
```

---

### Task 10: Redesign AssignmentCard and AssignmentTable

**Files:**
- Modify: `frontend/src/components/AssignmentCard.tsx`
- Modify: `frontend/src/components/AssignmentTable.tsx`

- [ ] **Step 1: Update AssignmentCard.tsx with dark mode**

Apply the same dark mode pattern as AssignmentRow:
- Card background: `bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800`
- Add urgency left border: `border-l-[3px] ${URGENCY_BORDER[assignment.urgency]}`
- All text/border colors get `dark:` variants
- Expanded content: same dark patterns as AssignmentRow expanded

- [ ] **Step 2: Update AssignmentTable.tsx with dark mode**

Key changes:
- Table wrapper: currently `rounded-lg bg-white shadow-sm` in App.tsx — this will be updated in App.tsx task, but the table itself needs:
  - Table header row: `bg-gray-50 dark:bg-zinc-800/50`
  - Header text: `text-gray-500 dark:text-zinc-400`
  - Group headers: `bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300`
  - Empty state text: `text-gray-400 dark:text-zinc-500`
  - Skeleton rows: `bg-gray-200 dark:bg-zinc-800 animate-pulse`
  - Sort buttons: `text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300`

- [ ] **Step 3: Verify build**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
cd /Users/imranamindar/Claude_Projects/canvas-dashboard && git add frontend/src/components/AssignmentCard.tsx frontend/src/components/AssignmentTable.tsx && git commit -m "feat: add dark mode to AssignmentCard and AssignmentTable"
```

---

### Task 11: Redesign CalendarBar and EmailBar

**Files:**
- Modify: `frontend/src/components/CalendarBar.tsx`
- Modify: `frontend/src/components/EmailBar.tsx`

- [ ] **Step 1: Update CalendarBar.tsx with dark mode**

Apply dark mode to all elements:
- Container: add `dark:` variants to all bg/text/border colors
- Buttons: follow same pattern as Header refresh button
- Status indicators (connected/disconnected): keep green/yellow but add dark variants
- Modal (sync preview): `bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800`
- Modal overlay: `bg-black/60`

- [ ] **Step 2: Update EmailBar.tsx with dark mode**

Same pattern as CalendarBar — add `dark:` variants to all className strings.

- [ ] **Step 3: Verify build**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
cd /Users/imranamindar/Claude_Projects/canvas-dashboard && git add frontend/src/components/CalendarBar.tsx frontend/src/components/EmailBar.tsx && git commit -m "feat: add dark mode to CalendarBar and EmailBar"
```

---

### Task 12: Create Onboarding Wizard

**Files:**
- Create: `frontend/src/hooks/useOnboarding.ts`
- Create: `frontend/src/components/OnboardingWizard.tsx`

- [ ] **Step 1: Create useOnboarding hook**

```typescript
// frontend/src/hooks/useOnboarding.ts
import { useState, useCallback } from "react";

const STORAGE_KEY = "onboarding_complete";

export function useOnboarding() {
  const [complete, setComplete] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true"
  );

  const markComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setComplete(true);
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setComplete(false);
  }, []);

  return { complete, markComplete, reset };
}
```

- [ ] **Step 2: Create OnboardingWizard component**

A 3-step wizard:
1. Welcome screen with "Get Started" button
2. Canvas API token step with "Test Connection" button that hits `/api/canvas/status`
3. Google OAuth step (optional) with "Connect Google" and "Skip" buttons

Design: Full-screen overlay with centered card. Dark mode styling. Step indicator dots at bottom. Back/Next navigation.

```typescript
// frontend/src/components/OnboardingWizard.tsx
import { useState } from "react";
import { api } from "../utils/api";

interface Props {
  onComplete: () => void;
  onAuthorizeGoogle: () => void;
  googleAuthorized: boolean;
}

type Step = "welcome" | "canvas" | "google";

export function OnboardingWizard({ onComplete, onAuthorizeGoogle, googleAuthorized }: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [canvasStatus, setCanvasStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  const testCanvas = async () => {
    setCanvasStatus("testing");
    try {
      const data = await api.get<{ configured: boolean }>("/api/canvas/status");
      setCanvasStatus(data.configured ? "success" : "error");
    } catch {
      setCanvasStatus("error");
    }
  };

  const steps: Step[] = ["welcome", "canvas", "google"];
  const currentIndex = steps.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-zinc-900 shadow-2xl border border-gray-200 dark:border-zinc-800">
        <div className="p-8">
          {step === "welcome" && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <svg className="h-7 w-7 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
                Welcome to Canvas Dashboard
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
                Track your assignments, sync to Google Calendar, and stay on top of your EMBA coursework.
              </p>
              <button
                onClick={() => setStep("canvas")}
                className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          )}

          {step === "canvas" && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                Connect Canvas
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                Your Canvas API token lets the dashboard fetch your assignments.
              </p>
              <ol className="mt-4 space-y-2 text-sm text-gray-600 dark:text-zinc-400 list-decimal pl-5">
                <li>Go to <strong className="text-gray-900 dark:text-zinc-200">Canvas → Account → Settings</strong></li>
                <li>Scroll to <strong className="text-gray-900 dark:text-zinc-200">Approved Integrations</strong> → <strong className="text-gray-900 dark:text-zinc-200">New Access Token</strong></li>
                <li>Set the token as <code className="rounded bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 text-xs">CANVAS_API_TOKEN</code> env var</li>
              </ol>
              <button
                onClick={testCanvas}
                disabled={canvasStatus === "testing"}
                className="mt-4 w-full rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {canvasStatus === "testing" ? "Testing..." :
                 canvasStatus === "success" ? "Connected!" :
                 canvasStatus === "error" ? "Not Connected — Retry" :
                 "Test Connection"}
              </button>
              {canvasStatus === "success" && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Canvas is connected and syncing
                </p>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep("welcome")}
                  className="flex-1 rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("google")}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === "google" && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                Google Calendar & Gmail
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                Optional. Sync assignments to your calendar and extract tasks from EMBA announcement emails.
              </p>
              {googleAuthorized ? (
                <p className="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Google is connected
                </p>
              ) : (
                <button
                  onClick={onAuthorizeGoogle}
                  className="mt-4 w-full rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Connect Google
                </button>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep("canvas")}
                  className="flex-1 rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={onComplete}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  {googleAuthorized ? "Done" : "Skip"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 pb-6">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex ? "w-6 bg-indigo-600" : "w-1.5 bg-gray-300 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
cd /Users/imranamindar/Claude_Projects/canvas-dashboard && git add frontend/src/hooks/useOnboarding.ts frontend/src/components/OnboardingWizard.tsx && git commit -m "feat: add onboarding wizard with 3-step setup flow"
```

---

### Task 13: Redesign WeeklyPlan with Drag-and-Drop

**Files:**
- Modify: `frontend/src/components/WeeklyPlan.tsx`

- [ ] **Step 1: Rewrite WeeklyPlan.tsx with @dnd-kit**

Full rewrite. Keep all existing date calculation utilities (`getWeekDates`, `toISODate`, `DAY_NAMES`, `formatWeekLabel`, `formatDateRange`, `formatRelativeDay`) and the existing Props interface. Replace the rendering and interaction layer with dnd-kit.

The complete component structure:

```typescript
import { useState, useMemo, useCallback } from "react";
import { DndContext, DragOverlay, closestCenter, useSensor, useSensors, PointerSensor, useDroppable, useDraggable } from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Assignment } from "../types";
import { getCourseColor } from "../utils/courseColors";

// ... keep all existing date utility functions (getWeekDates, toISODate, etc.) ...

// --- Inner components ---

function DraggableCard({ assignment, weekDates }: { assignment: Assignment; weekDates: Date[] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(assignment.id),
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  };
  const color = getCourseColor(assignment.course_name);
  const due = assignment.due_at ? new Date(assignment.due_at) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 shadow-sm cursor-grab active:cursor-grabbing"
    >
      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${color.bg} ${color.text} ${color.border} border`}>
        {assignment.course_name.length > 8 ? assignment.course_name.slice(0, 8) + "…" : assignment.course_name}
      </span>
      <p className="mt-1 text-xs font-medium text-gray-800 dark:text-zinc-200 leading-tight line-clamp-2">
        {assignment.name}
      </p>
      {due && (
        <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
          {formatRelativeDay(due, weekDates)}
        </p>
      )}
      {assignment.effort && (
        <span className="mt-0.5 inline-flex items-center rounded bg-gray-100 dark:bg-zinc-700 px-1 py-0.5 text-xs font-medium text-gray-600 dark:text-zinc-400">
          {assignment.effort}
        </span>
      )}
    </div>
  );
}

function DayColumn({ isoDate, dayName, dateNum, isToday, assignments, weekDates }: {
  isoDate: string; dayName: string; dateNum: number; isToday: boolean;
  assignments: Assignment[]; weekDates: Date[];
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `day-${isoDate}` });

  return (
    <div className="flex flex-col gap-2">
      <div className={`rounded-lg px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide ${
        isToday ? "bg-indigo-600 text-white" : "bg-white dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 shadow-sm"
      }`}>
        <div>{dayName}</div>
        <div className={`text-base font-bold ${isToday ? "text-white" : "text-gray-800 dark:text-zinc-200"}`}>
          {dateNum}
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-1.5 min-h-[80px] rounded-lg border-2 border-dashed p-1 transition-colors ${
          isOver ? "border-indigo-400 bg-indigo-500/5" : "border-transparent"
        }`}
      >
        {assignments.map((a) => (
          <DraggableCard key={a.id} assignment={a} weekDates={weekDates} />
        ))}
      </div>
    </div>
  );
}

function UnscheduledSection({ id, title, dateRange, assignments, weekDates }: {
  id: string; title: string; dateRange: string;
  assignments: Assignment[]; weekDates: Date[];
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  if (assignments.length === 0) return null;

  return (
    <div className={`rounded-lg bg-white dark:bg-zinc-900 shadow-sm p-4 mb-4 transition-colors ${
      isOver ? "ring-2 ring-indigo-400" : ""
    }`}>
      <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wide">
        {title} <span className="normal-case font-normal text-gray-400 dark:text-zinc-500">({dateRange})</span> ({assignments.length})
      </h3>
      <div ref={setNodeRef} className="flex flex-col gap-2 min-h-[40px]">
        {assignments.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-md border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-3 py-2">
            <DraggableCard assignment={a} weekDates={weekDates} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

The main `WeeklyPlan` component:

```typescript
export function WeeklyPlan({ assignments, onSetPlannedDay, onSyncCalendar, syncing, viewFilter }: Props) {
  // ... keep existing state: weekOffset, overrides, saving ...
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ... keep all existing date/week calculations (weekDates, byDay, unscheduled*, etc.) ...
  // ... keep existing handleSetDay with optimistic update/rollback ...

  const activeAssignment = useMemo(
    () => activeId ? relevant.find(a => String(a.id) === activeId) ?? null : null,
    [activeId, relevant]
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const assignment = relevant.find(a => String(a.id) === String(active.id));
    if (!assignment) return;
    const overId = String(over.id);
    if (overId.startsWith("day-")) {
      handleSetDay(assignment, overId.replace("day-", ""));
    } else if (overId.startsWith("unscheduled")) {
      handleSetDay(assignment, null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      {/* Week nav bar — same structure, add dark: classes */}
      <div className="mb-4 flex items-center justify-between rounded-lg bg-white dark:bg-zinc-900 px-4 py-3 shadow-sm">
        {/* ... prev/next buttons with dark: classes ... */}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Day columns grid */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {weekDates.map((date, idx) => (
            <DayColumn
              key={toISODate(date)}
              isoDate={toISODate(date)}
              dayName={DAY_NAMES[idx]}
              dateNum={date.getDate()}
              isToday={toISODate(date) === toISODate(new Date())}
              assignments={byDay.get(toISODate(date)) ?? []}
              weekDates={weekDates}
            />
          ))}
        </div>

        {/* Unscheduled sections */}
        <UnscheduledSection
          id="unscheduled-this-week"
          title="Unscheduled — due this week"
          dateRange={formatDateRange(weekStart, weekEnd)}
          assignments={unscheduledThisWeek}
          weekDates={weekDates}
        />
        {/* ... repeat for next week, week 3, week 4 ... */}

        {/* Drag overlay — ghost card follows cursor */}
        <DragOverlay>
          {activeAssignment ? (
            <div className="rounded-md border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-zinc-800 p-2 shadow-lg opacity-80 rotate-2 w-40">
              <p className="text-xs font-medium text-gray-800 dark:text-zinc-200 line-clamp-2">
                {activeAssignment.name}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Sync button — same as before with dark: classes */}
      <div className="flex justify-end">
        <button
          onClick={onSyncCalendar}
          disabled={syncing}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {syncing ? "Syncing..." : "Sync plan to Google Calendar"}
        </button>
      </div>
    </div>
  );
}
```

The implementer should merge these snippets into a complete file, preserving all existing date utility functions from the current WeeklyPlan.tsx (lines 13-68) and the Props interface (lines 5-11), the week calculation logic (lines 71-181), and the `handleSetDay` function (lines 183-207).

- [ ] **Step 2: Verify build**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npx tsc --noEmit`

- [ ] **Step 3: Verify the existing tests still pass**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npm test`

- [ ] **Step 4: Commit**

```bash
cd /Users/imranamindar/Claude_Projects/canvas-dashboard && git add frontend/src/components/WeeklyPlan.tsx && git commit -m "feat: rebuild WeeklyPlan with drag-and-drop via @dnd-kit"
```

---

### Task 14: Update App.tsx — Dark Mode Shell & Wire Onboarding

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update App.tsx**

Changes:
1. Import `useTheme` and pass `theme`/`toggle` to Header
2. Import `useOnboarding` and `OnboardingWizard`
3. Show `OnboardingWizard` when `!onboarding.complete`
4. Update the root `<div>`: `min-h-screen bg-gray-50` → `min-h-screen bg-gray-50 dark:bg-zinc-950`
5. All inline button/text styles get `dark:` variants:
   - View filter buttons (All / Due Today / This Week): active `bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900`, inactive `bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300`
   - Dashboard/Weekly Plan toggle: active `bg-indigo-600`, inactive same as view filter
   - "Show completed" checkbox label: `text-gray-600 dark:text-zinc-400`
   - Group by buttons: same pattern as view filters
   - Error banner: `bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400`
   - Undo toast: `bg-gray-900 dark:bg-zinc-800`
6. Main content area: `bg-white dark:bg-zinc-900 shadow-sm` (the card wrapping AssignmentTable)
7. Pass `theme` and `onToggle` to Header (update Header Props accordingly)
8. Pass `onResetOnboarding` callback to Header for settings (so user can re-run wizard)

- [ ] **Step 2: Update Header Props to accept theme toggle**

If not already done in Task 6, update Header's Props interface:
```typescript
interface Props {
  health: HealthStatus | null;
  loading: boolean;
  onRefresh: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onResetOnboarding?: () => void;
}
```

- [ ] **Step 3: Verify full build**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npx tsc --noEmit && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Verify tests pass**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npm test`
Expected: All existing tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/imranamindar/Claude_Projects/canvas-dashboard && git add frontend/src/App.tsx frontend/src/components/Header.tsx && git commit -m "feat: wire dark mode and onboarding wizard into App shell"
```

---

### Task 15: Final Build Verification & Cleanup

**Files:**
- All modified files from Tasks 1-14

- [ ] **Step 1: Run full build**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Run all tests**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npm test`
Expected: All tests pass.

- [ ] **Step 3: Run linter**

Run: `cd /Users/imranamindar/Claude_Projects/canvas-dashboard/frontend && npm run lint`
Expected: No lint errors.

- [ ] **Step 4: Fix any issues found in steps 1-3**

Address any TypeScript errors, test failures, or lint issues.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
cd /Users/imranamindar/Claude_Projects/canvas-dashboard && git add -A frontend/ && git commit -m "fix: resolve Phase 1 build/lint issues"
```
