export interface QTemplate {
  id: string
  name: string
  reps: number
  dur: number
  rest: number
  vol: number
  /** Pace as % of threshold — low end (faster). E.g. 99 = 99% of threshold pace */
  pctLow: number
  /** Pace as % of threshold — high end (slower). E.g. 101 = 101% of threshold pace */
  pctHigh: number
}

export type SessionType = "quality" | "easy" | "long" | "rest"

export interface DaySlotData {
  day: string
  type: SessionType | null
  template: QTemplate | null
}

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

export const Q_TEMPLATES: Record<string, QTemplate[]> = {
  short: [
    { id: "s1", name: "7×3min", reps: 7, dur: 3, rest: 60, vol: 21, pctLow: 99, pctHigh: 101 },
    { id: "s2", name: "8×3min", reps: 8, dur: 3, rest: 60, vol: 24, pctLow: 99, pctHigh: 101 },
    { id: "s3", name: "9×3min", reps: 9, dur: 3, rest: 60, vol: 27, pctLow: 99, pctHigh: 101 },
    { id: "s4", name: "10×3min", reps: 10, dur: 3, rest: 60, vol: 30, pctLow: 99, pctHigh: 101 },
    { id: "s5", name: "11×3min", reps: 11, dur: 3, rest: 60, vol: 33, pctLow: 99, pctHigh: 101 },
    { id: "s6", name: "12×3min", reps: 12, dur: 3, rest: 60, vol: 36, pctLow: 99, pctHigh: 101 },
    { id: "s7", name: "8×4min", reps: 8, dur: 4, rest: 60, vol: 32, pctLow: 99, pctHigh: 101 },
    { id: "s8", name: "9×4min", reps: 9, dur: 4, rest: 60, vol: 36, pctLow: 99, pctHigh: 101 },
    { id: "s9", name: "10×4min", reps: 10, dur: 4, rest: 60, vol: 40, pctLow: 99, pctHigh: 101 },
  ],
  medium: [
    { id: "m1", name: "4×5min", reps: 4, dur: 5, rest: 60, vol: 20, pctLow: 97, pctHigh: 99 },
    { id: "m2", name: "5×5min", reps: 5, dur: 5, rest: 60, vol: 25, pctLow: 97, pctHigh: 99 },
    { id: "m3", name: "4×6min", reps: 4, dur: 6, rest: 60, vol: 24, pctLow: 97, pctHigh: 99 },
    { id: "m4", name: "5×6min", reps: 5, dur: 6, rest: 60, vol: 30, pctLow: 97, pctHigh: 99 },
    { id: "m5", name: "6×6min", reps: 6, dur: 6, rest: 60, vol: 36, pctLow: 97, pctHigh: 99 },
    { id: "m6", name: "4×8min", reps: 4, dur: 8, rest: 60, vol: 32, pctLow: 97, pctHigh: 99 },
    { id: "m7", name: "5×8min", reps: 5, dur: 8, rest: 60, vol: 40, pctLow: 97, pctHigh: 99 },
  ],
  long: [
    { id: "l1", name: "2×10min", reps: 2, dur: 10, rest: 90, vol: 20, pctLow: 95, pctHigh: 97 },
    { id: "l2", name: "3×10min", reps: 3, dur: 10, rest: 90, vol: 30, pctLow: 95, pctHigh: 97 },
    { id: "l3", name: "3×11min", reps: 3, dur: 11, rest: 90, vol: 33, pctLow: 95, pctHigh: 97 },
    { id: "l4", name: "3×12min", reps: 3, dur: 12, rest: 105, vol: 36, pctLow: 95, pctHigh: 97 },
    { id: "l5", name: "4×10min", reps: 4, dur: 10, rest: 105, vol: 40, pctLow: 95, pctHigh: 97 },
    { id: "l6", name: "2×15min", reps: 2, dur: 15, rest: 105, vol: 30, pctLow: 95, pctHigh: 97 },
    { id: "l7", name: "3×15min", reps: 3, dur: 15, rest: 120, vol: 45, pctLow: 95, pctHigh: 97 },
  ],
  test: [
    { id: "t1", name: "5K TT", reps: 1, dur: 20, rest: 0, vol: 20, pctLow: 105, pctHigh: 110 },
    { id: "t2", name: "20min Test", reps: 1, dur: 20, rest: 0, vol: 20, pctLow: 100, pctHigh: 105 },
  ],
}

export const SESSION_META: Record<SessionType, { label: string; short: string }> = {
  quality: { label: "Quality", short: "Q" },
  easy: { label: "Easy Run", short: "E" },
  long: { label: "Long Run", short: "LR" },
  rest: { label: "Rest", short: "R" },
}

export function totalSessionMin(t: QTemplate, wu: number, cd: number): number {
  const restTotal = (t.reps - 1) * (t.rest / 60)
  return wu + cd + t.vol + restTotal
}

export function qWorkMin(t: QTemplate): number {
  return t.vol + (t.reps - 1) * (t.rest / 60)
}

export function initWeek(): DaySlotData[] {
  return DAYS.map((d) => ({ day: d, type: null, template: null }))
}

function fmtDur(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (s === 0) return `${m}m`
  return `${m}m${s}s`
}

const EASY_IF = (0.69 + 0.79) / 2 // midpoint of 69-79%

function stepLoad(intensityFactor: number, durationMin: number): number {
  return intensityFactor ** 2 * (durationMin / 60) * 100
}

/** Estimate training load for a quality session */
export function estimateQualityLoad(t: QTemplate, wu: number, cd: number): number {
  const workIF = ((t.pctLow + t.pctHigh) / 2) / 100
  const restMin = t.rest / 60
  const wuLoad = stepLoad(EASY_IF, wu)
  const cdLoad = stepLoad(EASY_IF, cd)
  const repLoad = stepLoad(workIF, t.dur) + stepLoad(EASY_IF, restMin)
  return Math.round(wuLoad + t.reps * repLoad + cdLoad)
}

/** Estimate training load for an easy or long run */
export function estimateEasyLoad(minutes: number): number {
  return Math.round(stepLoad(EASY_IF, minutes))
}

export interface IntervalsWorkout {
  description: string
  target: "PACE"
  steps: IntervalsStep[]
}

export type IntervalsStep =
  | { duration: number; warmup: true; text: string }
  | { duration: number; cooldown: true; text: string }
  | { duration: number; pace: { value: number; units: "%pace" }; text: string }
  | { duration: number; text: string }
  | { reps: number; text: string; steps: IntervalsStep[] }

function categoryLabel(t: QTemplate): string {
  if (t.id.startsWith("s")) return "Short"
  if (t.id.startsWith("m")) return "Medium"
  return "Long"
}

/** Generate Intervals.icu structured workout JSON from a quality template */
export function toIntervalsWorkout(t: QTemplate, wu: number, cd: number): IntervalsWorkout {
  const cat = categoryLabel(t)
  const paceValue = (t.pctLow + t.pctHigh) / 2

  return {
    description: `NSA Quality ${cat} — ${t.name} sub-threshold intervals`,
    target: "PACE",
    steps: [
      { duration: wu * 60, warmup: true, text: "Easy warmup" },
      {
        reps: t.reps,
        text: "Sub-threshold intervals",
        steps: [
          { duration: t.dur * 60, pace: { value: paceValue, units: "%pace" }, text: "Sub-T effort" },
          { duration: t.rest, text: "Walk/jog recovery" },
        ],
      },
      { duration: cd * 60, cooldown: true, text: "Easy cooldown" },
    ],
  }
}

/** Generate Intervals.icu structured workout JSON for easy or long run */
export function toEasyRunWorkout(minutes: number, isLong: boolean): IntervalsWorkout {
  return {
    description: isLong ? "NSA Long Run" : "NSA Easy Run",
    target: "PACE",
    steps: [
      { duration: minutes * 60, pace: { value: 74, units: "%pace" }, text: isLong ? "Long run" : "Easy run" },
    ],
  }
}

/** Generate Intervals.icu workout description for easy or long run */
export function toEasyRunDescription(minutes: number): string {
  return `- ${minutes}m 69-79% Pace`
}

/** Generate Intervals.icu workout description from a quality template */
export function toIntervalsDescription(t: QTemplate, wu: number, cd: number): string {
  const lines: string[] = []

  lines.push("Warmup")
  lines.push(`- ${wu}m 69-79% Pace`)
  lines.push("")

  lines.push(`${t.reps}x`)
  lines.push(`- ${t.dur}m ${t.pctLow}-${t.pctHigh}% Pace`)
  lines.push(`- ${fmtDur(t.rest)} 69-79% Pace`)
  lines.push("")

  lines.push("Cooldown")
  lines.push(`- ${cd}m 69-79% Pace`)

  return lines.join("\n")
}
