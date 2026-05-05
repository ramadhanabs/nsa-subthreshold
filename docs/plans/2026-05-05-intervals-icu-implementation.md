# Intervals.icu Deep Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add activities sync from Intervals.icu, activities display on dashboard, and workout export from the Planner to Intervals.icu calendar.

**Architecture:** New migration for activities table. New ActivitiesService for read, new WorkoutExportService for write. Frontend adds activities section to dashboard with date range picker, and export button to planner.

**Tech Stack:** Bun, Effect-TS, SQLite (backend), React, TypeScript, Tailwind, shadcn/ui (frontend)

---

### Task 1: Backend — activities migration + service

**Files:**
- Create: `backend/src/migrations/003_activities.ts`
- Modify: `backend/src/migrations/index.ts`
- Create: `backend/src/services/Activities.ts`
- Create: `backend/src/services/Activities.test.ts`

**Step 1: Create migration `backend/src/migrations/003_activities.ts`**

```ts
import type { Database } from "bun:sqlite"

export function up(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      intervals_id TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'Run',
      name TEXT,
      distance_m REAL,
      duration_secs REAL,
      avg_pace REAL,
      avg_hr REAL,
      moving_time REAL,
      synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, intervals_id)
    );
  `)
}
```

Register in `backend/src/migrations/index.ts`.

**Step 2: Create ActivitiesService**

`backend/src/services/Activities.ts`:

```ts
interface Activity {
  id: string
  user_id: string
  intervals_id: string
  date: string
  type: string
  name: string | null
  distance_m: number | null
  duration_secs: number | null
  avg_pace: number | null
  avg_hr: number | null
  moving_time: number | null
  synced_at: string
}
```

Methods:
- `sync(userId, from, to)` — get user's Intervals.icu credentials from DB. Fetch `GET /api/v1/athlete/{id}/activities?oldest={from}&newest={to}`. Map fields: `id` → intervals_id, `start_date_local` → date, `type`, `name`, `distance` → distance_m, `elapsed_time` → duration_secs, convert `average_speed` (m/s) to avg_pace (sec/km) via `1000 / speed`, `average_heartrate` → avg_hr, `moving_time`. Upsert with `INSERT OR REPLACE`. Return count.
- `list(userId, from?, to?)` — SELECT with optional date range, ORDER BY date DESC

**Step 3: Write tests `backend/src/services/Activities.test.ts`**

Follow Auth.test.ts pattern with in-memory SQLite, all 3 migrations. Tests:
1. list returns empty for user with no activities
2. list returns activities ordered by date DESC
3. list filters by date range
4. list only returns user's own activities

(Cannot test sync without real API — skip that.)

**Step 4: Add routes to `backend/src/server.ts`**

- `POST /api/activities/sync` — body: `{ from, to }`, requires auth. Call ActivitiesService.sync, return `{ synced: count }`
- `GET /api/activities` — query: `?from=&to=`, requires auth. Call ActivitiesService.list

**Step 5: Update `backend/src/index.ts`**

Add ActivitiesServiceLive to layers.

**Step 6: Run tests**

```bash
cd backend && bun test
```

**Step 7: Commit**

```bash
git add backend/
git commit -m "feat: add activities sync and list from Intervals.icu"
```

---

### Task 2: Backend — workout export service

**Files:**
- Create: `backend/src/services/WorkoutExport.ts`
- Modify: `backend/src/server.ts`
- Modify: `backend/src/index.ts`

**Step 1: Create WorkoutExportService**

`backend/src/services/WorkoutExport.ts`:

Read `src/lib/planner-data.ts` from the frontend to understand the `DaySlotData` shape. The backend receives:
```ts
interface ExportRequest {
  week_data: Array<{
    day: string
    type: "quality" | "easy" | "long" | "rest" | null
    template: { name: string; reps: number; dur: number; rest: number; vol: number } | null
  }>
  start_date: string  // YYYY-MM-DD (Monday of the target week)
  default_wu: number
  default_cd: number
}
```

Methods:
- `exportWeek(userId, request)` — for each day with a type (skip rest and null):
  - Calculate the date: startDate + dayIndex
  - Build event name and description
  - POST to `https://intervals.icu/api/v1/athlete/{id}/events`
  - Body: `{ start_date_local, category: "WORKOUT", name, description, type: "Run" }`
  - Return count of events created

Event name mapping:
- quality: `"NSA: {template.name} sub-T"`
- easy: `"Easy run"`
- long: `"Long run"`

Event description for quality:
```
WU {wu}min easy pace
{reps}×{dur}min @ sub-threshold ({rest}s rest)
CD {cd}min easy pace
Total: ~{total}min
```

For easy: `"Easy run ~{duration}min below 70% max HR"`
For long: `"Long run ~{duration}min easy pace"`

**Step 2: Add route to `backend/src/server.ts`**

- `POST /api/intervals/export` — body: ExportRequest, requires auth. Call WorkoutExportService.exportWeek, return `{ exported: count }`

**Step 3: Update `backend/src/index.ts`**

Add WorkoutExportServiceLive to layers.

**Step 4: Commit**

```bash
git add backend/
git commit -m "feat: add workout export to Intervals.icu"
```

---

### Task 3: Frontend — activities section on dashboard

**Files:**
- Create: `src/components/activities-list.tsx`
- Modify: `src/pages/dashboard.tsx`

**Step 1: Create ActivitiesList component**

`src/components/activities-list.tsx`:

Props:
```ts
interface ActivitiesListProps {
  connected: boolean
  onSync: (from: string, to: string) => Promise<void>
}
```

Layout:
- Title: "Activities" with monochrome icon (Activity from lucide-react)
- Date range: 3 preset buttons (7d, 30d, 90d) using shadcn Button
- "Sync" button that calls onSync with the selected range
- Table: date, name, distance (km), duration (mm:ss), pace (/km), avg HR
- Empty state when no data or not connected
- Loading state while syncing

Fetch activities: call `apiFetch<Activity[]>("/api/activities?from=...&to=...")` on mount and when range changes.

Format helpers:
- distance: `(m / 1000).toFixed(1)` km
- duration: `Math.floor(secs/3600) > 0 ? h:mm:ss : mm:ss`
- pace: `fmtPace(secPerKm)`

**Step 2: Embed in dashboard**

Add after the Progress section, before Test tracker. Only show when intervals is connected.

**Step 3: Verify build**

```bash
pnpm build
```

**Step 4: Commit**

```bash
git add src/components/activities-list.tsx src/pages/dashboard.tsx
git commit -m "feat: add activities list to dashboard"
```

---

### Task 4: Frontend — export button in planner

**Files:**
- Modify: `src/components/planner/weekly-summary.tsx` or `src/pages/planner.tsx`

**Step 1: Add export button**

In the WeeklySummary component (or planner page), add an "Export to Intervals.icu" button:
- Only visible when user is logged in AND connected to Intervals.icu
- Use `useAuth()` to check login state
- On click: show a confirmation with a date picker for the week start date (Monday)
- Can use a simple dialog or inline UI
- Call `POST /api/intervals/export` with `{ week_data, start_date, default_wu, default_cd }`
- Show success: "Exported X workouts to Intervals.icu"
- Show error if fails

The button needs access to the current week data and WU/CD settings. These live in the planner page state. So add the button in `planner.tsx` and pass the data.

Use shadcn Dialog for the confirmation:
- Title: "Export to Intervals.icu"
- Date picker for week start (Monday)
- Preview of what will be exported (list of day → workout name)
- Export button + cancel

**Step 2: Verify build**

```bash
pnpm build
```

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: add export to Intervals.icu from planner"
```

---

### Task 5: Polish and deploy

**Files:**
- Various

**Step 1: Run all checks**

```bash
cd backend && bun test
cd .. && pnpm vitest run && pnpm lint && pnpm tsc --noEmit && pnpm build
```

**Step 2: Deploy**

```bash
# Backend
rsync -avz --exclude node_modules --exclude nsa.db --exclude .env backend/ dev@lab:~/nsa-backend/
ssh dev@lab "cd ~/nsa-backend && bun install && sudo systemctl restart nsa-backend"

# Frontend
pnpm build && rsync -avz --delete dist/ dev@lab:~/nsa-subthreshold/
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: polish Intervals.icu integration, deploy"
```
