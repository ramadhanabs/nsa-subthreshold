import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useBlockWizard } from "@/lib/block-wizard-context"

function snapToMonday(date: string): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
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

export function StepDates() {
  const { setStartDate, goToStep } = useBlockWizard()
  const [selectedDate, setSelectedDate] = useState("")

  const preview = useMemo(() => {
    if (!selectedDate) return null
    const monday = snapToMonday(selectedDate)
    const endDate = new Date(monday.getTime() + 27 * 86400000)
    const inputDay = new Date(selectedDate).getDay()
    const wasSnapped = inputDay !== 1
    return { monday, endDate, wasSnapped }
  }, [selectedDate])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Block Start Date</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="start-date" className="text-sm font-medium">
            Start date
          </label>
          <Input
            id="start-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="max-w-[200px]"
          />
        </div>

        {preview && (
          <div className="rounded-lg border bg-muted/50 p-4 space-y-1">
            <p className="text-sm font-medium">
              Block: {formatDate(preview.monday)} &rarr;{" "}
              {formatDate(preview.endDate)}
            </p>
            {preview.wasSnapped && (
              <p className="text-xs text-muted-foreground">
                Adjusted to nearest Monday
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => goToStep(1)}>
            &larr; Back
          </Button>
          <Button disabled={!selectedDate} onClick={() => setStartDate(selectedDate)}>
            Continue &rarr;
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
