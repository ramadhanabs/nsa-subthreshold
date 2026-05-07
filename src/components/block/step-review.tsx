import { Check, X, Pencil } from "lucide-react"
import { useBlockWizard } from "@/lib/block-wizard-context"
import type { WeekPlan } from "@/lib/block-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

function getProgression(
  weekNumber: number,
  totalMin: number,
  week1TotalMin: number,
  weekType: string,
): string {
  if (weekType === "deload") return "deload"
  if (weekNumber === 1) return "baseline"
  const pct = ((totalMin - week1TotalMin) / week1TotalMin) * 100
  const sign = pct >= 0 ? "+" : ""
  return `${sign}${Math.round(pct)}%`
}

function getQSessionLabel(week: WeekPlan): string {
  const n = week.summary.numQualitySessions
  if (week.weekType === "deload") {
    return `${n}${n > 0 ? " + TT" : ""}`
  }
  return `${n}`
}

interface ComplianceCheck {
  label: string
  passed: boolean
}

function getComplianceChecks(weeks: (WeekPlan | null)[]): ComplianceCheck[] {
  const filled = weeks.filter((w): w is WeekPlan => w !== null)
  if (filled.length === 0) return []

  const allQUnder25 = filled.every((w) => w.summary.qualityPercentage <= 25)

  const buildWeeks = filled
    .filter((w) => w.weekType === "build")
    .sort((a, b) => a.weekNumber - b.weekNumber)
  const progressiveOverload =
    buildWeeks.length >= 2 &&
    buildWeeks.every(
      (w, i) =>
        i === 0 || w.summary.totalDurationMin > buildWeeks[i - 1].summary.totalDurationMin,
    )

  const w3 = filled.find((w) => w.weekNumber === 3)
  const w4 = filled.find((w) => w.weekNumber === 4)
  const deloadOk =
    w3 != null &&
    w4 != null &&
    w4.summary.totalDurationMin <= w3.summary.totalDurationMin * 0.6

  const testInW4 =
    w4 != null &&
    w4.days.some(
      (d) =>
        d.type === "quality" &&
        d.template != null &&
        (d.template.id === "t1" || d.template.id === "t2"),
    )

  return [
    { label: "All weeks quality % <= 25%", passed: allQUnder25 },
    { label: "Progressive overload: W1 < W2 < W3 total volume", passed: progressiveOverload },
    { label: "Deload: W4 at <= 60% of W3", passed: deloadOk },
    { label: "Test workout present in W4", passed: testInW4 },
  ]
}

export function StepReview() {
  const { weeks, editWeek, saveDraft, confirmBlock, goToStep, error } = useBlockWizard()

  const filledWeeks = weeks.filter((w): w is WeekPlan => w !== null)
  const week1Total = filledWeeks.find((w) => w.weekNumber === 1)?.summary.totalDurationMin ?? 0
  const checks = getComplianceChecks(weeks)
  const allPassed = checks.length > 0 && checks.every((c) => c.passed)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Block Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead>Total Vol</TableHead>
                <TableHead>Q Vol</TableHead>
                <TableHead>Q %</TableHead>
                <TableHead>Q Sessions</TableHead>
                <TableHead>Progression</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {([1, 2, 3, 4] as const).map((n) => {
                const week = weeks[n - 1]
                if (!week) {
                  return (
                    <TableRow key={n}>
                      <TableCell className="font-medium">Week {n}</TableCell>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        Not planned yet
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editWeek(n)}
                          className="h-7 w-7 p-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                }
                const { summary } = week
                return (
                  <TableRow key={n}>
                    <TableCell className="font-medium">Week {n}</TableCell>
                    <TableCell>{formatDuration(summary.totalDurationMin)}</TableCell>
                    <TableCell>{formatDuration(summary.qualityDurationMin)}</TableCell>
                    <TableCell>{Math.round(summary.qualityPercentage)}%</TableCell>
                    <TableCell>{getQSessionLabel(week)}</TableCell>
                    <TableCell>
                      {getProgression(n, summary.totalDurationMin, week1Total, week.weekType)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editWeek(n)}
                        className="h-7 w-7 p-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compliance Checks</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {checks.map((check) => (
              <li key={check.label} className="flex items-center gap-2 text-sm">
                {check.passed ? (
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-red-500 shrink-0" />
                )}
                <span className={check.passed ? "text-foreground" : "text-red-500"}>
                  {check.label}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="outline" onClick={() => goToStep(3)}>
          &larr; Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={saveDraft}>
            Save as Draft
          </Button>
          <Button onClick={confirmBlock} disabled={!allPassed}>
            Confirm &amp; Push &rarr;
          </Button>
        </div>
      </div>
    </div>
  )
}
