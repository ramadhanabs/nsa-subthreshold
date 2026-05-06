export type WeeklyRisk = "recovery" | "deload" | "maintenance" | "safe_build" | "confident" | "high_risk" | "very_high_risk"
export type LongRunRisk = "safe" | "confident" | "high_risk" | "very_high_risk"
export type QSessionRisk = "safe" | "confident" | "high_risk"

export interface RiskProfile<K extends string> {
  key: K
  label: string
  value: number  // adjustment % for weekly, multiplier for LR/Q
  color: string
  warning?: string
}

export const WEEKLY_PROFILES: RiskProfile<WeeklyRisk>[] = [
  { key: "recovery", label: "Recovery / taper", value: -0.15, color: "blue" },
  { key: "deload", label: "Deload", value: -0.07, color: "blue" },
  { key: "maintenance", label: "Maintenance", value: 0, color: "muted" },
  { key: "safe_build", label: "Safe build", value: 0.05, color: "emerald" },
  { key: "confident", label: "Confident recovery", value: 0.10, color: "amber" },
  { key: "high_risk", label: "High risk", value: 0.20, color: "orange", warning: "Ensure adequate recovery, nutrition, and sleep" },
  { key: "very_high_risk", label: "Very high risk", value: 0.30, color: "red", warning: "Not recommended for most runners" },
]

export const LONG_RUN_PROFILES: RiskProfile<LongRunRisk>[] = [
  { key: "safe", label: "Safe", value: 1.00, color: "emerald" },
  { key: "confident", label: "Confident recovery", value: 1.07, color: "amber" },
  { key: "high_risk", label: "High risk", value: 1.12, color: "orange", warning: "Pushing long run duration" },
  { key: "very_high_risk", label: "Very high risk", value: 1.18, color: "red", warning: "Not recommended without race-specific reason" },
]

export const Q_SESSION_PROFILES: RiskProfile<QSessionRisk>[] = [
  { key: "safe", label: "Safe", value: 1.2, color: "emerald" },
  { key: "confident", label: "Confident recovery", value: 1.4, color: "amber" },
  { key: "high_risk", label: "High risk", value: 1.75, color: "orange", warning: "Very long session, experienced athletes only" },
]

// Derive LR and Q multipliers from weekly risk profile
const DERIVED_MULTIPLIERS: Record<WeeklyRisk, { lr: number; q: number }> = {
  recovery:        { lr: 0.85, q: 1.0 },
  deload:          { lr: 0.92, q: 1.1 },
  maintenance:     { lr: 1.00, q: 1.2 },
  safe_build:      { lr: 1.00, q: 1.2 },
  confident:       { lr: 1.07, q: 1.4 },
  high_risk:       { lr: 1.12, q: 1.5 },
  very_high_risk:  { lr: 1.18, q: 1.75 },
}

export function getDerivedMultipliers(weeklyRisk: WeeklyRisk): { lr: number; q: number } {
  return DERIVED_MULTIPLIERS[weeklyRisk]
}

// baseline = (total running minutes last 42 days / 42) * 7
export function calcBaseline(totalMinutes42d: number): number {
  return Math.round((totalMinutes42d / 42) * 7)
}

// weekly budget = baseline * (1 + adjustment)
export function calcWeeklyBudget(baseline: number, adjustment: number): number {
  return Math.round(baseline * (1 + adjustment))
}

// long run = (baseline / 7) * 3 * multiplier, capped at 30% of weekly
export function calcLongRunBudget(baseline: number, multiplier: number, weeklyBudget: number): { budget: number; capped: boolean } {
  const raw = Math.round((baseline / 7) * 3 * multiplier)
  const cap = Math.round(weeklyBudget * 0.30)
  return { budget: Math.min(raw, cap), capped: raw > cap }
}

// Q session = (baseline / 7) * multiplier
export function calcQSessionBudget(baseline: number, multiplier: number): number {
  return Math.round((baseline / 7) * multiplier)
}

// easy run = (weekly - qCount*qBudget - longRun) / easyCount
export function calcEasyRunMin(weeklyBudget: number, qBudget: number, longRun: number, qCount?: number, easyCount?: number): number {
  const q = qCount ?? 3
  const e = easyCount ?? 3
  if (e <= 0) return 0
  return Math.round((weeklyBudget - (q * qBudget) - longRun) / e)
}

// format minutes as "Xh XXm"
export function fmtHoursMin(minutes: number): string {
  const h = Math.floor(Math.abs(minutes) / 60)
  const m = Math.round(Math.abs(minutes) % 60)
  const sign = minutes < 0 ? "-" : ""
  return `${sign}${h}h ${m < 10 ? "0" : ""}${m}m`
}

// full budget breakdown
export interface BudgetBreakdown {
  baseline: number
  weeklyBudget: number
  longRunBudget: number
  longRunCapped: boolean
  qSessionBudget: number
  easyRunMin: number
  qTotal: number       // qCount * qSessionBudget
  easyTotal: number    // easyCount * easyRunMin
  lrTotal: number      // longRunBudget (or planned long run)
  weeklyPlanned: number // qTotal + easyTotal + lrTotal
  remaining: number    // weeklyBudget - weeklyPlanned
  easyPct: number
  qPct: number
  lrPct: number
  isWithinBudget: boolean
  isEasyViable: boolean  // easyRunMin >= 20
  isRatioOk: boolean     // easyPct 70-80%
  warnings: string[]
}

export function computeBudget(params: {
  baseline: number
  weeklyAdj: number
  lrMultiplier: number
  qMultiplier: number
  qCount?: number
  easyCount?: number
  longRunOverride?: number  // if user set a specific LR duration
}): BudgetBreakdown {
  const { baseline, weeklyAdj, lrMultiplier, qMultiplier } = params
  const qCount = params.qCount ?? 3
  const easyCount = params.easyCount ?? 3

  const weeklyBudget = calcWeeklyBudget(baseline, weeklyAdj)
  const { budget: longRunBudget, capped: longRunCapped } = calcLongRunBudget(baseline, lrMultiplier, weeklyBudget)
  const qSessionBudget = calcQSessionBudget(baseline, qMultiplier)

  const lrTotal = params.longRunOverride ?? longRunBudget
  const easyRunMin = calcEasyRunMin(weeklyBudget, qSessionBudget, lrTotal, qCount, easyCount)
  const qTotal = qCount * qSessionBudget
  const easyTotal = easyCount * Math.max(0, easyRunMin)
  const weeklyPlanned = qTotal + easyTotal + lrTotal
  const remaining = weeklyBudget - weeklyPlanned

  const totalTime = qTotal + easyTotal + lrTotal
  const qPct = totalTime > 0 ? Math.round((qTotal / totalTime) * 100) : 0
  const easyPct = totalTime > 0 ? Math.round(((easyTotal + lrTotal) / totalTime) * 100) : 0
  const lrPct = totalTime > 0 ? Math.round((lrTotal / totalTime) * 100) : 0

  const isEasyViable = easyRunMin >= 20
  const isRatioOk = easyPct >= 70 && easyPct <= 80
  const isWithinBudget = remaining >= 0

  const warnings: string[] = []
  if (!isEasyViable) warnings.push("Easy runs too short (< 20 min). Reduce Q session or long run risk.")
  if (longRunCapped) warnings.push("Long run capped at 30% of weekly budget.")
  if (!isRatioOk && totalTime > 0) {
    if (easyPct < 70) warnings.push(`Easy/LR ratio too low (${easyPct}%). Add more easy volume or reduce quality.`)
    else warnings.push(`Easy/LR ratio high (${easyPct}%). Could add more quality volume.`)
  }
  if (easyRunMin < 0) warnings.push("Budget too tight — Q sessions + long run exceed weekly budget.")

  return {
    baseline, weeklyBudget, longRunBudget, longRunCapped, qSessionBudget,
    easyRunMin, qTotal, easyTotal, lrTotal, weeklyPlanned, remaining,
    easyPct, qPct, lrPct, isWithinBudget, isEasyViable, isRatioOk, warnings,
  }
}

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
