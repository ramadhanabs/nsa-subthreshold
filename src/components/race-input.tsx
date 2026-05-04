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

const modes: { mode: InputMode; label: string }[] = [
  { mode: "5k", label: "5K" },
  { mode: "10k", label: "10K" },
  { mode: "half", label: "Half" },
  { mode: "full", label: "Full" },
  { mode: "20min", label: "20' test" },
]

function inputLabel(mode: InputMode): [string, string] {
  if (mode === "20min") return ["Dist", "."]
  if (mode === "half" || mode === "full") return ["Hr", ":"]
  return ["Min", ":"]
}

export function RaceInput({
  inputMode, inpA, inpB, paceDisplay,
  onModeChange, onInpAChange, onInpBChange,
}: RaceInputProps) {
  const [lblA, separator] = inputLabel(inputMode)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Race / test input</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1.5">
          {modes.map((m) => (
            <Button
              key={m.mode}
              variant={inputMode === m.mode ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs px-1"
              onClick={() => onModeChange(m.mode)}
            >
              {m.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground min-w-7">
            {lblA}
          </label>
          <Input
            type="number"
            value={inpA}
            onChange={(e) => onInpAChange(Number(e.target.value))}
            className="w-14 text-center font-mono text-sm"
          />
          <span className="text-muted-foreground">{separator}</span>
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
