import { useState } from "react"
import { type InputMode, get5kPace, getHR, getPaceZones, fmtPace } from "@/lib/calculator"
import { RaceInput } from "@/components/race-input"
import { HeartRateInput } from "@/components/heart-rate-input"
import { MetricCards } from "@/components/metric-cards"
import { PaceCard } from "@/components/pace-card"
import { ZoneChart } from "@/components/zone-chart"
import { ZoneCards } from "@/components/zone-cards"

export default function CalculatorPage() {
  const [inputMode, setInputMode] = useState<InputMode>("5k")
  const [inpA, setInpA] = useState(24)
  const [inpB, setInpB] = useState(30)
  const [mhr, setMhr] = useState(208)

  const handleModeChange = (mode: InputMode) => {
    setInputMode(mode)
    const defaults: Record<InputMode, [number, number]> = {
      "5k": [24, 30],
      "10k": [50, 0],
      "half": [1, 50],
      "full": [3, 50],
      "20min": [4, 50],
    }
    const [a, b] = defaults[mode]
    setInpA(a); setInpB(b)
  }

  const fkp = get5kPace(inputMode, inpA, inpB)
  const hr = getHR(mhr)
  const paceZones = getPaceZones(fkp)

  const paceDisplay = inputMode === "20min"
    ? `${(inpA + inpB / 100).toFixed(2)} km`
    : `${fmtPace(fkp)}/km`

  return (
    <div className="max-w-[740px] mx-auto px-5 py-8 pb-12 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          Sub-threshold training calculator
        </h1>
        <p className="text-sm text-muted-foreground max-w-[520px]">
          Norwegian Singles method — derive your sub-threshold paces and HR zones
          from a race result (5K to marathon) or 20-minute time trial.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <RaceInput
          inputMode={inputMode}
          inpA={inpA}
          inpB={inpB}
          paceDisplay={paceDisplay}
          onModeChange={handleModeChange}
          onInpAChange={setInpA}
          onInpBChange={setInpB}
        />
        <HeartRateInput mhr={mhr} hr={hr} onMhrChange={setMhr} />
      </div>

      <MetricCards hr={hr} />
      <PaceCard paceZones={paceZones} />
      <ZoneChart hr={hr} />
      <ZoneCards hr={hr} />

      <footer className="pt-5 border-t text-xs text-muted-foreground leading-relaxed">
        Based on Sirpoc84's Norwegian Singles method posts (LetsRun, 2023-2025).
        Paces derived from VDOT / Tinman CV equivalencies. LTHR estimated at 89% of
        max HR (Friel method). For best accuracy, confirm LTHR with a solo 30-minute
        time trial. When in doubt, go slower — at 90% of LT pace you still get ~97%
        of the training benefit.
      </footer>
    </div>
  )
}
