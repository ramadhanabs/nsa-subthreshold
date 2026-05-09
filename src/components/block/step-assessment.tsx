import { useState } from "react"
import { CheckCircle2, XCircle, Loader2, ArrowRight, Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useBlockWizard } from "@/lib/block-wizard-context"

const TREND_ARROWS: Record<string, string> = {
  rising: "\u2197",
  stable: "\u2192",
  declining: "\u2198",
}

export function StepAssessment() {
  const { assessment, error, runAssessment, goToStep } = useBlockWizard()
  const [loading, setLoading] = useState(false)

  async function handleRunAssessment() {
    setLoading(true)
    try {
      await runAssessment()
    } finally {
      setLoading(false)
    }
  }

  // Error state
  if (error && !assessment) {
    return (
      <Card>
        <CardContent className="py-6 px-5 space-y-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-destructive">Assessment Failed</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
          <Button onClick={handleRunAssessment} disabled={loading} variant="outline">
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Before assessment
  if (!assessment) {
    return (
      <Card>
        <CardContent className="py-8 px-5 space-y-4 text-center">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Training Assessment</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Analyze your last 8 weeks of training data from Intervals.icu to determine
              readiness for an NSA block and recommend session parameters.
            </p>
          </div>
          <Button onClick={handleRunAssessment} disabled={loading} size="lg">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              "Run Assessment"
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // After assessment — show results
  const isReady = assessment.readiness === "ready"

  return (
    <Card>
      <CardContent className="py-5 px-5 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label="chart">
            {"\uD83D\uDCCA"}
          </span>
          <h3 className="text-base font-medium">Assessment Summary</h3>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
          <StatRow
            label="Weekly avg volume"
            value={`${assessment.weeklyAvgVolumeHours.toFixed(1)} hrs/week`}
            tip="Average weekly running time over the last 8 weeks. Need ≥3 hrs/week for NSA training."
          />
          <StatRow
            label="Weekly avg distance"
            value={`${assessment.weeklyAvgDistanceKm.toFixed(1)} km/week`}
            tip="Average weekly distance from your last 8 weeks of activities."
          />
          <StatRow
            label="Run frequency"
            value={`${assessment.weeklyAvgFrequency.toFixed(1)} runs/week`}
            tip="Average number of runs per week. NSA requires ≥4 runs/week to support quality + easy day rotation."
          />
          <StatRow
            label="CTL"
            value={`${assessment.ctl} (${assessment.ctlTrend} ${TREND_ARROWS[assessment.ctlTrend] ?? ""})`}
            tip="Chronic Training Load — your long-term fitness. A stable or rising trend means you're building consistently."
          />
          <StatRow
            label="Current TSB"
            value={assessment.tsb >= 0 ? `+${assessment.tsb}` : `${assessment.tsb}`}
            tip="Training Stress Balance (CTL − ATL). Positive = fresh, negative = fatigued. Need > −20 to start a block."
          />
          <StatRow
            label="Volume consistency"
            value={`CV ${assessment.volumeCV.toFixed(0)}%`}
            tip="Coefficient of variation of weekly volumes. Lower = more consistent. Need <30% — high variance means unpredictable training load."
          />
        </div>

        <hr className="border-border" />

        {/* Readiness checklist */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Readiness Checks</p>
          <div className="space-y-2">
            <ReadinessCheck
              passed={assessment.weeklyAvgFrequency >= 4}
              label="Run frequency"
              detail={`${assessment.weeklyAvgFrequency.toFixed(1)} runs/week (need ≥4)`}
            />
            <ReadinessCheck
              passed={assessment.volumeCV < 30}
              label="Volume consistency"
              detail={`CV ${assessment.volumeCV.toFixed(0)}% (need <30%)`}
            />
            <ReadinessCheck
              passed={assessment.weeklyAvgVolumeHours >= 3}
              label="Minimum volume"
              detail={`${assessment.weeklyAvgVolumeHours.toFixed(1)} hrs/week (need ≥3)`}
            />
            <ReadinessCheck
              passed={assessment.ctlTrend !== "declining"}
              label="CTL trend"
              detail={`${assessment.ctlTrend} ${TREND_ARROWS[assessment.ctlTrend] ?? ""}`}
            />
            <ReadinessCheck
              passed={assessment.tsb > -20}
              label="Freshness (TSB)"
              detail={`${assessment.tsb >= 0 ? "+" : ""}${assessment.tsb} (need > -20)`}
            />
          </div>
        </div>

        <hr className="border-border" />

        {/* Verdict + recommendation */}
        <div className="space-y-2">
          <div className={`flex items-center gap-2 ${isReady ? "text-green-600" : "text-destructive"}`}>
            {isReady ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="font-medium">{isReady ? "Ready for NSA block" : "Not ready for NSA block"}</span>
          </div>
          <div className="text-sm text-muted-foreground space-y-1 pl-7">
            <p>Recommended: {assessment.recommendedQSessions} quality sessions/week</p>
            <p>Max sub-threshold volume: {assessment.maxQVolumeMin} min/week (25% ceiling)</p>
            <p>Tier: {assessment.tierLabel}</p>
          </div>
          {!isReady && (
            <p className="text-sm text-muted-foreground pl-7">
              Address the failing checks above, or continue anyway with a conservative setup.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="pt-2 flex gap-3">
          <Button onClick={() => goToStep(2)} variant={isReady ? "default" : "outline"} className="gap-2">
            {isReady ? "Continue" : "Continue Anyway"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function StatRow({ label, value, tip }: { label: string; value: string; tip: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {label}
        <Tooltip>
          <TooltipTrigger className="cursor-help">
            <Info className="w-3 h-3 text-muted-foreground/50" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px] text-xs leading-relaxed">
            {tip}
          </TooltipContent>
        </Tooltip>
      </p>
      <p className="text-sm font-medium font-mono">{value}</p>
    </div>
  )
}

function ReadinessCheck({ passed, label, detail }: { passed: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {passed ? (
        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
      )}
      <span className={passed ? "text-foreground" : "text-red-500"}>{label}</span>
      <span className="text-muted-foreground text-xs ml-auto font-mono">{detail}</span>
    </div>
  )
}
