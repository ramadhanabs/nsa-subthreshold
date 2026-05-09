import { useState, useMemo } from "react"
import { CalendarIcon, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useBlockWizard } from "@/lib/block-wizard-context"

function snapToNextMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  if (day === 1) return d // already Monday
  const diff = day === 0 ? 1 : 8 - day // Sunday → tomorrow, others → next Monday
  d.setDate(d.getDate() + diff)
  return d
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function StepDates() {
  const { setStartDate, goToStep } = useBlockWizard()
  const [selected, setSelected] = useState<Date | undefined>()
  const [open, setOpen] = useState(false)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const preview = useMemo(() => {
    if (!selected) return null
    const monday = snapToNextMonday(selected)
    const endDate = new Date(monday.getTime() + 27 * 86400000)
    const wasSnapped = selected.getDay() !== 1
    return { monday, endDate, wasSnapped }
  }, [selected])

  // Validation
  const validation = useMemo(() => {
    if (!preview) return null
    const errors: string[] = []
    const warnings: string[] = []

    if (preview.monday < today) {
      errors.push("Start date must be today or in the future")
    }

    const daysUntilStart = Math.ceil((preview.monday.getTime() - today.getTime()) / 86400000)
    if (daysUntilStart > 90) {
      warnings.push("Start date is more than 3 months away — assessment data may be stale by then")
    }

    return { errors, warnings, isValid: errors.length === 0 }
  }, [preview, today])

  const handleContinue = () => {
    if (!preview || !validation?.isValid) return
    setStartDate(toDateStr(preview.monday))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Block Start Date</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Start date</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              className="flex h-9 w-[260px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              {selected ? (
                <span>{formatDate(selected)}</span>
              ) : (
                <span className="text-muted-foreground">Pick a date</span>
              )}
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selected}
                onSelect={(date) => {
                  setSelected(date ?? undefined)
                  setOpen(false)
                }}
                disabled={{ before: today }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {preview && (
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">
              Block: {formatDate(preview.monday)} &rarr; {formatDate(preview.endDate)}
            </p>
            <p className="text-xs text-muted-foreground">4 weeks (3 build + 1 deload/test)</p>
            {preview.wasSnapped && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Adjusted to nearest Monday
              </p>
            )}
          </div>
        )}

        {validation?.errors.map((err, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {err}
          </div>
        ))}

        {validation?.warnings.map((warn, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {warn}
          </div>
        ))}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => goToStep(1)}>
            &larr; Back
          </Button>
          <Button
            disabled={!selected || !validation?.isValid}
            onClick={handleContinue}
          >
            Continue &rarr;
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
