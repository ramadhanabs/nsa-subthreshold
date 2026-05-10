import { Effect } from "effect"
import { DatabaseService } from "./Database"
import { IntervalsNotConnected, IntervalsApiError } from "./Errors"

// ── Types ──────────────────────────────────────────────────────────────

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
  tier: string
  tierLabel: string
}

interface User {
  id: string
  intervals_icu_athlete_id: string | null
  intervals_icu_api_key: string | null
}

interface IntervalsActivity {
  id: string
  start_date_local: string
  moving_time?: number | null
  elapsed_time?: number | null
  distance?: number | null
  type?: string
}

interface IntervalsWellnessEntry {
  id: string
  ctl?: number | null
  atl?: number | null
  tsb?: number | null
}

// ── Tier definitions ───────────────────────────────────────────────────

const TIERS = [
  { min: 420, tier: "advanced_nsa", label: "Advanced NSA", qSessions: 3 },
  { min: 300, tier: "full_nsa", label: "Full NSA", qSessions: 3 },
  { min: 250, tier: "transition", label: "Transition", qSessions: 2 },
  { min: 180, tier: "foundation", label: "Foundation", qSessions: 1 },
] as const

function getTier(weeklyMinutes: number) {
  for (const t of TIERS) {
    if (weeklyMinutes >= t.min) return t
  }
  return { min: 0, tier: "not_ready", label: "Not Ready", qSessions: 0 } as const
}

// ── Pure computation functions ─────────────────────────────────────────

/**
 * Get the ISO week key (YYYY-Www) for a date string.
 */
function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z")
  // Thursday of the same ISO week
  const thu = new Date(d)
  thu.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7))
  const year = thu.getUTCFullYear()
  const jan1 = new Date(Date.UTC(year, 0, 1))
  const weekNum = Math.ceil(((thu.getTime() - jan1.getTime()) / 86400000 + 1) / 7)
  return `${year}-W${String(weekNum).padStart(2, "0")}`
}

/**
 * Compute weekly volumes (in minutes) from activities grouped by ISO week.
 * Returns an array of `numWeeks` values, oldest first.
 */
export function computeWeeklyVolumes(
  activities: Array<{ date: string; duration_secs: number }>,
  numWeeks: number
): number[] {
  const weekMap = new Map<string, number>()
  for (const a of activities) {
    const key = isoWeekKey(a.date)
    weekMap.set(key, (weekMap.get(key) ?? 0) + a.duration_secs / 60)
  }

  // Generate the last numWeeks ISO week keys
  const now = new Date()
  const weeks: string[] = []
  for (let i = numWeeks - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    weeks.push(isoWeekKey(d.toISOString().slice(0, 10)))
  }

  // Deduplicate while preserving order (in case two dates map to same week)
  const seen = new Set<string>()
  const uniqueWeeks: string[] = []
  for (const w of weeks) {
    if (!seen.has(w)) {
      seen.add(w)
      uniqueWeeks.push(w)
    }
  }

  // Pad or trim to numWeeks
  while (uniqueWeeks.length < numWeeks) uniqueWeeks.unshift("pad")
  const result = uniqueWeeks.slice(-numWeeks)

  return result.map((w) => weekMap.get(w) ?? 0)
}

/**
 * Coefficient of variation as a percentage.
 */
export function computeCV(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  if (mean === 0) return 0
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return (Math.sqrt(variance) / mean) * 100
}

/**
 * Compare CTL from first vs second half of wellness window.
 */
export function detectCTLTrend(
  wellness: Array<{ ctl: number | null }>
): "rising" | "stable" | "declining" {
  const ctlValues = wellness.filter((w) => w.ctl != null).map((w) => w.ctl!)
  if (ctlValues.length < 4) return "stable"

  const mid = Math.floor(ctlValues.length / 2)
  const firstHalf = ctlValues.slice(0, mid)
  const secondHalf = ctlValues.slice(mid)

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length
  const firstAvg = avg(firstHalf)
  const secondAvg = avg(secondHalf)

  const diff = secondAvg - firstAvg
  const threshold = Math.max(firstAvg * 0.05, 1) // 5% or 1 point

  if (diff > threshold) return "rising"
  if (diff < -threshold) return "declining"
  return "stable"
}

/**
 * Max consecutive days without activity in last 28 days.
 */
export function detectMaxGap(
  activities: Array<{ date: string }>,
  fromDate: string
): number {
  const from = new Date(fromDate + "T00:00:00Z")
  const windowStart = new Date(from)
  windowStart.setUTCDate(windowStart.getUTCDate() - 28)

  const activityDates = new Set(
    activities
      .map((a) => a.date.slice(0, 10))
      .filter((d) => d >= windowStart.toISOString().slice(0, 10) && d <= fromDate)
  )

  let maxGap = 0
  let currentGap = 0

  for (let i = 0; i <= 28; i++) {
    const d = new Date(windowStart)
    d.setUTCDate(d.getUTCDate() + i)
    const ds = d.toISOString().slice(0, 10)
    if (activityDates.has(ds)) {
      currentGap = 0
    } else {
      currentGap++
      maxGap = Math.max(maxGap, currentGap)
    }
  }

  return maxGap
}

/**
 * Main readiness computation.
 */
export function computeReadiness(
  activities: Array<{ date: string; duration_secs: number; distance_m: number }>,
  wellness: Array<{ date: string; ctl: number | null; atl: number | null; tsb: number | null }>
): AssessmentResult {
  const flags: string[] = []

  // 1. Weekly volumes (last 8 weeks)
  const weeklyVolumes = computeWeeklyVolumes(activities, 8)

  // 2. Baseline: total minutes over 42 days / 42 * 7
  const now = new Date()
  const cutoff42 = new Date(now)
  cutoff42.setDate(cutoff42.getDate() - 42)
  const cutoffStr = cutoff42.toISOString().slice(0, 10)

  const recent42 = activities.filter((a) => a.date >= cutoffStr)
  const totalMin42 = recent42.reduce((s, a) => s + a.duration_secs / 60, 0)
  const baseline = (totalMin42 / 42) * 7

  // 3. Tier + Q sessions
  const tierInfo = getTier(baseline)

  // 4. Readiness checks

  // Frequency: unique run dates / 8 weeks
  const uniqueDates = new Set(activities.map((a) => a.date.slice(0, 10)))
  const avgFrequency = uniqueDates.size / 8
  if (avgFrequency < 4) {
    flags.push(`Low frequency: ${avgFrequency.toFixed(1)} runs/week (need ≥4)`)
  }

  // Volume CV
  const cv = computeCV(weeklyVolumes)
  if (cv >= 30) {
    flags.push(`High volume variability: CV=${cv.toFixed(0)}% (need <30%)`)
  }

  // Min volume
  if (baseline < 180) {
    flags.push(`Low weekly volume: ${baseline.toFixed(0)} min/week (need ≥180)`)
  }

  // CTL trend
  const ctlTrend = detectCTLTrend(wellness)
  if (ctlTrend === "declining") {
    flags.push("CTL trend is declining")
  }

  // TSB — prefer explicit tsb, fall back to ctl - atl
  const latestWellness = [...wellness].reverse().find((w) => w.tsb != null || (w.ctl != null && w.atl != null))
  const latestTsb = latestWellness?.tsb ?? (
    latestWellness?.ctl != null && latestWellness?.atl != null
      ? latestWellness.ctl - latestWellness.atl
      : 0
  )
  if (latestTsb < -20) {
    flags.push(`TSB too low: ${latestTsb.toFixed(0)} (need > -20)`)
  }

  // Gaps
  const todayStr = now.toISOString().slice(0, 10)
  const maxGap = detectMaxGap(activities, todayStr)
  if (maxGap > 7) {
    flags.push(`Long gap: ${maxGap} days without activity (max 7)`)
  }

  // 5. Readiness
  const criticalFlags = flags.filter(
    (f) => f.startsWith("Low weekly volume") || f.startsWith("Low frequency")
  )
  const readiness = criticalFlags.length === 0 && tierInfo.tier !== "not_ready" ? "ready" : "not_ready"

  // 6. maxQVolumeMin
  const maxQVolumeMin = baseline * 0.25

  // Averages
  const weeklyAvgVolumeHours = baseline / 60
  const totalDistKm = activities.reduce((s, a) => s + a.distance_m / 1000, 0)
  const weeklyAvgDistanceKm = totalDistKm / 8

  // Latest CTL
  const latestCtl = [...wellness].reverse().find((w) => w.ctl != null)?.ctl ?? 0

  return {
    weeklyAvgVolumeHours: Math.round(weeklyAvgVolumeHours * 10) / 10,
    weeklyAvgDistanceKm: Math.round(weeklyAvgDistanceKm * 10) / 10,
    weeklyAvgFrequency: Math.round(avgFrequency * 10) / 10,
    ctl: Math.round(latestCtl * 10) / 10,
    ctlTrend,
    tsb: Math.round(latestTsb * 10) / 10,
    volumeCV: Math.round(cv * 10) / 10,
    readiness,
    flags,
    recommendedQSessions: tierInfo.qSessions,
    maxQVolumeMin: Math.round(maxQVolumeMin),
    tier: tierInfo.tier,
    tierLabel: tierInfo.label,
  }
}

// ── AssessmentService (handles API calls) ──────────────────────────────

export class AssessmentService extends Effect.Service<AssessmentService>()("AssessmentService", {
  effect: Effect.gen(function* () {
    const db = yield* DatabaseService

    return {
      assess: (userId: string) =>
        Effect.gen(function* () {
          const user = yield* db.get<User>(
            "SELECT id, intervals_icu_athlete_id, intervals_icu_api_key FROM users WHERE id = ?",
            [userId]
          )
          if (!user || !user.intervals_icu_athlete_id || !user.intervals_icu_api_key) {
            return yield* new IntervalsNotConnected()
          }

          const athleteId = user.intervals_icu_athlete_id
          const apiKey = user.intervals_icu_api_key
          const basicAuth = Buffer.from(`API_KEY:${apiKey}`).toString("base64")

          const today = new Date()
          const fmt = (d: Date) => d.toISOString().slice(0, 10)

          // 56 days for activities (8 weeks)
          const activityOldest = new Date(today)
          activityOldest.setDate(activityOldest.getDate() - 56)

          // 28 days for wellness
          const wellnessOldest = new Date(today)
          wellnessOldest.setDate(wellnessOldest.getDate() - 28)

          const todayStr = fmt(today)

          // Fetch activities
          const activitiesUrl = `https://intervals.icu/api/v1/athlete/${athleteId}/activities?oldest=${fmt(activityOldest)}&newest=${todayStr}`
          const rawActivities = yield* Effect.tryPromise({
            try: async () => {
              const resp = await fetch(activitiesUrl, {
                headers: { Authorization: `Basic ${basicAuth}` },
              })
              if (!resp.ok) {
                throw { status: resp.status, message: `${resp.status} ${resp.statusText}` }
              }
              return resp.json() as Promise<IntervalsActivity[]>
            },
            catch: (e: any) =>
              e?.status
                ? new IntervalsApiError({ status: e.status, message: e.message })
                : new IntervalsApiError({ status: 0, message: `Failed to fetch activities: ${e}` }),
          })

          // Fetch wellness
          const wellnessUrl = `https://intervals.icu/api/v1/athlete/${athleteId}/wellness?oldest=${fmt(wellnessOldest)}&newest=${todayStr}`
          const rawWellness = yield* Effect.tryPromise({
            try: async () => {
              const resp = await fetch(wellnessUrl, {
                headers: { Authorization: `Basic ${basicAuth}` },
              })
              if (!resp.ok) {
                throw { status: resp.status, message: `${resp.status} ${resp.statusText}` }
              }
              return resp.json() as Promise<IntervalsWellnessEntry[]>
            },
            catch: (e: any) =>
              e?.status
                ? new IntervalsApiError({ status: e.status, message: e.message })
                : new IntervalsApiError({ status: 0, message: `Failed to fetch wellness: ${e}` }),
          })

          // Map to expected shapes
          const activities = rawActivities.map((a) => ({
            date: (a.start_date_local ?? a.id).slice(0, 10),
            duration_secs: a.moving_time ?? a.elapsed_time ?? 0,
            distance_m: a.distance ?? 0,
          }))

          const wellness = rawWellness.map((w) => ({
            date: w.id,
            ctl: w.ctl ?? null,
            atl: w.atl ?? null,
            tsb: w.tsb ?? null,
          }))

          return computeReadiness(activities, wellness)
        }),
    }
  }),
  dependencies: [DatabaseService.Default],
}) {}
