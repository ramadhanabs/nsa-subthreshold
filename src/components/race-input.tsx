import { useState } from "react"
import { Timer } from "lucide-react"
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

function maxForA(mode: InputMode): number {
  if (mode === "half" || mode === "full") return 24
  return 59
}

function maxForB(mode: InputMode): number {
  if (mode === "20min") return 99
  return 59
}

function useClampedInput(max: number, onChange: (v: number) => void) {
  const [shake, setShake] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw.length > 2) {
      setShake(true)
      setTimeout(() => setShake(false), 300)
      return
    }
    const v = Number(raw)
    if (v > max) {
      setShake(true)
      setTimeout(() => setShake(false), 300)
      onChange(max)
      return
    }
    onChange(v)
  }

  return { shake, handleChange }
}

export function RaceInput({
  inputMode, inpA, inpB, paceDisplay,
  onModeChange, onInpAChange, onInpBChange,
}: RaceInputProps) {
  const [lblA, separator] = inputLabel(inputMode)
  const fieldA = useClampedInput(maxForA(inputMode), onInpAChange)
  const fieldB = useClampedInput(maxForB(inputMode), onInpBChange)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          <Timer size={14} className="text-muted-foreground" />
          Race / test input
        </CardTitle>
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
            onChange={fieldA.handleChange}
            className={`w-14 text-center font-mono text-sm tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] ${fieldA.shake ? "animate-shake" : ""}`}
          />
          <span className="text-muted-foreground">{separator}</span>
          <Input
            type="number"
            value={inpB}
            onChange={fieldB.handleChange}
            className={`w-14 text-center font-mono text-sm tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] ${fieldB.shake ? "animate-shake" : ""}`}
          />
          <span className="text-xs text-muted-foreground ml-1">{paceDisplay}</span>
        </div>
      </CardContent>
    </Card>
  )
}
