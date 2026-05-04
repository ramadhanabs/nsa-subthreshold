export interface QTemplate {
  id: string
  name: string
  reps: number
  dur: number
  rest: number
  vol: number
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
    { id: "s1", name: "7×3min", reps: 7, dur: 3, rest: 60, vol: 21 },
    { id: "s2", name: "8×3min", reps: 8, dur: 3, rest: 60, vol: 24 },
    { id: "s3", name: "9×3min", reps: 9, dur: 3, rest: 60, vol: 27 },
    { id: "s4", name: "10×3min", reps: 10, dur: 3, rest: 60, vol: 30 },
    { id: "s5", name: "11×3min", reps: 11, dur: 3, rest: 60, vol: 33 },
    { id: "s6", name: "12×3min", reps: 12, dur: 3, rest: 60, vol: 36 },
    { id: "s7", name: "8×4min", reps: 8, dur: 4, rest: 60, vol: 32 },
    { id: "s8", name: "9×4min", reps: 9, dur: 4, rest: 60, vol: 36 },
    { id: "s9", name: "10×4min", reps: 10, dur: 4, rest: 60, vol: 40 },
  ],
  medium: [
    { id: "m1", name: "4×5min", reps: 4, dur: 5, rest: 60, vol: 20 },
    { id: "m2", name: "5×5min", reps: 5, dur: 5, rest: 60, vol: 25 },
    { id: "m3", name: "4×6min", reps: 4, dur: 6, rest: 60, vol: 24 },
    { id: "m4", name: "5×6min", reps: 5, dur: 6, rest: 60, vol: 30 },
    { id: "m5", name: "6×6min", reps: 6, dur: 6, rest: 60, vol: 36 },
    { id: "m6", name: "4×8min", reps: 4, dur: 8, rest: 60, vol: 32 },
    { id: "m7", name: "5×8min", reps: 5, dur: 8, rest: 60, vol: 40 },
  ],
  long: [
    { id: "l1", name: "2×10min", reps: 2, dur: 10, rest: 90, vol: 20 },
    { id: "l2", name: "3×10min", reps: 3, dur: 10, rest: 90, vol: 30 },
    { id: "l3", name: "3×11min", reps: 3, dur: 11, rest: 90, vol: 33 },
    { id: "l4", name: "3×12min", reps: 3, dur: 12, rest: 105, vol: 36 },
    { id: "l5", name: "4×10min", reps: 4, dur: 10, rest: 105, vol: 40 },
    { id: "l6", name: "2×15min", reps: 2, dur: 15, rest: 105, vol: 30 },
    { id: "l7", name: "3×15min", reps: 3, dur: 15, rest: 120, vol: 45 },
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
