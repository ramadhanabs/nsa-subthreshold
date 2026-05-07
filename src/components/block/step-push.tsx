import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useBlockWizard } from "@/lib/block-wizard-context"

export function StepPush() {
  const { pushStatus, error, pushBlock, reset, goToStep } = useBlockWizard()

  if (pushStatus === "pushing") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Pushing events to Intervals.icu...</p>
        </CardContent>
      </Card>
    )
  }

  if (pushStatus === "done") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <CheckCircle2 className="size-10 text-green-600" />
          <div className="text-center space-y-1">
            <p className="font-medium text-lg">Block pushed successfully!</p>
            <p className="text-muted-foreground">
              Your workouts are now on your Intervals.icu calendar.
            </p>
          </div>
          <Button variant="outline" onClick={reset} className="mt-4">
            Create Another Block
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (pushStatus === "error") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <XCircle className="size-10 text-destructive" />
          <div className="text-center space-y-1">
            <p className="font-medium text-lg">Push failed</p>
            {error && (
              <p className="text-sm text-muted-foreground">{error}</p>
            )}
          </div>
          <Button onClick={() => goToStep(5)} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  // idle state
  return (
    <Card>
      <CardHeader>
        <CardTitle>Push to Intervals.icu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Choose how to handle existing events on your Intervals.icu calendar
          during this block's date range.
        </p>

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Button
              className="w-full"
              variant="destructive"
              onClick={() => {
                if (confirm("This will remove existing planned events in the date range. Continue?")) {
                  pushBlock("override")
                }
              }}
            >
              Override existing events
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Removes existing planned events in the date range first
            </p>
          </div>

          <div className="space-y-1">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => pushBlock("add_alongside")}
            >
              Add alongside existing
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Keeps existing events and adds the new block workouts
            </p>
          </div>
        </div>

        <Button variant="ghost" onClick={() => goToStep(4)}>
          &larr; Back
        </Button>
      </CardContent>
    </Card>
  )
}
