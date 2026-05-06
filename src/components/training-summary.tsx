import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { assessEligibility, TIERS, type EligibilityTier } from "@/lib/budget"

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

const TIER_COLORS: Record<EligibilityTier, string> = {
  not_ready: "bg-red-500",
  foundation: "bg-amber-500",
  transition: "bg-yellow-500",
  full_nsa: "bg-emerald-500",
  advanced_nsa: "bg-blue-500",
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

  const eligibility = weeklyHours != null && weeklyDist != null
    ? assessEligibility(weeklyHours, weeklyDist, longestRun ?? 0)
    : null

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
      {eligibility && (
        <div className="mt-3 space-y-2">
          <div className="text-[13px] font-medium">NSA eligibility</div>
          <div className="flex flex-col gap-1">
            {TIERS.map((t) => {
              const isCurrent = t.tier === eligibility.tier
              return (
                <div
                  key={t.tier}
                  className={`rounded-lg p-2 flex items-center gap-2 transition-colors ${
                    isCurrent ? "bg-muted" : "opacity-40"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${TIER_COLORS[t.tier]}`} />
                  <span className={`text-xs ${isCurrent ? "font-medium" : ""}`}>{t.label}</span>
                  <span className="text-[0.65rem] text-muted-foreground">{t.range}</span>
                  <span className="text-[0.65rem] text-muted-foreground ml-auto">
                    {t.q} Q{t.q !== 1 ? "s" : ""}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="bg-muted/60 rounded-lg p-2.5 text-[0.65rem] text-muted-foreground space-y-1">
            <div>
              Your 42-day avg is <span className="text-foreground font-medium">{fmtHoursMin(weeklyHours!)}</span>/week
              ({Math.round(weeklyHours!)} min), placing you in the <span className="text-foreground font-medium">{eligibility.tierLabel}</span> tier
              ({TIERS.find(t => t.tier === eligibility.tier)?.range}).
              {eligibility.qSessions < 3
                ? ` Build to ${TIERS[TIERS.findIndex(t => t.tier === eligibility.tier) + 1]?.range ?? "more volume"} to unlock ${TIERS[TIERS.findIndex(t => t.tier === eligibility.tier) + 1]?.q ?? 3} Q sessions.`
                : ""}
            </div>
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
    </div>
  )
}
