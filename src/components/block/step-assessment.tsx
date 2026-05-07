import { useState } from "react"
import { AlertTriangle, CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
          <StatRow label="Weekly avg volume" value={`${assessment.weeklyAvgVolumeHours.toFixed(1)} hrs/week`} />
          <StatRow label="Weekly avg distance" value={`${assessment.weeklyAvgDistanceKm.toFixed(1)} km/week`} />
          <StatRow label="Run frequency" value={`${assessment.weeklyAvgFrequency.toFixed(1)} runs/week`} />
          <StatRow
            label="CTL"
            value={`${assessment.ctl} (${assessment.ctlTrend} ${TREND_ARROWS[assessment.ctlTrend] ?? ""})`}
          />
          <StatRow label="Current TSB" value={assessment.tsb >= 0 ? `+${assessment.tsb}` : `${assessment.tsb}`} />
          <StatRow label="Volume consistency" value={`CV ${assessment.volumeCV.toFixed(0)}%`} />
        </div>

        <hr className="border-border" />

        {/* Readiness verdict */}
        {isReady ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Ready for NSA block</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1 pl-7">
              <p>Recommended: {assessment.recommendedQSessions} quality sessions/week</p>
              <p>Max sub-threshold volume: {assessment.maxQVolumeMin} min/week (25% ceiling)</p>
              <p>Tier: {assessment.tierLabel}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Not ready for NSA block</span>
            </div>
            {assessment.flags.length > 0 && (
              <ul className="space-y-2 pl-2">
                {assessment.flags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{flag}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm text-muted-foreground pl-2">
              Address the issues above before starting an NSA block.
            </p>
          </div>
        )}

        {/* Flags even when ready (informational) */}
        {isReady && assessment.flags.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</p>
            <ul className="space-y-1.5">
              {assessment.flags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {isReady && (
          <div className="pt-2">
            <Button onClick={() => goToStep(2)} className="gap-2">
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium font-mono">{value}</p>
    </div>
  )
}
