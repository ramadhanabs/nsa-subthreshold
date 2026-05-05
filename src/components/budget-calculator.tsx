import { useState, useEffect, useRef } from "react"
import { Calculator, Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { apiFetch } from "@/lib/api"
import {
  WEEKLY_PROFILES,
  calcBaseline,
  computeBudget,
  getDerivedMultipliers,
  fmtHoursMin,
  type WeeklyRisk,
  type RiskProfile,
} from "@/lib/budget"

function useAnimatedNumber(target: number, duration = 400) {
  const [display, setDisplay] = useState(target)
  const frameRef = useRef<number | null>(null)
  const startRef = useRef({ value: target, time: 0 })

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    startRef.current = { value: display, time: performance.now() }
    const from = display
    const to = target

    if (from === to) return

    function tick(now: number) {
      const elapsed = now - startRef.current.time
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      const current = Math.round(from + (to - from) * eased)
      setDisplay(current)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [target])

  return display
}

function AnimatedNum({ value, className }: { value: number; className?: string }) {
  const animated = useAnimatedNumber(value)
  return <span className={className}>{animated}</span>
}

const DOT_COLORS: Record<string, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
  muted: "bg-muted-foreground",
}

function InfoTip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger className="cursor-help">
        <Info size={12} className="text-muted-foreground/60" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px] text-xs leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}

export default function BudgetCalculator() {
  const [baselineMode, setBaselineMode] = useState<"auto" | "manual">("manual")
  const [manualBaseline, setManualBaseline] = useState(360)
  const [autoBaseline, setAutoBaseline] = useState<number | null>(null)
  const [autoError, setAutoError] = useState(false)
  const [weeklyRisk, setWeeklyRisk] = useState<WeeklyRisk>("safe_build")

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
  const { lr: lrMultiplier, q: qMultiplier } = getDerivedMultipliers(weeklyRisk)
  const breakdown = computeBudget({
    baseline,
    weeklyAdj: weeklyProfile.value,
    lrMultiplier,
    qMultiplier,
  })

  return (
    <div className="rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-4 space-y-4">
      {/* Title */}
      <div className="flex items-center gap-1.5">
        <Calculator size={14} className="text-muted-foreground" />
        <span className="text-[13px] font-medium">Training budget</span>
        <InfoTip>
          Calculates your weekly time budget based on a 42-day running average.
          The budget distributes across 3 quality sessions, 3 easy runs, and 1 long run
          while maintaining the 75/25 easy-to-quality ratio.
        </InfoTip>
      </div>

      {/* Baseline */}
      <div className="bg-muted rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span className="text-[0.7rem] text-muted-foreground">Baseline (42-day avg)</span>
            <InfoTip>
              Average weekly running minutes from the last 42 days.
              The 42-day window matches CTL's exponential constant — the baseline
              reflects the same training history as your fitness score.
              Formula: total running minutes ÷ 42 × 7.
            </InfoTip>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setBaselineMode("auto")}
              className={`px-2 py-0.5 rounded-full text-[0.6rem] font-medium transition-all duration-200 cursor-pointer active:scale-95 ${
                baselineMode === "auto"
                  ? "bg-foreground text-background"
                  : "bg-background/50 text-muted-foreground hover:text-foreground hover:bg-background/80 border border-border"
              }`}
            >
              Intervals.icu
            </button>
            <button
              onClick={() => setBaselineMode("manual")}
              className={`px-2 py-0.5 rounded-full text-[0.6rem] font-medium transition-all duration-200 cursor-pointer active:scale-95 ${
                baselineMode === "manual"
                  ? "bg-foreground text-background"
                  : "bg-background/50 text-muted-foreground hover:text-foreground hover:bg-background/80 border border-border"
              }`}
            >
              Manual
            </button>
          </div>
        </div>

        {baselineMode === "auto" ? (
          autoBaseline != null ? (
            <div className="text-xl font-medium font-mono">
              {autoBaseline}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                min/week ({fmtHoursMin(autoBaseline)})
              </span>
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
              className="w-20 text-center font-mono text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
            <span className="text-xs text-muted-foreground">
              min/week ({fmtHoursMin(manualBaseline)})
            </span>
          </div>
        )}
      </div>

      {/* Risk profile — single selector */}
      <div className="bg-muted rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-1">
          <span className="text-[0.7rem] text-muted-foreground">Risk profile</span>
          <InfoTip>
            Controls how aggressively you build training load this week.
            The selected profile sets: weekly budget adjustment ({weeklyProfile.value >= 0 ? "+" : ""}{Math.round(weeklyProfile.value * 100)}%),
            long run multiplier (×{lrMultiplier.toFixed(2)}),
            and Q session multiplier (×{qMultiplier.toFixed(2)}).
          </InfoTip>
        </div>
        <div className="flex flex-wrap gap-1">
          {WEEKLY_PROFILES.map((p: RiskProfile<WeeklyRisk>) => (
            <button
              key={p.key}
              onClick={() => setWeeklyRisk(p.key)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-medium transition-all duration-200 cursor-pointer active:scale-95 ${
                p.key === weeklyRisk
                  ? "bg-foreground text-background shadow-sm scale-[1.02]"
                  : "bg-background/50 text-muted-foreground hover:text-foreground hover:bg-background/80 border border-border"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-transform duration-200 ${p.key === weeklyRisk ? "scale-125" : ""} ${DOT_COLORS[p.color] ?? "bg-muted-foreground"}`} />
              {p.label}
            </button>
          ))}
        </div>
        {weeklyProfile.warning && (
          <div className="text-[0.6rem] text-orange-600 dark:text-orange-400">
            ⚠ {weeklyProfile.warning}
          </div>
        )}
      </div>

      {/* Budget summary */}
      <div className="bg-muted rounded-lg p-3 space-y-1.5">
        <div className="text-[0.7rem] text-muted-foreground mb-2 flex items-center gap-1">
          Budget breakdown
          <InfoTip>
            Weekly budget = baseline × (1 + adjustment%).
            Long run = (baseline ÷ 7) × 3 × multiplier, capped at 30% of weekly.
            Q session = (baseline ÷ 7) × multiplier.
            Easy runs = (weekly − 3×Q − LR) ÷ 3.
          </InfoTip>
        </div>

        <div className="flex justify-between text-[0.65rem]">
          <span className="text-muted-foreground flex items-center gap-1">
            Weekly budget
            <span className="text-[0.55rem]">({weeklyProfile.value >= 0 ? "+" : ""}{Math.round(weeklyProfile.value * 100)}%)</span>
          </span>
          <span className="font-mono font-medium"><AnimatedNum value={breakdown.weeklyBudget} /> min <span className="font-normal text-muted-foreground">({fmtHoursMin(breakdown.weeklyBudget)})</span></span>
        </div>
        <div className="flex justify-between text-[0.65rem]">
          <span className="text-muted-foreground flex items-center gap-1">
            Q session budget
            <span className="text-[0.55rem]">(×{qMultiplier})</span>
          </span>
          <span className="font-mono"><AnimatedNum value={breakdown.qSessionBudget} /> min</span>
        </div>
        <div className="flex justify-between text-[0.65rem]">
          <span className="text-muted-foreground">Easy run budget</span>
          <span className="font-mono"><AnimatedNum value={breakdown.easyRunMin} /> min</span>
        </div>
        <div className="flex justify-between text-[0.65rem]">
          <span className="text-muted-foreground flex items-center gap-1">
            Long run
            <span className="text-[0.55rem]">(×{lrMultiplier})</span>
          </span>
          <span className="font-mono"><AnimatedNum value={breakdown.lrTotal} /> min <span className="text-muted-foreground">({fmtHoursMin(breakdown.lrTotal)})</span></span>
        </div>
      </div>

      {/* Validation */}
      <div className="space-y-1">
        {breakdown.warnings.map((w, i) => (
          <div key={i} className="text-[0.65rem] text-orange-600 dark:text-orange-400 flex items-start gap-1">
            <span className="shrink-0">⚠</span>
            <span>{w}</span>
          </div>
        ))}
        {breakdown.isWithinBudget && breakdown.warnings.length === 0 && (
          <div className="text-[0.65rem] text-emerald-600 dark:text-emerald-400">✓ Within weekly budget</div>
        )}
        {breakdown.isEasyViable && breakdown.warnings.length === 0 && (
          <div className="text-[0.65rem] text-emerald-600 dark:text-emerald-400">✓ Easy runs viable ({breakdown.easyRunMin} min each)</div>
        )}
        {breakdown.isRatioOk && breakdown.warnings.length === 0 && (
          <div className="text-[0.65rem] text-emerald-600 dark:text-emerald-400">✓ Ratio OK — {breakdown.easyPct}% easy+LR / {breakdown.qPct}% quality</div>
        )}
      </div>
    </div>
  )
}
