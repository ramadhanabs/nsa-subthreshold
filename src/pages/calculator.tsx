import { useState, useEffect } from "react"
import { type InputMode, get5kPace, getPaceZones, fmtPace } from "@/lib/calculator"
import { RaceInput } from "@/components/race-input"
import { FtpInput } from "@/components/ftp-input"
import { MetricCards } from "@/components/metric-cards"
import { PaceCard } from "@/components/pace-card"

export default function CalculatorPage() {
  const [inputMode, setInputMode] = useState<InputMode>("5k")
  const [inpA, setInpA] = useState(24)
  const [inpB, setInpB] = useState(30)
  const [ftp, setFtp] = useState(300)

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
  const paceZones = getPaceZones(fkp)

  useEffect(() => {
    localStorage.setItem("nsa-5k-pace", String(fkp))
  }, [fkp])

  useEffect(() => {
    localStorage.setItem("nsa-ftp", String(ftp))
  }, [ftp])

  const paceDisplay = (() => {
    if (inputMode === "20min") return `${(inpA + inpB / 100).toFixed(2)} km`
    if (inputMode === "5k") return `${fmtPace(fkp)}/km`
    const totalSecs = inputMode === "10k"
      ? inpA * 60 + inpB
      : inpA * 3600 + inpB * 60
    const distKm = inputMode === "10k" ? 10 : inputMode === "half" ? 21.0975 : 42.195
    return `${fmtPace(totalSecs / distKm)}/km`
  })()

  return (
    <div className="max-w-[740px] mx-auto px-5 py-8 pb-12 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          Sub-threshold training calculator
        </h1>
        <p className="text-sm text-muted-foreground max-w-[520px]">
          Norwegian Singles method — derive your sub-threshold paces and power zones
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
        <FtpInput ftp={ftp} onFtpChange={setFtp} />
      </div>

      <MetricCards ftp={ftp} />
      <PaceCard paceZones={paceZones} />

      <footer className="pt-5 border-t text-xs text-muted-foreground leading-relaxed">
        Based on Sirpoc84's Norwegian Singles method posts (LetsRun, 2023-2025).
        Paces derived from VDOT / Tinman CV equivalencies. Power zones derived from
        running FTP using standard 7-zone model. For best accuracy, use your
        Intervals.icu FTP value. When in doubt, go slower — at 90% of threshold
        you still get ~97% of the training benefit.
      </footer>
    </div>
  )
}
