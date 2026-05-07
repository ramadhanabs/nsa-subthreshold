# NSA Block Generator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a 5-step wizard UI at `/block-generator` that creates a 4-week NSA training block with assessment, week-by-week planning, review, and push to Intervals.icu.

**Architecture:** Single-page wizard with `BlockWizardProvider` context. Backend adds migration for `nsa_blocks` + `nsa_block_events` tables, a `BlockService` for CRUD, and an assessment endpoint that fetches fresh data from Intervals.icu. Frontend reuses existing planner components (`WeekGrid`, `QualityPalette`, `DaySlot`) for week building.

**Tech Stack:** React + TypeScript + Tailwind/shadcn (frontend), Bun + Effect-TS + SQLite (backend), Intervals.icu REST API (external)

**Design doc:** `docs/plans/2026-05-07-block-generator-design.md`

---

## Task 1: Database Migration — nsa_blocks + nsa_block_events

**Files:**
- Create: `backend/src/migrations/004_blocks.ts`
- Modify: `backend/src/migrations/index.ts`

**Step 1: Create the migration file**

```typescript
// backend/src/migrations/004_blocks.ts
import type { Database } from "bun:sqlite"

export function up(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nsa_blocks (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id),
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
      status        TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'confirmed', 'pushed', 'completed')),
      start_date    TEXT NOT NULL,
      end_date      TEXT NOT NULL,
      block_type    TEXT NOT NULL DEFAULT 'nsa_4week',
      assessment    TEXT NOT NULL,
      weeks         TEXT NOT NULL,
      icu_sync      TEXT,
      results       TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_nsa_blocks_user   ON nsa_blocks(user_id);
    CREATE INDEX IF NOT EXISTS idx_nsa_blocks_status ON nsa_blocks(status);
    CREATE INDEX IF NOT EXISTS idx_nsa_blocks_start  ON nsa_blocks(start_date);

    CREATE TABLE IF NOT EXISTS nsa_block_events (
      id                TEXT PRIMARY KEY,
      block_id          TEXT NOT NULL REFERENCES nsa_blocks(id) ON DELETE CASCADE,
      date              TEXT NOT NULL,
      week_number       INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 4),
      workout_type      TEXT NOT NULL,
      name              TEXT NOT NULL,
      duration_minutes  INTEGER,
      distance_meters   INTEGER,
      workout_doc       TEXT,
      icu_event_id      TEXT,
      notes             TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_block_events_block ON nsa_block_events(block_id);
    CREATE INDEX IF NOT EXISTS idx_block_events_date  ON nsa_block_events(date);
  `)
}
```

**Step 2: Register migration in index.ts**

In `backend/src/migrations/index.ts`, add:
```typescript
import { up as migration004 } from "./004_blocks"
```
And append to the `migrations` array:
```typescript
{ name: "004_blocks", up: migration004 },
```

**Step 3: Verify migration runs**

Run: `cd backend && bun run dev`
Expected: console output `Migration applied: 004_blocks`

**Step 4: Commit**

```bash
git add backend/src/migrations/004_blocks.ts backend/src/migrations/index.ts
git commit -m "feat: add nsa_blocks and nsa_block_events migration"
```

---

## Task 2: BlockService — Backend CRUD

**Files:**
- Create: `backend/src/services/Block.ts`
- Create: `backend/src/services/Block.test.ts`
- Modify: `backend/src/server.ts` (inject service, add later in Task 4)

**Step 1: Write tests for BlockService**

```typescript
// backend/src/services/Block.test.ts
import { describe, it, expect } from "bun:test"

// Test the block service functions:
// - save: creates block + events, returns block with id
// - list: returns all blocks for a user
// - getById: returns single block with events
// - updateStatus: updates block status
// - delete: removes block and cascaded events

// Use the same test setup pattern as Planner.test.ts
```

Write tests covering:
1. `save` — creates a block row + event rows, returns the block
2. `list` — returns blocks for a user (not other users' blocks)
3. `getById` — returns block with nested events
4. `updateStatus` — changes status and updated_at
5. `setSyncData` — stores icu_sync JSON after push
6. `delete` — removes block (events cascade)

**Step 2: Implement BlockService**

Follow the `PlannerService` pattern in `backend/src/services/Planner.ts`:

```typescript
// backend/src/services/Block.ts
import { Context, Effect, Layer } from "effect"
import { DatabaseService } from "./Database"

interface BlockRow {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  status: string
  start_date: string
  end_date: string
  block_type: string
  assessment: string  // JSON
  weeks: string       // JSON
  icu_sync: string | null
  results: string | null
}

interface BlockEventRow {
  id: string
  block_id: string
  date: string
  week_number: number
  workout_type: string
  name: string
  duration_minutes: number | null
  distance_meters: number | null
  workout_doc: string | null
  icu_event_id: string | null
  notes: string | null
}

interface SaveBlockRequest {
  start_date: string
  end_date: string
  status: string
  assessment: object
  weeks: object
  events: Array<{
    date: string
    week_number: number
    workout_type: string
    name: string
    duration_minutes?: number
    distance_meters?: number
    workout_doc?: object
    notes?: string
  }>
}

export class BlockService extends Context.Tag("BlockService")<
  BlockService,
  {
    readonly save: (userId: string, data: SaveBlockRequest) => Effect.Effect<BlockRow>
    readonly list: (userId: string) => Effect.Effect<BlockRow[]>
    readonly getById: (userId: string, id: string) => Effect.Effect<{ block: BlockRow; events: BlockEventRow[] } | undefined>
    readonly updateStatus: (userId: string, id: string, status: string) => Effect.Effect<BlockRow | undefined>
    readonly setSyncData: (userId: string, id: string, syncData: object) => Effect.Effect<BlockRow | undefined>
    readonly delete: (userId: string, id: string) => Effect.Effect<boolean>
  }
>() {}

export const BlockServiceLive = Layer.effect(
  BlockService,
  Effect.gen(function* () {
    const db = yield* DatabaseService
    return {
      save: (userId, data) =>
        Effect.gen(function* () {
          const id = crypto.randomUUID()
          yield* db.run(
            `INSERT INTO nsa_blocks (id, user_id, status, start_date, end_date, assessment, weeks)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, userId, data.status, data.start_date, data.end_date,
             JSON.stringify(data.assessment), JSON.stringify(data.weeks)]
          )
          for (const ev of data.events) {
            yield* db.run(
              `INSERT INTO nsa_block_events (id, block_id, date, week_number, workout_type, name, duration_minutes, distance_meters, workout_doc, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [crypto.randomUUID(), id, ev.date, ev.week_number, ev.workout_type, ev.name,
               ev.duration_minutes ?? null, ev.distance_meters ?? null,
               ev.workout_doc ? JSON.stringify(ev.workout_doc) : null, ev.notes ?? null]
            )
          }
          const row = yield* db.get<BlockRow>("SELECT * FROM nsa_blocks WHERE id = ?", [id])
          return row!
        }),

      list: (userId) =>
        db.all<BlockRow>("SELECT * FROM nsa_blocks WHERE user_id = ? ORDER BY created_at DESC", [userId]),

      getById: (userId, id) =>
        Effect.gen(function* () {
          const block = yield* db.get<BlockRow>(
            "SELECT * FROM nsa_blocks WHERE id = ? AND user_id = ?", [id, userId]
          )
          if (!block) return undefined
          const events = yield* db.all<BlockEventRow>(
            "SELECT * FROM nsa_block_events WHERE block_id = ? ORDER BY date", [id]
          )
          return { block, events }
        }),

      updateStatus: (userId, id, status) =>
        Effect.gen(function* () {
          yield* db.run(
            `UPDATE nsa_blocks SET status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
            [status, id, userId]
          )
          return yield* db.get<BlockRow>("SELECT * FROM nsa_blocks WHERE id = ? AND user_id = ?", [id, userId])
        }),

      setSyncData: (userId, id, syncData) =>
        Effect.gen(function* () {
          yield* db.run(
            `UPDATE nsa_blocks SET icu_sync = ?, status = 'pushed', updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
            [JSON.stringify(syncData), id, userId]
          )
          return yield* db.get<BlockRow>("SELECT * FROM nsa_blocks WHERE id = ? AND user_id = ?", [id, userId])
        }),

      delete: (userId, id) =>
        Effect.gen(function* () {
          yield* db.run("DELETE FROM nsa_blocks WHERE id = ? AND user_id = ?", [id, userId])
          return true
        }),
    }
  })
)
```

**Step 3: Run tests**

Run: `cd backend && bun test src/services/Block.test.ts`
Expected: all tests pass

**Step 4: Commit**

```bash
git add backend/src/services/Block.ts backend/src/services/Block.test.ts
git commit -m "feat: add BlockService for nsa_blocks CRUD"
```

---

## Task 3: Assessment Logic — Backend

**Files:**
- Create: `backend/src/services/Assessment.ts`
- Create: `backend/src/services/Assessment.test.ts`

The assessment endpoint fetches fresh data from Intervals.icu and computes readiness.

**Step 1: Write tests for assessment logic**

Test the pure computation functions (not the API fetch):
1. `computeReadiness` — given activities + wellness data, returns readiness checks
2. Weekly frequency calculation (count runs / 8 weeks)
3. Volume CV calculation (std dev / mean of weekly volumes)
4. CTL trend detection (rising/stable/declining)
5. Gap detection (>7 days without activity)
6. Integration with `assessEligibility` for Q session capacity

**Step 2: Implement AssessmentService**

```typescript
// backend/src/services/Assessment.ts
import { Context, Effect, Layer } from "effect"
import { DatabaseService } from "./Database"

// Pure functions for readiness computation
export function computeWeeklyVolumes(activities: Activity[], weeks: number): number[] {
  // Group activities into ISO weeks, return array of weekly total minutes
}

export function computeCV(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const stdDev = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length)
  return (stdDev / mean) * 100
}

export function detectCTLTrend(wellnessData: WellnessRow[]): "rising" | "stable" | "declining" {
  // Compare CTL from first half vs second half of the window
}

export function detectGaps(activities: Activity[]): number {
  // Return max consecutive days without an activity in last 4 weeks
}

export function computeReadiness(
  activities: Activity[],
  wellness: WellnessRow[],
): AssessmentResult {
  // 1. Compute weekly volumes from activities (last 8 weeks)
  // 2. Compute baseline using calcBaseline formula (42-day total / 42 * 7)
  // 3. Run assessEligibility for tier + Q sessions
  // 4. Run readiness checks: frequency, CV, min volume, CTL trend, TSB, gaps
  // 5. Combine into AssessmentResult
}
```

The `AssessmentService` itself handles the Intervals.icu API fetch:

```typescript
export class AssessmentService extends Context.Tag("AssessmentService")<
  AssessmentService,
  {
    readonly assess: (userId: string) => Effect.Effect<AssessmentResult, Error>
  }
>() {}
```

The `assess` method:
1. Gets user's Intervals.icu credentials from DB
2. Fetches `GET /api/v1/athlete/{id}/activities?oldest=YYYY-MM-DD&newest=YYYY-MM-DD` (last 8 weeks)
3. Fetches `GET /api/v1/athlete/{id}/wellness?oldest=YYYY-MM-DD&newest=YYYY-MM-DD` (last 4 weeks)
4. Calls `computeReadiness()` with the fetched data
5. Returns `AssessmentResult`

**Step 3: Run tests**

Run: `cd backend && bun test src/services/Assessment.test.ts`
Expected: all pure function tests pass

**Step 4: Commit**

```bash
git add backend/src/services/Assessment.ts backend/src/services/Assessment.test.ts
git commit -m "feat: add AssessmentService with readiness computation"
```

---

## Task 4: Backend Routes — Block API

**Files:**
- Modify: `backend/src/server.ts`

**Step 1: Inject services**

At the top of `startServer` Effect.gen (around line 50), add:
```typescript
const blocks = yield* BlockService
const assessment = yield* AssessmentService
```

**Step 2: Add assessment route**

```typescript
// POST /api/block/assess
if (req.method === "POST" && pathname === "/api/block/assess") {
  const authResult = await requireAuth(req, auth, origin)
  if ("error" in authResult) return authResult.error
  const result = await Effect.runPromise(assessment.assess(authResult.user.id))
  return jsonResponse(result, origin)
}
```

**Step 3: Add block CRUD routes**

```typescript
// POST /api/block — save block
if (req.method === "POST" && pathname === "/api/block") {
  const authResult = await requireAuth(req, auth, origin)
  if ("error" in authResult) return authResult.error
  const body = (await req.json()) as any
  const result = await Effect.runPromise(blocks.save(authResult.user.id, body))
  return jsonResponse(result, origin, 201)
}

// GET /api/block or /api/block/:id
if (req.method === "GET" && pathname.startsWith("/api/block")) {
  const authResult = await requireAuth(req, auth, origin)
  if ("error" in authResult) return authResult.error
  const idSegment = pathname.slice("/api/block".length)
  if (idSegment && idSegment !== "/") {
    const id = idSegment.startsWith("/") ? idSegment.slice(1) : idSegment
    const result = await Effect.runPromise(blocks.getById(authResult.user.id, id))
    if (!result) return errorResponse("Not found", 404, origin)
    return jsonResponse(result, origin)
  }
  const results = await Effect.runPromise(blocks.list(authResult.user.id))
  return jsonResponse(results, origin)
}

// POST /api/block/:id/push — push to Intervals.icu
if (req.method === "POST" && pathname.match(/^\/api\/block\/[^/]+\/push$/)) {
  const authResult = await requireAuth(req, auth, origin)
  if ("error" in authResult) return authResult.error
  const id = pathname.split("/")[3]
  // Push logic: get block, iterate events, call Intervals.icu add_or_update_event
  // Update block with setSyncData
  // Return updated block
}

// DELETE /api/block/:id
if (req.method === "DELETE" && pathname.startsWith("/api/block/")) {
  const authResult = await requireAuth(req, auth, origin)
  if ("error" in authResult) return authResult.error
  const id = pathname.slice("/api/block/".length)
  await Effect.runPromise(blocks.delete(authResult.user.id, id))
  return jsonResponse({ ok: true }, origin)
}
```

**Step 4: Add service layers to the main program**

In the Layer composition at the bottom of `server.ts`, add `BlockServiceLive` and `AssessmentServiceLive`.

**Step 5: Test manually**

Run: `cd backend && bun run dev`
Test: `curl -X POST http://localhost:3002/api/block/assess -H "Authorization: Bearer <token>"`
Expected: 200 with AssessmentResult JSON

**Step 6: Commit**

```bash
git add backend/src/server.ts
git commit -m "feat: add block API routes (assess, CRUD, push)"
```

---

## Task 5: Test Workout Templates

**Files:**
- Modify: `src/lib/planner-data.ts`
- Modify: `src/lib/planner-data.test.ts`

**Step 1: Write failing tests**

Add to `planner-data.test.ts`:
```typescript
describe("test workout templates", () => {
  it("has test templates with correct structure", () => {
    expect(Q_TEMPLATES.test).toHaveLength(2)
    expect(Q_TEMPLATES.test[0].id).toBe("t1")
    expect(Q_TEMPLATES.test[0].name).toBe("5K TT")
    expect(Q_TEMPLATES.test[1].id).toBe("t2")
    expect(Q_TEMPLATES.test[1].name).toBe("20min Test")
  })

  it("generates workout JSON for 5K TT", () => {
    const t = Q_TEMPLATES.test[0]
    const result = toIntervalsWorkout(t, 10, 5)
    expect(result.description).toContain("5K TT")
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/planner-data.test.ts`
Expected: FAIL — `Q_TEMPLATES.test` is undefined

**Step 3: Add test templates**

In `planner-data.ts`, add to `Q_TEMPLATES`:
```typescript
test: [
  { id: "t1", name: "5K TT", reps: 1, dur: 20, rest: 0, vol: 20, pctLow: 105, pctHigh: 110 },
  { id: "t2", name: "20min Test", reps: 1, dur: 20, rest: 0, vol: 20, pctLow: 100, pctHigh: 105 },
],
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/planner-data.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/planner-data.ts src/lib/planner-data.test.ts
git commit -m "feat: add 5K TT and 20min Test workout templates"
```

---

## Task 6: Shared Types — AssessmentResult + WeekPlan + BlockPlan

**Files:**
- Create: `src/lib/block-types.ts`

**Step 1: Create shared types file**

```typescript
// src/lib/block-types.ts
import type { DaySlotData } from "./planner-data"
import type { EligibilityTier } from "./budget"

export interface AssessmentResult {
  weeklyAvgVolumeHours: number
  weeklyAvgDistanceKm: number
  weeklyAvgFrequency: number
  ctl: number
  ctlTrend: "rising" | "stable" | "declining"
  tsb: number
  volumeCV: number
  readiness: "ready" | "not_ready"
  flags: string[]
  recommendedQSessions: number
  maxQVolumeMin: number
  tier: EligibilityTier
  tierLabel: string
}

export interface WeekSummary {
  totalDurationMin: number
  qualityDurationMin: number
  qualityPercentage: number
  numQualitySessions: number
  estimatedLoad: number
}

export interface WeekPlan {
  weekNumber: 1 | 2 | 3 | 4
  weekType: "build" | "deload"
  startDate: string
  days: DaySlotData[]
  summary: WeekSummary
}

export type BlockStatus = "draft" | "confirmed" | "pushed" | "completed"

export interface BlockPlan {
  id: string
  createdAt: string
  updatedAt: string
  status: BlockStatus
  startDate: string
  endDate: string
  assessment: AssessmentResult
  weeks: [WeekPlan | null, WeekPlan | null, WeekPlan | null, WeekPlan | null]
  icuSync?: {
    pushedAt: string
    pushMode: "override" | "add_alongside"
    eventIds: string[]
  }
}

export interface BlockEvent {
  id: string
  blockId: string
  date: string
  weekNumber: number
  workoutType: string
  name: string
  durationMinutes?: number
  distanceMeters?: number
  workoutDoc?: object
  icuEventId?: string
  notes?: string
}
```

**Step 2: Type check**

Run: `pnpm tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add src/lib/block-types.ts
git commit -m "feat: add shared types for block generator"
```

---

## Task 7: BlockWizardContext — Frontend State

**Files:**
- Create: `src/lib/block-wizard-context.tsx`

**Step 1: Create the context provider**

```typescript
// src/lib/block-wizard-context.tsx
import { createContext, useContext, useCallback, useState, type ReactNode } from "react"
import type { AssessmentResult, WeekPlan, BlockPlan } from "./block-types"
import { apiFetch } from "./api"

type WizardStep = 1 | 2 | 3 | 4 | 5
type ActiveWeek = 1 | 2 | 3 | 4

interface BlockWizardState {
  step: WizardStep
  assessment: AssessmentResult | null
  startDate: string | null
  endDate: string | null
  activeWeek: ActiveWeek
  weeks: [WeekPlan | null, WeekPlan | null, WeekPlan | null, WeekPlan | null]
  blockId: string | null
  pushStatus: "idle" | "checking" | "pushing" | "done" | "error"
  error: string | null
}

interface BlockWizardActions {
  // Step 1
  runAssessment: () => Promise<void>
  // Step 2
  setStartDate: (date: string) => void
  // Step 3
  saveWeek: (week: WeekPlan) => void
  goToWeek: (n: ActiveWeek) => void
  // Step 4
  confirmBlock: () => Promise<void>
  saveDraft: () => Promise<void>
  // Step 5
  pushBlock: (mode: "override" | "add_alongside") => Promise<void>
  // Navigation
  goToStep: (step: WizardStep) => void
  editWeek: (n: ActiveWeek) => void
  reset: () => void
}

type BlockWizardContextValue = BlockWizardState & BlockWizardActions

const BlockWizardContext = createContext<BlockWizardContextValue | null>(null)

export function useBlockWizard() {
  const ctx = useContext(BlockWizardContext)
  if (!ctx) throw new Error("useBlockWizard must be used within BlockWizardProvider")
  return ctx
}

const INITIAL_STATE: BlockWizardState = {
  step: 1,
  assessment: null,
  startDate: null,
  endDate: null,
  activeWeek: 1,
  weeks: [null, null, null, null],
  blockId: null,
  pushStatus: "idle",
  error: null,
}

export function BlockWizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BlockWizardState>(INITIAL_STATE)

  const runAssessment = useCallback(async () => {
    try {
      const result = await apiFetch<AssessmentResult>("/api/block/assess", { method: "POST" })
      setState(s => ({ ...s, assessment: result, step: 2, error: null }))
    } catch (e) {
      setState(s => ({ ...s, error: (e as Error).message }))
    }
  }, [])

  const setStartDate = useCallback((date: string) => {
    // Snap to Monday
    const d = new Date(date)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    const start = d.toISOString().slice(0, 10)
    const end = new Date(d.getTime() + 27 * 86400000).toISOString().slice(0, 10)
    setState(s => ({ ...s, startDate: start, endDate: end, step: 3 }))
  }, [])

  const saveWeek = useCallback((week: WeekPlan) => {
    setState(s => {
      const weeks = [...s.weeks] as typeof s.weeks
      weeks[week.weekNumber - 1] = week
      const nextWeek = week.weekNumber < 4 ? (week.weekNumber + 1) as ActiveWeek : s.activeWeek
      const nextStep = week.weekNumber === 4 ? 4 as WizardStep : s.step
      return { ...s, weeks, activeWeek: nextWeek, step: nextStep }
    })
  }, [])

  const goToWeek = useCallback((n: ActiveWeek) => {
    setState(s => ({ ...s, activeWeek: n }))
  }, [])

  const editWeek = useCallback((n: ActiveWeek) => {
    setState(s => ({
      ...s,
      step: 3,
      activeWeek: n,
      // Clear subsequent weeks when editing a prior week
      weeks: s.weeks.map((w, i) => i >= n ? null : w) as typeof s.weeks,
    }))
  }, [])

  const confirmBlock = useCallback(async () => {
    // POST /api/block with status confirmed
    try {
      const body = {
        start_date: state.startDate,
        end_date: state.endDate,
        status: "confirmed",
        assessment: state.assessment,
        weeks: state.weeks,
        events: buildEvents(state.weeks, state.startDate!),
      }
      const result = await apiFetch<{ id: string }>("/api/block", {
        method: "POST",
        body: JSON.stringify(body),
      })
      setState(s => ({ ...s, blockId: result.id, step: 5, error: null }))
    } catch (e) {
      setState(s => ({ ...s, error: (e as Error).message }))
    }
  }, [state.startDate, state.endDate, state.assessment, state.weeks])

  const saveDraft = useCallback(async () => {
    try {
      const body = {
        start_date: state.startDate,
        end_date: state.endDate,
        status: "draft",
        assessment: state.assessment,
        weeks: state.weeks,
        events: buildEvents(state.weeks, state.startDate!),
      }
      const result = await apiFetch<{ id: string }>("/api/block", {
        method: "POST",
        body: JSON.stringify(body),
      })
      setState(s => ({ ...s, blockId: result.id, error: null }))
    } catch (e) {
      setState(s => ({ ...s, error: (e as Error).message }))
    }
  }, [state.startDate, state.endDate, state.assessment, state.weeks])

  const pushBlock = useCallback(async (mode: "override" | "add_alongside") => {
    if (!state.blockId) return
    setState(s => ({ ...s, pushStatus: "pushing" }))
    try {
      await apiFetch(`/api/block/${state.blockId}/push`, {
        method: "POST",
        body: JSON.stringify({ mode }),
      })
      setState(s => ({ ...s, pushStatus: "done", error: null }))
    } catch (e) {
      setState(s => ({ ...s, pushStatus: "error", error: (e as Error).message }))
    }
  }, [state.blockId])

  const goToStep = useCallback((step: WizardStep) => {
    setState(s => ({ ...s, step }))
  }, [])

  const reset = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  return (
    <BlockWizardContext.Provider
      value={{ ...state, runAssessment, setStartDate, saveWeek, goToWeek, editWeek, confirmBlock, saveDraft, pushBlock, goToStep, reset }}
    >
      {children}
    </BlockWizardContext.Provider>
  )
}

// Helper: flatten weeks into event rows for the API
function buildEvents(weeks: (WeekPlan | null)[], blockStart: string) {
  // Iterate weeks, iterate days, build event objects
  // Use toIntervalsWorkout / toEasyRunWorkout for workout_doc
  // Use naming: "Subthreshold I (Short — 8×3min)" etc.
  // Return array of event objects
  const events: any[] = []
  // Implementation in Task 10
  return events
}
```

**Step 2: Type check**

Run: `pnpm tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add src/lib/block-wizard-context.tsx
git commit -m "feat: add BlockWizardContext for wizard state management"
```

---

## Task 8: Wizard Page + Step Indicator

**Files:**
- Create: `src/pages/block-generator.tsx`
- Create: `src/components/block/step-indicator.tsx`
- Modify: `src/main.tsx` (add route)

**Step 1: Create StepIndicator component**

A horizontal stepper showing steps 1-5, highlighting current step, completed steps get a checkmark.

```typescript
// src/components/block/step-indicator.tsx
const STEPS = [
  { num: 1, label: "Assess" },
  { num: 2, label: "Dates" },
  { num: 3, label: "Build Weeks" },
  { num: 4, label: "Review" },
  { num: 5, label: "Push" },
]
```

**Step 2: Create BlockGeneratorPage**

```typescript
// src/pages/block-generator.tsx
import { BlockWizardProvider, useBlockWizard } from "@/lib/block-wizard-context"
import { StepIndicator } from "@/components/block/step-indicator"
// Import step components (created in Tasks 9-13)

export default function BlockGeneratorPage() {
  return (
    <BlockWizardProvider>
      <BlockGeneratorContent />
    </BlockWizardProvider>
  )
}

function BlockGeneratorContent() {
  const { step } = useBlockWizard()
  return (
    <div className="max-w-[960px] mx-auto px-5 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">NSA Block Generator</h1>
        <p className="text-sm text-muted-foreground">
          Create a 4-week training block: 3 build weeks + 1 deload/test week.
        </p>
      </header>
      <StepIndicator currentStep={step} />
      {step === 1 && <div>Assessment (Task 9)</div>}
      {step === 2 && <div>Date Selection (Task 10)</div>}
      {step === 3 && <div>Week Building (Task 11)</div>}
      {step === 4 && <div>Review (Task 12)</div>}
      {step === 5 && <div>Push (Task 13)</div>}
    </div>
  )
}
```

**Step 3: Add route in main.tsx**

Add import and route:
```typescript
import BlockGeneratorPage from "./pages/block-generator"
// In Routes:
<Route path="/block-generator" element={<BlockGeneratorPage />} />
```

**Step 4: Add nav link**

In `src/components/nav.tsx`, add a link to `/block-generator` (follow existing pattern).

**Step 5: Verify**

Run: `pnpm dev`
Navigate to `http://localhost:5173/block-generator`
Expected: page renders with stepper and placeholder content

**Step 6: Commit**

```bash
git add src/pages/block-generator.tsx src/components/block/step-indicator.tsx src/main.tsx src/components/nav.tsx
git commit -m "feat: add block generator page with step indicator"
```

---

## Task 9: Step 1 — Assessment UI

**Files:**
- Create: `src/components/block/step-assessment.tsx`
- Modify: `src/pages/block-generator.tsx` (import and render)

**Step 1: Create assessment step component**

Displays a "Run Assessment" button. On click, calls `runAssessment()` from context. Shows loading spinner during fetch. On success, renders the assessment report:

- Weekly avg volume, distance, frequency
- CTL + trend, TSB
- Volume CV
- Readiness verdict (green checkmark or red X)
- Flags (warning messages)
- Recommended Q sessions + max Q volume
- Tier label

If ready: "Continue" button → advances to step 2.
If not ready: shows warnings, no continue button, "Go Back" link.

**Step 2: Wire into page**

Replace `{step === 1 && <div>Assessment (Task 9)</div>}` with `{step === 1 && <StepAssessment />}`.

**Step 3: Verify**

Run: `pnpm dev`, navigate to block generator, click "Run Assessment"
Expected: assessment report renders (requires Intervals.icu connection + backend running)

**Step 4: Commit**

```bash
git add src/components/block/step-assessment.tsx src/pages/block-generator.tsx
git commit -m "feat: add assessment step UI for block generator"
```

---

## Task 10: Step 2 — Date Selection UI

**Files:**
- Create: `src/components/block/step-dates.tsx`
- Modify: `src/pages/block-generator.tsx`

**Step 1: Create date selection component**

- Native date input or shadcn date picker
- Shows the computed block range after selection: "Block: Mon Jun 1 → Sun Jun 28, 2026"
- If date is not a Monday, auto-snaps and shows: "Adjusted to nearest Monday"
- "Continue" button → advances to step 3
- "← Back" button → returns to step 1

**Step 2: Wire into page**

**Step 3: Verify and commit**

```bash
git add src/components/block/step-dates.tsx src/pages/block-generator.tsx
git commit -m "feat: add date selection step for block generator"
```

---

## Task 11: Step 3 — Week Building UI

**Files:**
- Create: `src/components/block/step-weeks.tsx`
- Create: `src/components/block/week-targets.tsx`
- Create: `src/components/block/week-validation.tsx`
- Modify: `src/pages/block-generator.tsx`
- Modify: `src/components/planner/quality-palette.tsx` (conditionally show test templates for W4)

This is the largest task. It reuses existing planner components.

**Step 1: Create WeekTargets sidebar component**

Displays per-week targets based on assessment data:
- Week type (Build / Deload)
- Target total volume
- Max Q sessions + Q volume ceiling (25%)
- Suggested pattern
- W2/W3: progression target (+3-5%)
- W4: deload targets + test requirement

**Step 2: Create WeekValidation panel**

Live validation that checks:
- Q volume vs 25% ceiling
- No consecutive Q days
- Rest day present
- W4: test workout placed
- Estimated training load

Renders as a list of checks with green/red indicators.

**Step 3: Create StepWeeks component**

Layout:
```
[W1] [W2] [W3] [W4]    ← sub-stepper tabs
┌──────────────────────────────────────────────────┐
│ [WeekTargets sidebar]  │  [WeekGrid + Palette]   │
│                        │  (existing components)   │
│ [WeekValidation]       │                          │
└──────────────────────────────────────────────────┘
[← Previous Week]                    [Next Week →]
```

Uses existing `WeekGrid`, `QualityPalette`, `DaySlot` via a `DndContext` wrapper (same as `planner.tsx`). State for the current week's `DaySlotData[]` lives locally, saved to context via `saveWeek()` on "Next Week".

**Step 4: Modify QualityPalette for W4**

In `quality-palette.tsx`, add a `showTestTemplates` prop. When true, add a "Test" category to the `CATEGORIES` array. The `test` templates from `Q_TEMPLATES.test` appear under this tab.

**Step 5: Wire into page and verify**

Test the full week-building flow: drag templates, set durations, check validation, advance through W1-W4.

**Step 6: Commit**

```bash
git add src/components/block/step-weeks.tsx src/components/block/week-targets.tsx src/components/block/week-validation.tsx src/components/planner/quality-palette.tsx src/pages/block-generator.tsx
git commit -m "feat: add week building step with targets, validation, and test templates"
```

---

## Task 12: Step 4 — Review UI

**Files:**
- Create: `src/components/block/step-review.tsx`
- Modify: `src/pages/block-generator.tsx`

**Step 1: Create review component**

Renders the 4-week summary table:

| | Total Vol | Q Vol | Q % | Q Sessions | Progression |
|---|---|---|---|---|---|
| Week 1 | computed | computed | computed | count + types | baseline |
| Week 2 | | | | | +N% |
| Week 3 | | | | | +N% |
| Week 4 | | | | | deload |

Plus compliance checks (green/red):
- All weeks within NSA constraints
- Progressive overload W1 < W2 < W3
- Deload ratio for W4
- Test workout placed

Buttons:
- **Edit Week N** — calls `editWeek(n)` → back to Step 3
- **Save as Draft** — calls `saveDraft()`
- **Confirm & Push** — calls `confirmBlock()` → advances to Step 5

**Step 2: Wire into page and verify**

**Step 3: Commit**

```bash
git add src/components/block/step-review.tsx src/pages/block-generator.tsx
git commit -m "feat: add review step for block generator"
```

---

## Task 13: Step 5 — Push UI

**Files:**
- Create: `src/components/block/step-push.tsx`
- Modify: `src/pages/block-generator.tsx`

**Step 1: Create push component**

States:
1. **Checking** — shows "Checking for existing events..."
2. **Conflicts found** — lists existing events, shows Override / Add alongside / Cancel buttons
3. **Pushing** — progress indicator showing events being created
4. **Done** — success message with link to Intervals.icu calendar
5. **Error** — error message with retry button

**Step 2: Wire into page and verify**

**Step 3: Commit**

```bash
git add src/components/block/step-push.tsx src/pages/block-generator.tsx
git commit -m "feat: add push step for block generator"
```

---

## Task 14: Push Logic — Backend

**Files:**
- Modify: `backend/src/server.ts` (flesh out the push route)
- Modify: `backend/src/services/Block.ts` (add push method if needed)

**Step 1: Implement the push route**

The `POST /api/block/:id/push` handler:
1. Gets the block + events from DB
2. Gets user's Intervals.icu credentials
3. If `mode === "override"`, calls `DELETE /api/v1/athlete/{id}/events` for date range
4. For each non-rest event, calls `POST /api/v1/athlete/{id}/events` with:
   ```json
   {
     "category": "WORKOUT",
     "start_date_local": "2026-06-01",
     "name": "Subthreshold I (Short — 8×3min)",
     "type": "Run",
     "moving_time": 2760,
     "description": "NSA Quality Short...",
     "workout_doc": { ... }
   }
   ```
5. Collects returned event IDs
6. Calls `setSyncData` to update the block

Follow the `WorkoutExport.ts` pattern for Intervals.icu API calls (Basic auth, Effect.tryPromise).

**Step 2: Implement event naming helper**

```typescript
function buildEventName(event: BlockEventRow, qIndex: number): string {
  const roman = ["I", "II", "III", "IV"]
  if (event.workout_type.startsWith("quality_")) {
    const cat = event.workout_type.replace("quality_", "")
    const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1)
    // Extract rep info from the template name stored in event.name or workout_doc
    return `Subthreshold ${roman[qIndex]} (${catLabel} — ${event.name})`
  }
  if (event.workout_type === "easy") return `Easy Run (${event.duration_minutes}min)`
  if (event.workout_type === "long_run") return `Long Run (${event.duration_minutes}min)`
  if (event.workout_type === "test_5k") return "5K Time Trial"
  if (event.workout_type === "test_20min") return "20min Threshold Test"
  return event.name
}
```

**Step 3: Test manually**

Create a block via the wizard, push to Intervals.icu, verify events appear in the calendar.

**Step 4: Commit**

```bash
git add backend/src/server.ts
git commit -m "feat: implement Intervals.icu push logic for block events"
```

---

## Task 15: buildEvents Helper + Week Summary Calculation

**Files:**
- Modify: `src/lib/block-wizard-context.tsx` (flesh out `buildEvents`)
- Create: `src/lib/block-utils.ts`
- Create: `src/lib/block-utils.test.ts`

**Step 1: Write tests for buildEvents and computeWeekSummary**

```typescript
// src/lib/block-utils.test.ts
import { describe, it, expect } from "vitest"
import { buildEvents, computeWeekSummary, generateEventName } from "./block-utils"

describe("generateEventName", () => {
  it("names quality sessions with roman numerals", () => {
    expect(generateEventName("quality_short", "8×3min", 0)).toBe("Subthreshold I (Short — 8×3min)")
    expect(generateEventName("quality_medium", "5×6min", 1)).toBe("Subthreshold II (Medium — 5×6min)")
    expect(generateEventName("quality_long", "3×10min", 2)).toBe("Subthreshold III (Long — 3×10min)")
  })

  it("names easy and long runs with duration", () => {
    expect(generateEventName("easy", "", 0, 50)).toBe("Easy Run (50min)")
    expect(generateEventName("long_run", "", 0, 90)).toBe("Long Run (90min)")
  })

  it("names test workouts", () => {
    expect(generateEventName("test_5k", "", 0)).toBe("5K Time Trial")
    expect(generateEventName("test_20min", "", 0)).toBe("20min Threshold Test")
  })
})

describe("computeWeekSummary", () => {
  // Test that it correctly sums durations, Q volume, Q percentage, load
})

describe("buildEvents", () => {
  // Test that it flattens weeks into event objects with correct dates, names, workout_docs
})
```

**Step 2: Implement the helpers**

```typescript
// src/lib/block-utils.ts
export function generateEventName(
  workoutType: string,
  templateName: string,
  qIndex: number,
  durationMin?: number,
): string {
  const roman = ["I", "II", "III", "IV"]
  if (workoutType.startsWith("quality_")) {
    const cat = workoutType.replace("quality_", "")
    const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1)
    return `Subthreshold ${roman[qIndex]} (${catLabel} — ${templateName})`
  }
  if (workoutType === "easy") return `Easy Run (${durationMin}min)`
  if (workoutType === "long_run") return `Long Run (${durationMin}min)`
  if (workoutType === "test_5k") return "5K Time Trial"
  if (workoutType === "test_20min") return "20min Threshold Test"
  return templateName
}

export function computeWeekSummary(days: DaySlotData[], wu: number, cd: number): WeekSummary {
  // Sum up durations, Q volume, compute percentage, estimate load
}

export function buildEvents(weeks: (WeekPlan | null)[], blockStart: string): BlockEvent[] {
  // For each week, for each day, build event with:
  // - date computed from blockStart + week offset + day index
  // - workout_doc from toIntervalsWorkout / toEasyRunWorkout
  // - name from generateEventName
}
```

**Step 3: Run tests**

Run: `pnpm vitest run src/lib/block-utils.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/block-utils.ts src/lib/block-utils.test.ts src/lib/block-wizard-context.tsx
git commit -m "feat: add block utility functions (event naming, summaries, event building)"
```

---

## Task 16: Block History on Dashboard

**Files:**
- Create: `src/components/block/block-history.tsx`
- Modify: `src/pages/dashboard.tsx`

**Step 1: Create BlockHistory component**

Fetches `GET /api/block` and displays a list of past blocks:
- Block date range
- Status badge (draft / confirmed / pushed / completed)
- Number of weeks completed
- Link to detail view (or expand inline)

**Step 2: Add to dashboard**

Import and render `<BlockHistory />` in dashboard page. Add a "Create New Block" button linking to `/block-generator`.

**Step 3: Verify and commit**

```bash
git add src/components/block/block-history.tsx src/pages/dashboard.tsx
git commit -m "feat: add block history to dashboard"
```

---

## Task 17: End-to-End Testing & Polish

**Files:**
- All block-related files

**Step 1: Full flow test**

Manually test the complete wizard:
1. Run assessment → verify report
2. Pick date → verify Monday snap
3. Build W1-W4 → verify validation, test template in W4
4. Review → verify summary table
5. Push → verify events in Intervals.icu

**Step 2: Type check + lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: no errors

**Step 3: Backend tests**

Run: `cd backend && bun test`
Expected: all tests pass

**Step 4: Frontend tests**

Run: `pnpm vitest run`
Expected: all tests pass

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: NSA block generator — complete wizard flow"
```

---

## Task Order & Dependencies

```
Task 1 (Migration) ──────────────────────────────┐
Task 2 (BlockService) ───────────────────────────┤
Task 3 (AssessmentService) ──────────────────────┤
Task 4 (Backend Routes) ─────────── depends on 1,2,3
Task 5 (Test Templates) ─────────────────────────┤
Task 6 (Shared Types) ───────────────────────────┤
Task 7 (WizardContext) ──────────── depends on 6  │
Task 8 (Page + Stepper) ─────────── depends on 7  │
Task 9 (Assessment UI) ──────────── depends on 8  │
Task 10 (Dates UI) ──────────────── depends on 8  │
Task 11 (Weeks UI) ──────────────── depends on 5,8│
Task 12 (Review UI) ─────────────── depends on 8  │
Task 13 (Push UI) ───────────────── depends on 8  │
Task 14 (Push Backend) ──────────── depends on 4  │
Task 15 (buildEvents + Utils) ──── depends on 5,6 │
Task 16 (Block History) ─────────── depends on 4  │
Task 17 (E2E Test) ──────────────── depends on all│
```

**Parallelizable groups:**
- Tasks 1-3 + 5-6 can all run in parallel (no dependencies)
- Tasks 9-13 can run in parallel (all depend only on Task 8)
- Task 14 + 15 can run in parallel
