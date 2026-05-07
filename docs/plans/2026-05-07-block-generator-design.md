# NSA Block Generator — Design

**Date:** 2026-05-07
**Status:** Approved

---

## Overview

A wizard-style UI at `/block-generator` that creates a 4-week NSA training block (3 build + 1 deload/test). The wizard has 5 steps: Assessment → Dates → Build Weeks → Review → Push. It reuses the existing planner components for week building and pushes finalized plans to Intervals.icu.

### Key Decisions

- **Wizard-style UI** (not conversational) — all logic in the app
- **Always fetch fresh** from Intervals.icu for assessment (no local cache)
- **Week-by-week manual build** with targets/guardrails displayed, using existing drag-and-drop planner
- **Test workouts as special Q_TEMPLATES** — `test_5k` and `test_20min` added to template list
- **Full persistence** — `nsa_blocks` + `nsa_block_events` tables in SQLite

---

## Page Structure & Wizard Flow

Single route `/block-generator` (auth-required). A `BlockWizardProvider` context wraps the page. A `StepIndicator` component shows progress:

```
[1. Assess] → [2. Dates] → [3. Build Weeks] → [4. Review] → [5. Push]
```

Step 3 has an inner sub-stepper for W1–W4, reusing `WeekGrid` + `QualityPalette` + `DaySlot`.

Forward-only with back navigation — going back to Step 3 resets subsequent weeks if the edited week changes.

---

## Step 1: Assessment

Frontend calls `POST /api/block/assess`. Backend fetches fresh from Intervals.icu:

- `get_activities` — last 8 weeks
- `get_wellness_data` — last 4 weeks

### Readiness Checks (new logic)

| Check | Ready | Not Ready |
|-------|-------|-----------|
| Run frequency | ≥4 runs/week avg | <4 — warn |
| Volume stability | CV <30% | High variance — warn |
| Min weekly volume | ≥3 hrs/week | <3 hrs — warn |
| CTL trend | Stable or rising | Declining — warn |
| TSB (form) | > −20 | < −20 — too fatigued |
| No extended gaps | No >7-day gaps in last 4 weeks | Gap found — caution |

### Quality Session Capacity (reuse existing)

Reuses `assessEligibility()` from `budget.ts` for tier/Q-session count:

| Baseline | Tier | Q Sessions |
|----------|------|------------|
| <180 min/week | not_ready | 0 |
| 180-250 | foundation | 2 |
| 250-300 | transition | 2-3 |
| 300-420 | full_nsa | 3 |
| 420+ | advanced_nsa | 3+ |

### AssessmentResult Type

```typescript
type AssessmentResult = {
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
  tier: string
}
```

If not ready, UI shows report with warnings and no proceed button.

---

## Step 2: Date Selection

- Date picker, must be today or future
- Auto-snaps to Monday if non-Monday selected
- End date = start + 27 days
- Displays full range: "Block: Mon Jun 1 → Sun Jun 28, 2026"
- Warning if existing Intervals.icu events found in range

---

## Step 3: Week Building

Sub-stepper: W1 → W2 → W3 → W4. One week at a time.

### Targets Sidebar

Displays per-week constraints from assessment:

- Weekly volume target
- Q session count
- Max Q volume (25% ceiling)
- Suggested pattern (e.g., E–Q–E–Q–E–Q–LR)
- W2/W3: progression target (+3-5% over prior week)
- W4: deload target (~50-60% of W3) + test requirement

### Planner Grid

Reuses existing `WeekGrid`, `QualityPalette`, `DaySlot` components. User drags templates, sets durations, adjusts WU/CD.

### Live Validation Panel

Updates as user builds:

- Q volume vs 25% ceiling
- No consecutive Q days
- Rest day present
- W4: test workout placed
- Estimated training load per session

### Week Transitions

- "Next Week →" enabled only when validation passes
- "← Previous Week" available, warns if it invalidates later weeks
- Week data stored in wizard context

### Test Workout Templates

Added to `Q_TEMPLATES` under a `test` category, visible only during W4:

```typescript
test: [
  { id: "t1", name: "5K TT", reps: 1, dur: 20, rest: 0, vol: 20, pctLow: 105, pctHigh: 110 },
  { id: "t2", name: "20min Test", reps: 1, dur: 20, rest: 0, vol: 20, pctLow: 100, pctHigh: 105 },
]
```

---

## Step 4: Review

Summary table showing all 4 weeks:

```
        │ Total Vol │ Q Vol   │ Q %  │ Q Sessions │ Progression
────────┼───────────┼─────────┼──────┼────────────┼────────────
Week 1  │ 4h 15m    │ 60 min  │ 24%  │ 3 (S/M/L)  │ baseline
Week 2  │ 4h 25m    │ 63 min  │ 24%  │ 3 (S/M/L)  │ +4%
Week 3  │ 4h 35m    │ 66 min  │ 24%  │ 3 (S/M/L)  │ +4%
Week 4  │ 2h 30m    │ 20 min  │ 13%  │ 1 + 5K TT  │ deload
```

Compliance checks displayed (green/red). User options:

- **Edit Week N** — back to Step 3 at that week
- **Confirm & Push** — proceed to Step 5
- **Save as Draft** — persist with status `draft`

---

## Step 5: Push to Intervals.icu

1. Fetch existing events for block date range
2. If conflicts: show Override / Add alongside / Cancel
3. If override: `delete_events_by_date_range` first
4. Create events per non-rest day via `add_or_update_event`
5. Show progress indicator
6. Persist block to SQLite with status `pushed` and event IDs

### Event Naming

Quality sessions numbered by order within the week:

- **Subthreshold I (Short — 8×3min)**
- **Subthreshold II (Medium — 5×6min)**
- **Subthreshold III (Long — 3×10min)**

Other session types:

- **Easy Run (50min)**
- **Long Run (90min)**
- **5K Time Trial**
- **20min Threshold Test**

### Workout Doc Generation

Uses existing `toIntervalsWorkout()` and `toEasyRunWorkout()` functions from `planner-data.ts`.

---

## Database Schema

### `nsa_blocks`

```sql
CREATE TABLE IF NOT EXISTS nsa_blocks (
  id            TEXT PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
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

CREATE INDEX idx_nsa_blocks_user   ON nsa_blocks(user_id);
CREATE INDEX idx_nsa_blocks_status ON nsa_blocks(status);
CREATE INDEX idx_nsa_blocks_start  ON nsa_blocks(start_date);
```

### `nsa_block_events`

```sql
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

CREATE INDEX idx_block_events_block ON nsa_block_events(block_id);
CREATE INDEX idx_block_events_date  ON nsa_block_events(date);
```

---

## Backend Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/block/assess` | Fresh Intervals.icu fetch + readiness check |
| POST | `/api/block` | Create/save block (draft or confirmed) |
| GET | `/api/block` | List user's blocks |
| GET | `/api/block/:id` | Full block detail |
| POST | `/api/block/:id/push` | Push to Intervals.icu, update status + event IDs |
| DELETE | `/api/block/:id` | Delete a block |

---

## Frontend State

```typescript
type BlockWizardState = {
  step: 1 | 2 | 3 | 4 | 5
  assessment: AssessmentResult | null
  startDate: string | null
  activeWeek: 1 | 2 | 3 | 4
  weeks: [WeekPlan | null, WeekPlan | null, WeekPlan | null, WeekPlan | null]
  blockId: string | null
  existingEvents: ICUEvent[]
  pushStatus: "idle" | "checking" | "pushing" | "done" | "error"
}
```

`BlockWizardProvider` context wraps the `/block-generator` page. Block history displayed on the dashboard as a list with status badges.

---

## Data Types (shared)

```typescript
type WeekPlan = {
  weekNumber: 1 | 2 | 3 | 4
  weekType: "build" | "deload"
  startDate: string
  days: DaySlotData[]
  summary: {
    totalDurationMin: number
    qualityDurationMin: number
    qualityPercentage: number
    numQualitySessions: number
    estimatedLoad: number
  }
}
```

Reuses existing `DaySlotData` and `QTemplate` types from `planner-data.ts`.
