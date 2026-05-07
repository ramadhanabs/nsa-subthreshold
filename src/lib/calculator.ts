export type InputMode = "5k" | "10k" | "half" | "full" | "20min"
export type WkMode = "dist" | "time"

export interface HRZones {
  max: number
  lthr: number
  easy: number
  subLow: number
  subHigh: number
}

export type WorkoutZone = "easy" | "low" | "sub" | "top"

export interface Workout {
  name: string
  detail: string
  pace: number
  rest: string
  zone: WorkoutZone
}

export function fmtPace(s: number): string {
  const total = Math.round(s)
  const m = Math.floor(total / 60)
  const sc = total % 60
  return `${m}:${sc < 10 ? "0" : ""}${sc}`
}

/** Convert race time at a given distance to equivalent 5K time using Riegel formula */
function riegelTo5k(raceSecs: number, distKm: number): number {
  return raceSecs * (5 / distKm) ** 1.06
}

export function get5kPace(mode: InputMode, a: number, b: number): number {
  if (mode === "5k") return (a * 60 + b) / 5
  if (mode === "10k") return riegelTo5k(a * 60 + b, 10) / 5
  if (mode === "half") return riegelTo5k(a * 3600 + b * 60, 21.0975) / 5
  if (mode === "full") return riegelTo5k(a * 3600 + b * 60, 42.195) / 5
  return 1200 / (a + b / 100)
}

export function getHR(maxHR: number): HRZones {
  const lthr = Math.round(maxHR * 0.89)
  return {
    max: maxHR,
    lthr,
    easy: Math.round(maxHR * 0.70),
    subLow: Math.round(lthr * 0.90),
    subHigh: Math.round(lthr * 0.98),
  }
}

/** Threshold pace ≈ 5K pace × 1.05 (Daniels VDOT — pace sustainable ~40-60 min) */
export function getThreshold(fkp: number): number {
  return fkp * 1.05
}

/** Convert % of threshold to actual pace (s/km). pct=100 → threshold pace, pct>100 → faster */
export function paceFromPct(threshold: number, pct: number): number {
  return threshold / (pct / 100)
}

export function getWorkouts(fkp: number, wkMode: WkMode): Workout[] {
  const tp = getThreshold(fkp)
  // pct = % of threshold pace (100% = threshold). >100% = faster, <100% = slower.
  const defs = [
    { name: "Short sub-T session", pct: 100, rs: 60, z: "sub" as const, dm: 1000, ts: 240, reps: 10 },
    { name: "Medium sub-T session", pct: 98, rs: 60, z: "sub" as const, dm: 1600, ts: 360, reps: 6 },
    { name: "Long sub-T session", pct: 96, rs: 60, z: "sub" as const, dm: 2000, ts: 480, reps: 5 },
  ]

  const intervals: Workout[] = defs.map((d) => {
    const pace = tp / (d.pct / 100)
    const totalDist = d.dm * d.reps
    const totalTime = Math.round(pace * (totalDist / 1000))
    const detail = wkMode === "dist"
      ? `~${(totalDist / 1000).toFixed(1)} km total (${d.reps} x ${d.dm}m)`
      : `~${fmtPace(totalTime)} total (${d.reps} x ${fmtPace(d.ts)})`
    const rest = d.rs === 90 ? "1:30" : `${Math.round(d.rs / 60)}:00`
    return { name: d.name, detail, pace, rest, zone: d.z }
  })

  return [
    { name: "Easy run", detail: "3x/wk ~50 min", pace: fkp * 1.33, rest: "—", zone: "easy" as const },
    { name: "Long run", detail: "1x/wk ~75 min", pace: fkp * 1.38, rest: "—", zone: "easy" as const },
    ...intervals,
  ]
}

export interface PaceZones {
  threshold: number
  short: [number, number]
  medium: [number, number]
  long: [number, number]
  easyMax: number
}

export function getPaceZones(fkp: number): PaceZones {
  const tp = getThreshold(fkp)
  return {
    threshold: tp,
    short: [paceFromPct(tp, 101), paceFromPct(tp, 99)],   // 99–101% of threshold
    medium: [paceFromPct(tp, 99), paceFromPct(tp, 97)],    // 97–99% of threshold
    long: [paceFromPct(tp, 97), paceFromPct(tp, 95)],      // 95–97% of threshold
    easyMax: fkp * 1.38,
  }
}

export function hrRange(zone: WorkoutZone, hr: HRZones): string {
  if (zone === "easy") return `< ${hr.easy}`
  if (zone === "low") return `${hr.subLow}-${Math.round((hr.subLow + hr.subHigh) / 2)}`
  if (zone === "sub") return `${Math.round(hr.subLow * 1.01)}-${hr.subHigh}`
  if (zone === "top") return `${hr.subHigh}-${hr.lthr}`
  return "—"
}
