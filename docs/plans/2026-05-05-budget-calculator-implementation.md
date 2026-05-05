# Budget Calculator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a training budget calculator section to the dashboard that computes weekly, long run, and Q session budgets from a 42-day baseline with independent risk profile selectors.

**Architecture:** Pure calculation functions in `src/lib/budget.ts` with unit tests. A self-contained `BudgetCalculator` React component embedded in the dashboard. Baseline auto-calculated from existing activities API or manually entered. No backend changes needed.

**Tech Stack:** React, TypeScript, Tailwind, shadcn/ui, Vitest (frontend tests)

---

### Task 1: Budget calculation library with tests

**Files:**
- Create: `src/lib/budget.ts`
- Create: `src/lib/budget.test.ts`

**Step 1: Create `src/lib/budget.ts`**

Types and pure functions:

```ts
export type WeeklyRisk = "recovery" | "deload" | "maintenance" | "safe_build" | "confident" | "high_risk" | "very_high_risk"
export type LongRunRisk = "safe" | "confident" | "high_risk" | "very_high_risk"
export type QSessionRisk = "safe" | "confident" | "high_risk"

export interface WeeklyRiskProfile {
  key: WeeklyRisk
  label: string
  adjustment: number  // e.g. 0.05 for +5%
  color: string       // tailwind color token
  warning?: string
}

export interface LongRunRiskProfile {
  key: LongRunRisk
  label: string
  multiplier: number
  color: string
  warning?: string
}

export interface QSessionRiskProfile {
  key: QSessionRisk
  label: string
  multiplier: number
  color: string
  warning?: string
}
```

Constants:

```ts
export const WEEKLY_PROFILES: WeeklyRiskProfile[] = [
  { key: "recovery", label: "Recovery / taper", adjustment: -0.15, color: "blue" },
  { key: "deload", label: "Deload", adjustment: -0.07, color: "blue" },
  { key: "maintenance", label: "Maintenance", adjustment: 0, color: "muted" },
  { key: "safe_build", label: "Safe build", adjustment: 0.05, color: "emerald" },
  { key: "confident", label: "Confident recovery", adjustment: 0.10, color: "amber" },
  { key: "high_risk", label: "High risk", adjustment: 0.20, color: "orange", warning: "Ensure adequate recovery, nutrition, and sleep" },
  { key: "very_high_risk", label: "Very high risk", adjustment: 0.30, color: "red", warning: "Not recommended for most runners" },
]

export const LONG_RUN_PROFILES: LongRunRiskProfile[] = [
  { key: "safe", label: "Safe", multiplier: 1.00, color: "emerald" },
  { key: "confident", label: "Confident recovery", multiplier: 1.07, color: "amber" },
  { key: "high_risk", label: "High risk", multiplier: 1.12, color: "orange", warning: "Pushing long run duration" },
  { key: "very_high_risk", label: "Very high risk", multiplier: 1.18, color: "red", warning: "Not recommended without race-specific reason" },
]

export const Q_SESSION_PROFILES: QSessionRiskProfile[] = [
  { key: "safe", label: "Safe", multiplier: 1.2, color: "emerald" },
  { key: "confident", label: "Confident recovery", multiplier: 1.4, color: "amber" },
  { key: "high_risk", label: "High risk", multiplier: 1.75, color: "orange", warning: "Very long session, experienced athletes only" },
]
```

Calculation functions:

```ts
export function calcBaseline(totalRunningMinutes42d: number): number {
  return (totalRunningMinutes42d / 42) * 7
}

export function calcWeeklyBudget(baseline: number, adjustment: number): number {
  return Math.round(baseline * (1 + adjustment))
}

export function calcLongRunBudget(baseline: number, multiplier: number, weeklyBudget: number): number {
  const raw = Math.round((baseline / 7) * 3 * multiplier)
  const cap = Math.round(weeklyBudget * 0.30)
  return Math.min(raw, cap)
}

export function calcLongRunCapped(raw: number, weeklyBudget: number): boolean {
  return raw > weeklyBudget * 0.30
}

export function calcQSessionBudget(baseline: number, multiplier: number): number {
  return Math.round((baseline / 7) * multiplier)
}

export function calcEasyRunMin(weeklyBudget: number, qSessionBudget: number, longRunMin: number, qCount: number, easyCount: number): number {
  if (easyCount <= 0) return 0
  return Math.round((weeklyBudget - (qCount * qSessionBudget) - longRunMin) / easyCount)
}

export function fmtHoursMin(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h}h ${m < 10 ? "0" : ""}${m}m`
}

export interface BudgetBreakdown {
  baseline: number
  weeklyBudget: number
  longRunBudget: number
  longRunCapped: boolean
  qSessionBudget: number
  easyRunMin: number
  qTotal: number
  easyTotal: number
  weeklyTotal: number
  easyPct: number
  qPct: number
  isWithinWeeklyBudget: boolean
  isEasyViable: boolean
  isRatioOk: boolean
  warnings: string[]
}

export function computeBudget(
  baseline: number,
  weeklyAdj: number,
  lrMultiplier: number,
  qMultiplier: number,
  qCount: number,
  easyCount: number,
  longRunMin: number,
): BudgetBreakdown {
  // compute all values and validations
  // return the full breakdown object
}
```

The `computeBudget` function ties everything together — calculates all budgets, derives easy run, checks validations, builds warnings array.

**Step 2: Create `src/lib/budget.test.ts`**

Tests using Vitest:

1. `calcBaseline` — 2520 min over 42 days → 420 min/week
2. `calcWeeklyBudget` — 360 baseline × 1.05 → 378
3. `calcWeeklyBudget` — 360 baseline × 0.85 → 306 (recovery)
4. `calcLongRunBudget` — 360 baseline, safe (1.0) → 154 min
5. `calcLongRunBudget` — caps at 30% of weekly budget
6. `calcQSessionBudget` — 360 baseline, safe (1.2) → 62 min
7. `calcEasyRunMin` — solves correctly: (378 - 3×62 - 75) / 3 = 39
8. `calcEasyRunMin` — returns negative when budget too tight (signals warning)
9. `fmtHoursMin` — 154 → "2h 34m", 60 → "1h 00m"
10. `computeBudget` — full breakdown with baseline 360, safe build → validates all fields
11. `computeBudget` — warns when easy run < 20
12. `computeBudget` — warns when long run capped

**Step 3: Run tests**

```bash
pnpm vitest run
```

**Step 4: Commit**

```bash
git add src/lib/budget.ts src/lib/budget.test.ts
git commit -m "feat: add budget calculation library with tests"
```

---

### Task 2: BudgetCalculator component

**Files:**
- Create: `src/components/budget-calculator.tsx`

**Step 1: Create the component**

Read these for context:
- `src/lib/budget.ts` — calculation functions and types
- `src/lib/api.ts` — apiFetch for activities
- `src/components/activities-list.tsx` — pattern for fetching activities
- `src/components/ui/button.tsx`, `src/components/ui/input.tsx` — shadcn components

Self-contained component inside a gradient card (`rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-4`).

**Layout:**

Title: "Training budget" with monochrome icon (Calculator from lucide)

**Baseline input section:**
- Toggle: "From Intervals.icu" / "Manual" (two small buttons)
- If Intervals.icu: show computed baseline with "Recalculate" button. On mount, fetch `GET /api/activities?from={42 days ago}`, sum duration_secs, convert to minutes, call `calcBaseline`.
- If manual: number input for weekly running minutes
- Display: "Baseline: X min (Xh Xm) — 42-day average"

**Risk profile selectors (3 independent):**
Each is a row with label + button group. Active button has colored background matching its risk color. Inactive buttons use outline variant.

1. Weekly: 7 options (recovery → very high risk)
2. Long run: 4 options (safe → very high risk)
3. Q session: 3 options (safe → high risk)

Show the computed budget next to each: "→ X min (Xh Xm)"
Show warning text in orange/red for risky profiles.

**Budget summary:**
A breakdown card showing:
- Weekly budget: Xmin
- 3× Q sessions: Xmin (budget: Xmin per session)
- 3× Easy runs: Xmin (Xmin each)
- Long run: Xmin (budget: Xmin)
- Remaining: Xmin ✅ or ⚠️

**Stacked bar:** visual showing Q / Easy / LR proportions within the weekly budget. Use the same pill-style bar from the planner's weekly summary.

**Validation section:**
- Green checks for passing validations
- Orange/red warnings for violations
- Suggestion text (e.g. "Try reducing Q session risk or increasing weekly budget")

**State:** all local — `baselineMode`, `manualBaseline`, `autoBaseline`, `weeklyRisk`, `longRunRisk`, `qSessionRisk`. Compute everything derived via `computeBudget()`.

**Step 2: Verify build**

```bash
pnpm build
```

**Step 3: Commit**

```bash
git add src/components/budget-calculator.tsx
git commit -m "feat: add BudgetCalculator component"
```

---

### Task 3: Embed in dashboard

**Files:**
- Modify: `src/pages/dashboard.tsx`

**Step 1: Add BudgetCalculator to dashboard**

Read `src/pages/dashboard.tsx`. Import `BudgetCalculator` from `@/components/budget-calculator`.

Add the component after the "This week" section and before the "Progress" section. It should always be visible (not gated on Intervals.icu — since manual mode works without it).

**Step 2: Verify build**

```bash
pnpm build
```

**Step 3: Run all tests**

```bash
pnpm vitest run
```

Frontend tests should all pass (11 existing + new budget tests).

**Step 4: Commit**

```bash
git add src/pages/dashboard.tsx
git commit -m "feat: embed budget calculator in dashboard"
```

---

### Task 4: Polish and verify

**Files:**
- Various

**Step 1: Run all checks**

```bash
pnpm vitest run && pnpm build
cd backend && bun test
```

**Step 2: Fix any issues**

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: polish budget calculator"
```
