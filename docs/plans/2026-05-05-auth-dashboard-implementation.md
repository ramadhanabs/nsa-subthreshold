# Auth + Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add frontend authentication (login/register), auth context, and a user dashboard with profile, test tracker, and Intervals.icu connection.

**Architecture:** Backend migration to replace calculator_results with test_results. New TestService + routes. Frontend AuthContext with JWT in localStorage. Login/register pages. Dashboard page with sections from the HTML mockups. Nav updated to show auth state.

**Tech Stack:** React, TypeScript, Tailwind, shadcn/ui, Effect-TS (backend), Bun, SQLite

---

### Task 1: Backend — migration + test_results service

**Files:**
- Create: `backend/src/migrations/002_test_results.ts`
- Modify: `backend/src/migrations/index.ts`
- Create: `backend/src/services/TestResults.ts`
- Create: `backend/src/services/TestResults.test.ts`
- Remove references to: Calculator service/routes

**Step 1: Create migration `backend/src/migrations/002_test_results.ts`**

```ts
import type { Database } from "bun:sqlite"

export function up(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_results (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      test_type TEXT NOT NULL,
      test_date TEXT NOT NULL,
      value_a INTEGER NOT NULL,
      value_b INTEGER NOT NULL,
      max_hr INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    DROP TABLE IF EXISTS calculator_results;
  `)
}
```

**Step 2: Register migration in `backend/src/migrations/index.ts`**

Add `import { up as migration002 } from "./002_test_results"` and add to the migrations array.

**Step 3: Create `backend/src/services/TestResults.ts`**

```ts
interface TestResult {
  id: string
  user_id: string
  test_type: string    // "5k" or "20min"
  test_date: string    // YYYY-MM-DD
  value_a: number      // 5k: minutes, 20min: km whole part
  value_b: number      // 5k: seconds, 20min: km decimals
  max_hr: number | null
  notes: string | null
  created_at: string
}
```

Service methods:
- `save(userId, data)` — INSERT and return created row
- `list(userId)` — SELECT ordered by test_date DESC
- `remove(userId, id)` — DELETE WHERE user_id = ? AND id = ?, return boolean

**Step 4: Create test file `backend/src/services/TestResults.test.ts`**

Follow the same pattern as Auth.test.ts (in-memory SQLite, apply BOTH migrations). Tests:
1. save returns a TestResult with correct fields
2. list returns results ordered by test_date DESC
3. list only returns the user's own results
4. remove deletes the correct result
5. remove returns false for non-existent id

**Step 5: Add routes to `backend/src/server.ts`**

- `POST /api/tests` — body: { test_type, test_date, value_a, value_b, max_hr?, notes? }
- `GET /api/tests` — list user's test results
- `DELETE /api/tests/:id` — delete a test result

Remove the calculator routes (`/api/calculator` and `/api/calculator/:id`).

**Step 6: Update `backend/src/index.ts`**

Replace CalculatorServiceLive with TestResultsServiceLive in layers. Remove Calculator imports.

**Step 7: Run tests**

```bash
cd backend && bun test
```

Remove `Calculator.test.ts` since the table no longer exists. All remaining tests should pass.

**Step 8: Commit**

```bash
git add backend/
git commit -m "feat: replace calculator_results with test_results, add test tracker API"
```

---

### Task 2: Frontend — AuthContext + API helper

**Files:**
- Create: `src/lib/auth-context.tsx`
- Create: `src/lib/api.ts`

**Step 1: Create API helper `src/lib/api.ts`**

Simple fetch wrapper that:
- Prepends the base URL (`/api` in production, `http://localhost:3002/api` in dev)
- Adds `Authorization: Bearer <token>` if token exists in localStorage
- Adds `Content-Type: application/json` for POST/PUT
- Throws on non-OK responses with the error message from JSON body

```ts
const BASE = import.meta.env.DEV ? "http://localhost:3002" : ""

export async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("nsa-token")
  const headers: Record<string, string> = {
    ...(options?.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers: { ...headers, ...options?.headers } })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(data.error || "Request failed")
  }
  return res.json()
}
```

**Step 2: Create AuthContext `src/lib/auth-context.tsx`**

```tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { apiFetch } from "./api"

interface User { id: string; email: string }

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}
```

Provider:
- On mount: read `nsa-token` from localStorage → call `GET /api/auth/me` → set user or clear token
- `login`: POST /api/auth/login → save token to localStorage → set user
- `register`: POST /api/auth/register → save token → set user
- `logout`: remove token from localStorage → set user to null
- `isLoading`: true while initial token validation is in progress

**Step 3: Wrap app in AuthProvider**

Update `src/main.tsx` to wrap everything in `<AuthProvider>`.

**Step 4: Verify build**

```bash
pnpm build
```

**Step 5: Commit**

```bash
git add src/lib/auth-context.tsx src/lib/api.ts src/main.tsx
git commit -m "feat: add AuthContext and API helper"
```

---

### Task 3: Frontend — Login + Register pages

**Files:**
- Create: `src/pages/login.tsx`
- Create: `src/pages/register.tsx`
- Modify: `src/main.tsx` (add routes)

**Step 1: Create login page `src/pages/login.tsx`**

- Container: `max-w-[400px] mx-auto px-5 py-12`
- Title: "Sign in"
- Form: email input, password input, submit button (shadcn Input + Button)
- Error display below form
- "Don't have an account? Register" link to `/register`
- On submit: call `useAuth().login(email, password)` → redirect to `redirect` query param or `/dashboard`
- Use `useSearchParams` to read redirect param

**Step 2: Create register page `src/pages/register.tsx`**

- Same layout
- Title: "Create account"
- Form: email, password, confirm password
- Client-side validation: passwords must match, min 6 chars
- "Already have an account? Sign in" link to `/login`
- On submit: call `useAuth().register(email, password)` → redirect to `/dashboard`

**Step 3: Add routes in `src/main.tsx`**

```tsx
import LoginPage from "./pages/login"
import RegisterPage from "./pages/register"

<Route path="/login" element={<LoginPage />} />
<Route path="/register" element={<RegisterPage />} />
```

**Step 4: Verify build**

```bash
pnpm build
```

**Step 5: Commit**

```bash
git add src/pages/login.tsx src/pages/register.tsx src/main.tsx
git commit -m "feat: add login and register pages"
```

---

### Task 4: Frontend — Nav auth state

**Files:**
- Modify: `src/components/nav.tsx`

**Step 1: Update nav to show auth state**

Read `src/components/nav.tsx` first. Update it:

- Import `useAuth` from auth-context
- When NOT logged in: show "Login" link after Calculator/Planner links
- When logged in: show user initials avatar (colored circle with first letter of email) on the right side, replacing the "Login" link. On click, show a simple dropdown with:
  - "Dashboard" link
  - "Logout" button

Use a simple `useState` for dropdown open/close. Close on click outside.

The dark mode toggle stays in its current position.

**Step 2: Verify build**

```bash
pnpm build
```

**Step 3: Commit**

```bash
git add src/components/nav.tsx
git commit -m "feat: update nav with auth state and user menu"
```

---

### Task 5: Frontend — Dashboard page (profile + zones + this week)

**Files:**
- Create: `src/pages/dashboard.tsx`
- Modify: `src/main.tsx` (add route)

**Step 1: Create dashboard page**

Protected page — if not logged in, redirect to `/login?redirect=/dashboard`.

Read the mockup at `/Users/mac/Downloads/nsa_user_profile_dashboard_mockup.html` for the layout reference. Convert to React/Tailwind matching the app's monochromatic design system.

Sections (implement top 3 in this task):

**Profile header** — avatar initials circle (bg-emerald-600), email, "Member since" date. Edit profile button (placeholder).

**Athlete parameters + Training zones** — 2-column grid:
- Left: 4 stat cards (5K PB, threshold pace, max HR, LTHR) from latest test result. If no tests, show "—" with "Take your first test" prompt.
- Right: training zone rows (Easy, Sub-threshold, LTHR ceiling) with pace + HR ranges. Derived from latest test + stored max HR.
- "Last re-test" date from latest test_results entry.

Fetch data: `GET /api/tests` on mount → use latest entry to derive all values using the same calculator functions from `src/lib/calculator.ts` (`get5kPace`, `getHR`, `getPaceZones`).

**This week** — compact 7-day grid. For now show placeholder data or load from saved planner (`GET /api/planner` → latest). Show E/Q/LR pills with session colors. Ratio bar underneath.

**Step 2: Add route + protect**

```tsx
import DashboardPage from "./pages/dashboard"
<Route path="/dashboard" element={<DashboardPage />} />
```

**Step 3: Verify build**

```bash
pnpm build
```

**Step 4: Commit**

```bash
git add src/pages/dashboard.tsx src/main.tsx
git commit -m "feat: add dashboard page with profile, zones, and weekly view"
```

---

### Task 6: Frontend — Test tracker component

**Files:**
- Create: `src/components/test-tracker.tsx`
- Modify: `src/pages/dashboard.tsx` (embed it)

**Step 1: Create test tracker**

Read the mockup at `/Users/mac/Downloads/nsa_dual_test_progress_tracker.html` for the full layout. Convert to React/Tailwind.

**Tabbed view** — "5K time trial" and "20-minute test" tabs using shadcn Button for tab styling.

**Per tab:**
- **Metrics row** (4 cards): latest result, threshold pace, CV/est threshold, improvement delta. Derive from test history.
- **Record form**: date input, time inputs (mm:ss for 5K, km for 20min), Add button. On submit → `POST /api/tests` → refresh list.
- **History table**: date, result, derived paces, delta from previous, delete button. On delete → `DELETE /api/tests/:id` → refresh.

Skip the Chart.js progress chart for now — implement as a follow-up. Just the metrics, form, and table.

State: fetch `GET /api/tests` on mount, filter by test_type for each tab.

**Step 2: Embed in dashboard**

Add `<TestTracker />` as a section in the dashboard, after the zones section.

**Step 3: Verify build**

```bash
pnpm build
```

**Step 4: Commit**

```bash
git add src/components/test-tracker.tsx src/pages/dashboard.tsx
git commit -m "feat: add test tracker with 5K and 20-min tabs"
```

---

### Task 7: Frontend — Progress cards + quick actions + Intervals.icu

**Files:**
- Modify: `src/pages/dashboard.tsx`

**Step 1: Add progress cards section**

4 stat cards: CTL, resting HR, week streak, phase. If Intervals.icu connected, show real data from `GET /api/wellness`. If not connected, show placeholder with "Connect Intervals.icu" prompt.

**Step 2: Add quick actions section**

Buttons linking to:
- Plan next week → `/planner`
- Pace calculator → `/calculator`
- Re-test threshold → scrolls to test tracker section

**Step 3: Add Intervals.icu section**

- If not connected: form with athlete_id + api_key inputs, Connect button → `POST /api/intervals/connect`
- If connected: show athlete ID, "Sync wellness" button → `POST /api/intervals/sync`, last sync date

Check connection status from the user object (need to extend `/api/auth/me` to return `intervals_icu_athlete_id`).

**Step 4: Verify build**

```bash
pnpm build
```

**Step 5: Commit**

```bash
git add src/pages/dashboard.tsx
git commit -m "feat: add progress cards, quick actions, and Intervals.icu section"
```

---

### Task 8: Polish and deploy

**Files:**
- Various

**Step 1: Run all checks**

```bash
cd backend && bun test
cd .. && pnpm vitest run && pnpm lint && pnpm tsc --noEmit && pnpm build
```

**Step 2: Update /api/auth/me to include Intervals.icu status**

Modify the `me` endpoint in `backend/src/server.ts` to return `intervals_icu_connected: boolean` and `intervals_icu_athlete_id` (if connected).

**Step 3: Deploy**

```bash
# Backend
rsync -avz --exclude node_modules --exclude nsa.db --exclude .env backend/ dev@lab:~/nsa-backend/
ssh dev@lab "cd ~/nsa-backend && bun install && sudo systemctl restart nsa-backend"

# Frontend
pnpm build && rsync -avz --delete dist/ dev@lab:~/nsa-subthreshold/
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: polish auth + dashboard, deploy"
```
