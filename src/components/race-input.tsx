import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type InputMode } from "@/lib/calculator"

interface RaceInputProps {
  inputMode: InputMode
  inpA: number
  inpB: number
  paceDisplay: string
  onModeChange: (mode: InputMode) => void
  onInpAChange: (v: number) => void
  onInpBChange: (v: number) => void
}

export function RaceInput({
  inputMode, inpA, inpB, paceDisplay,
  onModeChange, onInpAChange, onInpBChange,
}: RaceInputProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Race / test input</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1.5">
          <Button
            variant={inputMode === "5k" ? "default" : "outline"}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onModeChange("5k")}
          >
            5K race
          </Button>
          <Button
            variant={inputMode === "20min" ? "default" : "outline"}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onModeChange("20min")}
          >
            20' test
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground min-w-7">
            {inputMode === "5k" ? "Min" : "Dist"}
          </label>
          <Input
            type="number"
            value={inpA}
            onChange={(e) => onInpAChange(Number(e.target.value))}
            className="w-14 text-center font-mono text-sm"
          />
          <span className="text-muted-foreground">:</span>
          <Input
            type="number"
            value={inpB}
            onChange={(e) => onInpBChange(Number(e.target.value))}
            className="w-14 text-center font-mono text-sm"
          />
          <span className="text-xs text-muted-foreground ml-1">{paceDisplay}</span>
        </div>
      </CardContent>
    </Card>
  )
}
