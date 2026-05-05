import { useState, useEffect } from "react"
import { Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiFetch } from "@/lib/api"
import {
  WEEKLY_PROFILES,
  LONG_RUN_PROFILES,
  Q_SESSION_PROFILES,
  calcBaseline,
  computeBudget,
  fmtHoursMin,
  type WeeklyRisk,
  type LongRunRisk,
  type QSessionRisk,
  type RiskProfile,
} from "@/lib/budget"

const COLOR_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  orange: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
  red: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  muted: "bg-muted text-muted-foreground",
}

function ProfileSelector<K extends string>({
  label,
  profiles,
  selected,
  onSelect,
  resultMin,
}: {
  label: string
  profiles: RiskProfile<K>[]
  selected: K
  onSelect: (key: K) => void
  resultMin: number
}) {
  const active = profiles.find((p) => p.key === selected)
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1">
        {profiles.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={p.key === selected ? "outline" : "outline"}
            className={
              p.key === selected
                ? `text-xs ${COLOR_CLASSES[p.color] ?? ""}`
                : "text-xs"
            }
            onClick={() => onSelect(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <div className="text-xs font-mono text-muted-foreground">
        &rarr; {resultMin} min ({fmtHoursMin(resultMin)})
      </div>
      {active?.warning && (
        <div className="text-[0.65rem] text-orange-600 dark:text-orange-400">
          {active.warning}
        </div>
      )}
    </div>
  )
}

export default function BudgetCalculator() {
  const [baselineMode, setBaselineMode] = useState<"auto" | "manual">("manual")
  const [manualBaseline, setManualBaseline] = useState(360)
  const [autoBaseline, setAutoBaseline] = useState<number | null>(null)
  const [autoError, setAutoError] = useState(false)
  const [weeklyRisk, setWeeklyRisk] = useState<WeeklyRisk>("safe_build")
  const [longRunRisk, setLongRunRisk] = useState<LongRunRisk>("safe")
  const [qSessionRisk, setQSessionRisk] = useState<QSessionRisk>("safe")

  useEffect(() => {
    const from = new Date()
    from.setDate(from.getDate() - 42)
    apiFetch<Array<{ duration_secs: number | null }>>(
      `/api/activities?from=${from.toISOString().slice(0, 10)}`
    )
      .then((activities) => {
        const totalMin = activities.reduce(
          (s, a) => s + ((a.duration_secs ?? 0) / 60),
          0
        )
        setAutoBaseline(calcBaseline(totalMin))
        setBaselineMode("auto")
      })
      .catch(() => {
        setAutoError(true)
      })
  }, [])

  const baseline =
    baselineMode === "auto" && autoBaseline ? autoBaseline : manualBaseline
  const weeklyProfile = WEEKLY_PROFILES.find((p) => p.key === weeklyRisk)!
  const lrProfile = LONG_RUN_PROFILES.find((p) => p.key === longRunRisk)!
  const qProfile = Q_SESSION_PROFILES.find((p) => p.key === qSessionRisk)!
  const breakdown = computeBudget({
    baseline,
    weeklyAdj: weeklyProfile.value,
    lrMultiplier: lrProfile.value,
    qMultiplier: qProfile.value,
  })

  const totalBar = breakdown.qTotal + breakdown.easyTotal + breakdown.lrTotal
  const qBarPct = totalBar > 0 ? (breakdown.qTotal / totalBar) * 100 : 0
  const easyBarPct = totalBar > 0 ? (breakdown.easyTotal / totalBar) * 100 : 0
  const lrBarPct = totalBar > 0 ? (breakdown.lrTotal / totalBar) * 100 : 0

  return (
    <div className="rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-4">
      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="size-4 text-muted-foreground" />
        <div className="text-[13px] font-medium">Training budget</div>
      </div>

      {/* Baseline section */}
      <div className="space-y-2 mb-4">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={baselineMode === "auto" ? "default" : "outline"}
            onClick={() => setBaselineMode("auto")}
          >
            Intervals.icu
          </Button>
          <Button
            size="sm"
            variant={baselineMode === "manual" ? "default" : "outline"}
            onClick={() => setBaselineMode("manual")}
          >
            Manual
          </Button>
        </div>

        {baselineMode === "auto" ? (
          autoBaseline != null ? (
            <div className="text-sm">
              Baseline: {autoBaseline} min ({fmtHoursMin(autoBaseline)})
            </div>
          ) : autoError ? (
            <div className="text-xs text-muted-foreground">
              Connect Intervals.icu to auto-calculate
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Loading...</div>
          )
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={manualBaseline}
              onChange={(e) => setManualBaseline(Number(e.target.value))}
              className="w-24"
            />
            <div className="text-sm">
              Baseline: {manualBaseline} min ({fmtHoursMin(manualBaseline)})
            </div>
          </div>
        )}
      </div>

      {/* Risk profile selectors */}
      <div className="space-y-3 mb-4">
        <ProfileSelector
          label="Weekly budget"
          profiles={WEEKLY_PROFILES}
          selected={weeklyRisk}
          onSelect={setWeeklyRisk}
          resultMin={breakdown.weeklyBudget}
        />
        <ProfileSelector
          label="Long run"
          profiles={LONG_RUN_PROFILES}
          selected={longRunRisk}
          onSelect={setLongRunRisk}
          resultMin={breakdown.longRunBudget}
        />
        <ProfileSelector
          label="Q session"
          profiles={Q_SESSION_PROFILES}
          selected={qSessionRisk}
          onSelect={setQSessionRisk}
          resultMin={breakdown.qSessionBudget}
        />
      </div>

      {/* Budget summary */}
      <div className="bg-muted rounded-lg p-3 mt-3">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span>Weekly budget</span>
            <span className="font-mono">
              {breakdown.weeklyBudget} min ({fmtHoursMin(breakdown.weeklyBudget)}
              )
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span>3x Q sessions</span>
            <span className="font-mono">
              {breakdown.qTotal} min (budget: {breakdown.qSessionBudget} min
              each)
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span>3x Easy runs</span>
            <span className="font-mono">
              {breakdown.easyTotal} min ({breakdown.easyRunMin} min each)
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Long run</span>
            <span className="font-mono">
              {breakdown.lrTotal} min (budget: {breakdown.longRunBudget} min)
            </span>
          </div>
          <div className="border-t border-border my-1.5" />
          <div className="flex justify-between text-xs font-medium">
            <span>Remaining</span>
            <span className="font-mono">
              {breakdown.remaining} min{" "}
              {breakdown.isWithinBudget ? "\u2705" : "\u26a0\ufe0f"}
            </span>
          </div>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="h-6 rounded-full bg-muted overflow-hidden flex mt-3">
        {qBarPct > 0 && (
          <div
            className="bg-orange-400/70 flex items-center justify-center text-[10px] font-medium text-orange-950 dark:text-orange-100 overflow-hidden"
            style={{ width: `${qBarPct}%` }}
          >
            {qBarPct >= 12 ? "Q" : ""}
          </div>
        )}
        {easyBarPct > 0 && (
          <div
            className="bg-blue-400/70 flex items-center justify-center text-[10px] font-medium text-blue-950 dark:text-blue-100 overflow-hidden"
            style={{ width: `${easyBarPct}%` }}
          >
            {easyBarPct >= 12 ? "Easy" : ""}
          </div>
        )}
        {lrBarPct > 0 && (
          <div
            className="bg-purple-400/70 flex items-center justify-center text-[10px] font-medium text-purple-950 dark:text-purple-100 overflow-hidden"
            style={{ width: `${lrBarPct}%` }}
          >
            {lrBarPct >= 12 ? "LR" : ""}
          </div>
        )}
      </div>

      {/* Validation */}
      <div className="mt-2 space-y-0.5">
        {breakdown.warnings.map((w, i) => (
          <div
            key={i}
            className="text-xs text-orange-600 dark:text-orange-400"
          >
            {"\u26a0\ufe0f"} {w}
          </div>
        ))}
        {breakdown.isWithinBudget && (
          <div className="text-xs text-emerald-700 dark:text-emerald-400">
            {"\u2705"} Within weekly budget
          </div>
        )}
        {breakdown.isEasyViable && (
          <div className="text-xs text-emerald-700 dark:text-emerald-400">
            {"\u2705"} Easy runs viable
          </div>
        )}
        {breakdown.isRatioOk && (
          <div className="text-xs text-emerald-700 dark:text-emerald-400">
            {"\u2705"} 75/25 ratio OK
          </div>
        )}
      </div>
    </div>
  )
}
