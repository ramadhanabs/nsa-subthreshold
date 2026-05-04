export type InputMode = "5k" | "20min"
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
  const m = Math.floor(s / 60)
  const sc = Math.round(s % 60)
  return `${m}:${sc < 10 ? "0" : ""}${sc}`
}

export function get5kPace(mode: InputMode, a: number, b: number): number {
  if (mode === "5k") return (a * 60 + b) / 5
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

export function getWorkouts(fkp: number, wkMode: WkMode): Workout[] {
  const cv = fkp * 1.02
  const defs = [
    { dn: "25 x 400m", tn: "25 x 1:30", dd: "Short reps, highest pace", td: "Short reps ~400m equiv", pf: 0.98, rs: 30, z: "top" as const, dm: 400, ts: 90, reps: 25 },
    { dn: "10 x 1000m", tn: "10 x 4:00", dd: "Bread & butter", td: "Bread & butter ~1K equiv", pf: 1.055, rs: 60, z: "sub" as const, dm: 1000, ts: 240, reps: 10 },
    { dn: "6 x 1600m", tn: "6 x 6:00", dd: "Moderate reps", td: "Moderate ~1.6K equiv", pf: 1.09, rs: 60, z: "sub" as const, dm: 1600, ts: 360, reps: 6 },
    { dn: "5 x 2000m", tn: "5 x 8:00", dd: "Long reps", td: "Long reps ~2K equiv", pf: 1.12, rs: 60, z: "sub" as const, dm: 2000, ts: 480, reps: 5 },
    { dn: "3 x 3000m", tn: "3 x 12:00", dd: "Longest reps", td: "Longest ~3K equiv", pf: 1.14, rs: 90, z: "low" as const, dm: 3000, ts: 720, reps: 3 },
  ]

  const intervals: Workout[] = defs.map((d) => {
    const pace = cv * d.pf
    const name = wkMode === "dist" ? d.dn : d.tn
    const detailBase = wkMode === "dist" ? d.dd : d.td
    let repTime: number, repDist: number
    if (wkMode === "dist") {
      repTime = Math.round(pace * (d.dm / 1000))
      repDist = d.dm
    } else {
      repTime = d.ts
      repDist = Math.round((d.ts / pace) * 1000)
    }
    const extra =
      wkMode === "dist"
        ? ` (${fmtPace(repTime)}/rep)`
        : ` (~${repDist}m/rep)`
    const rest =
      d.rs < 60 ? `${d.rs}s` : d.rs === 90 ? "1:30" : `${Math.round(d.rs / 60)}:00`
    return { name, detail: detailBase + extra, pace, rest, zone: d.z }
  })

  return [
    ...intervals,
    { name: "Easy run", detail: "3x/wk ~50 min", pace: fkp * 1.33, rest: "—", zone: "easy" as const },
    { name: "Long run", detail: "1x/wk ~75 min", pace: fkp * 1.38, rest: "—", zone: "easy" as const },
  ]
}

export function hrRange(zone: WorkoutZone, hr: HRZones): string {
  if (zone === "easy") return `< ${hr.easy}`
  if (zone === "low") return `${hr.subLow}-${Math.round((hr.subLow + hr.subHigh) / 2)}`
  if (zone === "sub") return `${Math.round(hr.subLow * 1.01)}-${hr.subHigh}`
  if (zone === "top") return `${hr.subHigh}-${hr.lthr}`
  return "—"
}
