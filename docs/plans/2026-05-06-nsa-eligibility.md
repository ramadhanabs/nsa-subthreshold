# NSA Eligibility Assessment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-assess a runner's NSA tier eligibility from their Intervals.icu data and display it below the training summary cards.

**Architecture:** Pure logic function `assessEligibility()` in `src/lib/budget.ts`, consumed by `src/components/training-summary.tsx`. No new components, no prop drilling — data is already available in TrainingSummary.

**Tech Stack:** TypeScript, Vitest, React, Tailwind CSS

---

### Task 1: Write failing tests for assessEligibility

**Files:**
- Modify: `src/lib/budget.test.ts` (append new describe block)

**Step 1: Write the failing tests**

Add to end of `src/lib/budget.test.ts`:

```ts
import { assessEligibility } from "./budget"

describe("assessEligibility", () => {
  it("returns not_ready for baseline < 180 min", () => {
    const result = assessEligibility(150, 30, 10)
    expect(result.tier).toBe("not_ready")
    expect(result.qSessions).toBe(0)
  })

  it("returns foundation for baseline 180-250", () => {
    const result = assessEligibility(200, 40, 12)
    expect(result.tier).toBe("foundation")
    expect(result.qSessions).toBe(1)
  })

  it("returns transition for baseline 250-300", () => {
    const result = assessEligibility(270, 50, 15)
    expect(result.tier).toBe("transition")
    expect(result.qSessions).toBe(2)
  })

  it("returns full_nsa for baseline 300-420", () => {
    const result = assessEligibility(360, 60, 20)
    expect(result.tier).toBe("full_nsa")
    expect(result.qSessions).toBe(3)
  })

  it("returns advanced_nsa for baseline 420+", () => {
    const result = assessEligibility(480, 80, 30)
    expect(result.tier).toBe("advanced_nsa")
    expect(result.qSessions).toBe(3)
  })

  it("computes avg pace from baseline and distance", () => {
    // 360 min / 60 km = 6.0 min/km
    const result = assessEligibility(360, 60, 20)
    expect(result.avgPace).toBeCloseTo(6.0)
  })

  it("computes daily avg and formula LR", () => {
    // daily = 360 / 7 = 51.43
    // formulaLR = 51.43 * 3 = 154.29
    const result = assessEligibility(360, 60, 20)
    expect(result.dailyAvgMin).toBeCloseTo(360 / 7)
    expect(result.formulaLR).toBeCloseTo((360 / 7) * 3)
  })

  it("warns when formula LR exceeds actual longest run by >15%", () => {
    // baseline 360, pace = 360/60 = 6 min/km
    // formulaLR = (360/7)*3 = 154.3 min
    // longest = 10 km → est = 10 * 6 = 60 min
    // 154.3 > 60 * 1.15 = 69 → warning
    const result = assessEligibility(360, 60, 10)
    expect(result.lrWarning).not.toBeNull()
  })

  it("no warning when longest run covers formula LR", () => {
    // baseline 360, pace = 6 min/km
    // formulaLR = 154.3 min
    // longest = 30 km → est = 180 min
    // 154.3 < 180 * 1.15 → no warning
    const result = assessEligibility(360, 60, 30)
    expect(result.lrWarning).toBeNull()
  })

  it("handles zero distance gracefully", () => {
    const result = assessEligibility(360, 0, 0)
    expect(result.tier).toBe("full_nsa")
    expect(result.avgPace).toBe(0)
    expect(result.lrWarning).toBeNull()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/budget.test.ts`
Expected: FAIL — `assessEligibility` is not exported from `./budget`

**Step 3: Commit**

```bash
git add src/lib/budget.test.ts
git commit -m "test: add failing tests for assessEligibility"
```

---

### Task 2: Implement assessEligibility in budget.ts

**Files:**
- Modify: `src/lib/budget.ts` (append type + function)

**Step 1: Add the type and function**

Append to end of `src/lib/budget.ts`:

```ts
export type EligibilityTier = "not_ready" | "foundation" | "transition" | "full_nsa" | "advanced_nsa"

export interface EligibilityResult {
  tier: EligibilityTier
  tierLabel: string
  qSessions: number
  avgPace: number          // min/km
  dailyAvgMin: number
  formulaLR: number        // daily_avg × 3
  estLongestRunMin: number // longest_run_km × avg_pace
  lrWarning: string | null
}

const TIERS: { max: number; tier: EligibilityTier; label: string; q: number }[] = [
  { max: 180, tier: "not_ready",    label: "Not ready",    q: 0 },
  { max: 250, tier: "foundation",   label: "Foundation",   q: 1 },
  { max: 300, tier: "transition",   label: "Transition",   q: 2 },
  { max: 420, tier: "full_nsa",     label: "Full NSA",     q: 3 },
  { max: Infinity, tier: "advanced_nsa", label: "Advanced NSA", q: 3 },
]

export function assessEligibility(
  baselineMin: number,
  avgWeeklyKm: number,
  longestRunKm: number,
): EligibilityResult {
  const matched = TIERS.find(t => baselineMin < t.max) ?? TIERS[TIERS.length - 1]

  const avgPace = avgWeeklyKm > 0 ? baselineMin / avgWeeklyKm : 0
  const dailyAvgMin = baselineMin / 7
  const formulaLR = dailyAvgMin * 3
  const estLongestRunMin = longestRunKm * avgPace

  let lrWarning: string | null = null
  if (avgWeeklyKm > 0 && longestRunKm > 0 && formulaLR > estLongestRunMin * 1.15) {
    lrWarning = "Your calculated long run budget exceeds your longest run by >15%, build up gradually"
  }

  return {
    tier: matched.tier,
    tierLabel: matched.label,
    qSessions: matched.q,
    avgPace,
    dailyAvgMin,
    formulaLR,
    estLongestRunMin,
    lrWarning,
  }
}
```

**Step 2: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/budget.test.ts`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/lib/budget.ts
git commit -m "feat: add assessEligibility function"
```

---

### Task 3: Add eligibility UI to TrainingSummary

**Files:**
- Modify: `src/components/training-summary.tsx`

**Step 1: Import and compute**

Add import at top:
```ts
import { assessEligibility, type EligibilityTier } from "@/lib/budget"
```

Add color map constant:
```ts
const TIER_COLORS: Record<EligibilityTier, string> = {
  not_ready: "bg-red-500",
  foundation: "bg-amber-500",
  transition: "bg-yellow-500",
  full_nsa: "bg-emerald-500",
  advanced_nsa: "bg-blue-500",
}
```

Compute eligibility after the existing state — derive it from the existing `weeklyHours`, `weeklyDist`, `longestRun` values:
```ts
const eligibility = weeklyHours != null && weeklyDist != null
  ? assessEligibility(weeklyHours, weeklyDist, longestRun ?? 0)
  : null
```

Note: `weeklyHours` is already in minutes (despite the variable name — it's set as `(totalMin / 42) * 7`).

**Step 2: Add UI below the grid**

After the closing `</div>` of the `grid grid-cols-3` div, add:

```tsx
{eligibility && (
  <div className="mt-3 space-y-2">
    <div className="bg-muted rounded-lg p-2.5 flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full shrink-0 ${TIER_COLORS[eligibility.tier]}`} />
      <span className="text-[13px] font-medium">{eligibility.tierLabel}</span>
      <span className="text-[0.65rem] text-muted-foreground">
        — {eligibility.qSessions} Q session{eligibility.qSessions !== 1 ? "s" : ""}/week
      </span>
    </div>
    <div className="flex gap-4 text-[0.65rem] text-muted-foreground px-1">
      {eligibility.avgPace > 0 && (
        <span>Avg pace: {eligibility.avgPace.toFixed(1)} min/km</span>
      )}
      <span>Daily avg: {Math.round(eligibility.dailyAvgMin)} min</span>
      <span>LR budget: {Math.round(eligibility.formulaLR)} min</span>
    </div>
    {eligibility.lrWarning && (
      <div className="text-[0.65rem] text-orange-600 dark:text-orange-400 flex items-start gap-1 px-1">
        <span className="shrink-0">⚠</span>
        <span>{eligibility.lrWarning}</span>
      </div>
    )}
  </div>
)}
```

**Step 3: Type check**

Run: `pnpm tsc --noEmit`
Expected: clean

**Step 4: Commit**

```bash
git add src/components/training-summary.tsx
git commit -m "feat: add NSA eligibility assessment to training summary"
```

---

### Task 4: Build, deploy, verify

**Step 1: Run all tests**

Run: `pnpm vitest run`
Expected: ALL PASS

**Step 2: Build and deploy**

```bash
pnpm build
rsync -avz --delete dist/ dev@lab:~/nsa-subthreshold/
```

**Step 3: Commit (if any fixes needed)**
