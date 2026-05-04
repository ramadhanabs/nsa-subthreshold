import { useState } from "react"
import { ChevronDown, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WeeklySummaryProps {
  totalQWorkMin: number
  totalEasyAll: number
  totalQWuCdMin: number
  totalSubT: number
  totalWeekMin: number
  qPct: number
  ePct: number
  ratioOk: boolean
  ratioClose: boolean
  neededEasyMin: number
  qDayCount: number
  restDayCount: number
  onReset: () => void
}

export function WeeklySummary({
  totalQWorkMin,
  totalEasyAll,
  totalQWuCdMin,
  totalSubT,
  totalWeekMin,
  qPct,
  ePct,
  ratioOk,
  ratioClose,
  neededEasyMin,
  qDayCount,
  restDayCount,
  onReset,
}: WeeklySummaryProps) {
  const [expanded, setExpanded] = useState(false)
  const empty = totalWeekMin === 0

  // Status message logic
  let statusClass: string
  let statusText: string

  if (empty) {
    statusClass = "bg-muted text-muted-foreground"
    statusText = "Drag quality sessions to day slots to start planning"
  } else if (ratioOk) {
    statusClass =
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    statusText = `Ratio achieved — ${ePct}% easy+LR / ${qPct}% quality`
  } else if (ratioClose) {
    statusClass =
      "bg-amber-500/10 text-amber-700 dark:text-amber-400"
    statusText = `Almost there — ${ePct}% easy+LR / ${qPct}% quality`
  } else if (ePct < 70) {
    statusClass = "bg-red-500/10 text-red-700 dark:text-red-400"
    statusText = `Too much quality (${qPct}%). Add ${neededEasyMin}+ more easy minutes.`
  } else {
    statusClass =
      "bg-amber-500/10 text-amber-700 dark:text-amber-400"
    statusText = "Heavy on easy — you could add more quality volume"
  }

  return (
    <div className="bg-muted/50 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 lg:pointer-events-none"
        >
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <BarChart3 size={14} className="text-muted-foreground" />
            Weekly summary
          </h3>
          <ChevronDown
            size={14}
            className={`text-muted-foreground transition-transform duration-200 lg:hidden ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>

      {/* Ratio progress bar — always visible */}
      <div className="relative h-9 rounded-full bg-muted mb-3">
        {empty ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Add sessions to see ratio
          </div>
        ) : (
          <div className="flex h-full items-center gap-1.5 p-1">
            <div
              className="flex h-full items-center justify-center rounded-full border text-[0.7rem] font-medium transition-all duration-500 ease-out animate-pulse"
              style={{
                width: `${qPct}%`,
                backgroundColor: "var(--color-session-quality-bg)",
                color: "var(--color-session-quality-text)",
                borderColor: "color-mix(in srgb, var(--color-session-quality) 30%, transparent)",
                minWidth: qPct > 0 ? 28 : 0,
              }}
            >
              {qPct > 10 && `Q ${qPct}%`}
            </div>
            <div
              className="flex h-full items-center justify-center rounded-full border text-[0.7rem] font-medium transition-all duration-500 ease-out"
              style={{
                width: `${ePct}%`,
                backgroundColor: "var(--color-session-easy-bg)",
                color: "var(--color-session-easy-text)",
                borderColor: "color-mix(in srgb, var(--color-session-easy) 30%, transparent)",
                minWidth: ePct > 0 ? 28 : 0,
              }}
            >
              {ePct > 10 && `E+LR ${ePct}%`}
            </div>
          </div>
        )}
      </div>

      {/* Status message — always visible */}
      <div
        className={`rounded-md px-3 py-1.5 text-xs font-medium mb-3 ${statusClass}`}
      >
        {statusText}
      </div>

      {/* Collapsible content — toggled on mobile, always open on lg */}
      <div className={`${expanded ? "block" : "hidden"} lg:block`}>
        {/* Stat cards row 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="bg-muted rounded-lg px-3 py-2.5">
            <div className="text-[0.7rem] text-muted-foreground mb-0.5">
              Quality work
            </div>
            <div className="text-xl font-medium font-mono">
              {totalQWorkMin}
              <span className="text-xs font-normal text-muted-foreground">m</span>
            </div>
            <div className="text-[0.65rem] text-muted-foreground">
              sub-T + rest
            </div>
          </div>
          <div className="bg-muted rounded-lg px-3 py-2.5">
            <div className="text-[0.7rem] text-muted-foreground mb-0.5">
              Easy total
            </div>
            <div className="text-xl font-medium font-mono">
              {totalEasyAll}
              <span className="text-xs font-normal text-muted-foreground">m</span>
            </div>
            <div className="text-[0.65rem] text-muted-foreground">
              runs + WU/CD + LR
            </div>
          </div>
          <div className="bg-muted rounded-lg px-3 py-2.5">
            <div className="text-[0.7rem] text-muted-foreground mb-0.5">
              WU/CD from Q
            </div>
            <div className="text-xl font-medium font-mono">
              {totalQWuCdMin}
              <span className="text-xs font-normal text-muted-foreground">m</span>
            </div>
            <div className="text-[0.65rem] text-muted-foreground">
              counts as easy
            </div>
          </div>
          <div className="bg-muted rounded-lg px-3 py-2.5">
            <div className="text-[0.7rem] text-muted-foreground mb-0.5">
              Sub-T total
            </div>
            <div className="text-xl font-medium font-mono">
              {totalSubT}
              <span className="text-xs font-normal text-muted-foreground">m</span>
            </div>
            <div className="text-[0.65rem] text-muted-foreground">work only</div>
          </div>
        </div>

        {/* Stat cards row 2 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
          <div className="bg-muted rounded-lg px-3 py-2.5">
            <div className="text-[0.7rem] text-muted-foreground mb-0.5">
              Total week
            </div>
            <div className="text-xl font-medium font-mono">
              {totalWeekMin}
              <span className="text-xs font-normal text-muted-foreground">m</span>
            </div>
          </div>
          <div className="bg-muted rounded-lg px-3 py-2.5">
            <div className="text-[0.7rem] text-muted-foreground mb-0.5">
              Weekly hours
            </div>
            <div className="text-xl font-medium font-mono">
              {(totalWeekMin / 60).toFixed(1)}
              <span className="text-xs font-normal text-muted-foreground">h</span>
            </div>
          </div>
          <div className="bg-muted rounded-lg px-3 py-2.5">
            <div className="text-[0.7rem] text-muted-foreground mb-0.5">
              Q sessions
            </div>
            <div className="text-xl font-medium font-mono">{qDayCount}</div>
          </div>
          <div className="bg-muted rounded-lg px-3 py-2.5">
            <div className="text-[0.7rem] text-muted-foreground mb-0.5">
              Run days
            </div>
            <div className="text-xl font-medium font-mono">
              {7 - restDayCount}
            </div>
          </div>
        </div>

        {/* Footer tip */}
        <p className="text-xs text-muted-foreground mt-3">
          Standard NSA patterns: E-Q-E-Q-E-Q-LR or R-Q-E-Q-E-Q-LR. Never place
          two Q days back-to-back. Target 75% easy+LR / 25% quality by time.
        </p>
      </div>
    </div>
  )
}
