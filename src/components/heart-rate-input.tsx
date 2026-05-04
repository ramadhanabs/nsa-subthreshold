import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import type { HRZones } from "@/lib/calculator"

interface HeartRateInputProps {
  mhr: number
  hr: HRZones
  onMhrChange: (v: number) => void
}

export function HeartRateInput({ mhr, hr, onMhrChange }: HeartRateInputProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Heart rate input</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground min-w-12">Max HR</label>
          <Slider
            value={[mhr]}
            onValueChange={([v]) => onMhrChange(v)}
            min={180}
            max={215}
            step={1}
            className="flex-1"
          />
          <span className="text-base font-medium font-mono min-w-9 text-right">{mhr}</span>
        </div>
        <div className="flex gap-3.5 text-xs text-muted-foreground">
          <span>LTHR: <strong className="font-medium text-foreground">{hr.lthr}</strong></span>
          <span>Easy cap: <strong className="font-medium text-foreground">{hr.easy}</strong></span>
        </div>
      </CardContent>
    </Card>
  )
}
