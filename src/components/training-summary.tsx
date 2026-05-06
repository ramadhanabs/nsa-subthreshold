import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"

interface ActivityRecord {
  distance_m: number | null
  duration_secs: number | null
}

function fmtDist(km: number): string {
  return km >= 10 ? Math.round(km).toString() : km.toFixed(1)
}

function fmtHoursMin(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return `${h}h ${m < 10 ? "0" : ""}${m}m`
}

export default function TrainingSummary() {
  const [weeklyHours, setWeeklyHours] = useState<number | null>(null)
  const [weeklyDist, setWeeklyDist] = useState<number | null>(null)
  const [longestRun, setLongestRun] = useState<number | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const now = new Date()

    const from42 = new Date(now)
    from42.setDate(now.getDate() - 42)

    const from90 = new Date(now)
    from90.setDate(now.getDate() - 90)

    const toStr = now.toISOString().slice(0, 10)

    Promise.all([
      apiFetch<ActivityRecord[]>(
        `/api/activities?from=${from42.toISOString().slice(0, 10)}&to=${toStr}`
      ),
      apiFetch<ActivityRecord[]>(
        `/api/activities?from=${from90.toISOString().slice(0, 10)}&to=${toStr}`
      ),
    ])
      .then(([acts42, acts90]) => {
        const totalMin = acts42.reduce(
          (s, a) => s + ((a.duration_secs ?? 0) / 60),
          0
        )
        setWeeklyHours((totalMin / 42) * 7)

        const totalDist = acts42.reduce(
          (s, a) => s + ((a.distance_m ?? 0) / 1000),
          0
        )
        setWeeklyDist((totalDist / 42) * 7)

        const maxDist = acts90.reduce(
          (max, a) => Math.max(max, (a.distance_m ?? 0) / 1000),
          0
        )
        setLongestRun(maxDist > 0 ? maxDist : null)
      })
      .catch(() => setError(true))
  }, [])

  if (error) return null

  return (
    <div>
      <div className="text-[13px] font-medium mb-3">Training summary</div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted rounded-lg p-2.5">
          <div className="text-[0.65rem] text-muted-foreground">Avg weekly hours</div>
          <div className="text-xl font-medium font-mono">
            {weeklyHours != null ? fmtHoursMin(weeklyHours) : "\u2014"}
          </div>
          <div className="text-[0.65rem] text-muted-foreground">42-day avg</div>
        </div>
        <div className="bg-muted rounded-lg p-2.5">
          <div className="text-[0.65rem] text-muted-foreground">Avg weekly distance</div>
          <div className="text-xl font-medium font-mono">
            {weeklyDist != null ? `${fmtDist(weeklyDist)} km` : "\u2014"}
          </div>
          <div className="text-[0.65rem] text-muted-foreground">42-day avg</div>
        </div>
        <div className="bg-muted rounded-lg p-2.5">
          <div className="text-[0.65rem] text-muted-foreground">Longest run</div>
          <div className="text-xl font-medium font-mono">
            {longestRun != null ? `${fmtDist(longestRun)} km` : "\u2014"}
          </div>
          <div className="text-[0.65rem] text-muted-foreground">last 90 days</div>
        </div>
      </div>
    </div>
  )
}
