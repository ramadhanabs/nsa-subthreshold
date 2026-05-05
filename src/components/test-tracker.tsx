import { useState } from "react"
import { format, parse } from "date-fns"
import { Plus, Timer, Route, FlaskConical, CalendarIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { get5kPace, fmtPace } from "@/lib/calculator"

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="w-full flex items-center justify-start gap-2 h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs font-normal hover:bg-muted/50 transition-colors cursor-pointer">
        <CalendarIcon size={14} className="text-muted-foreground" />
        {value ? format(parse(value, "yyyy-MM-dd", new Date()), "MMM d, yyyy") : "Pick a date"}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, "yyyy-MM-dd"))
              setOpen(false)
            }
          }}
          disabled={{ after: new Date() }}
          defaultMonth={selected}
        />
      </PopoverContent>
    </Popover>
  )
}

interface TestResult {
  id: string
  test_type: string
  test_date: string
  value_a: number
  value_b: number
  max_hr: number | null
  notes: string | null
  created_at: string
}

interface TestTrackerProps {
  tests: TestResult[]
  onAdd: (data: {
    test_type: string
    test_date: string
    value_a: number
    value_b: number
  }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-")
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`
}

const today = () => new Date().toISOString().slice(0, 10)

export default function TestTracker({ tests, onAdd, onDelete }: TestTrackerProps) {
  const tests5k = tests
    .filter((t) => t.test_type === "5k")
    .sort((a, b) => b.test_date.localeCompare(a.test_date))
  const chrono5k = [...tests5k].reverse()

  const tests20 = tests
    .filter((t) => t.test_type === "20min")
    .sort((a, b) => b.test_date.localeCompare(a.test_date))
  const chrono20 = [...tests20].reverse()

  return (
    <div className="rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-4">
      <div className="text-[13px] font-medium mb-3 flex items-center gap-1.5">
        <FlaskConical size={14} className="text-muted-foreground" />
        Test tracker
      </div>
      <Tabs defaultValue="5k">
        <TabsList>
          <TabsTrigger value="5k">5K time trial</TabsTrigger>
          <TabsTrigger value="20min">20-minute test</TabsTrigger>
        </TabsList>

        <TabsContent value="5k" className="mt-4">
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-left-2 duration-300">
            <Metrics5K tests={chrono5k} />
            <Form5K onAdd={onAdd} />
            <History5K tests={tests5k} chrono={chrono5k} onDelete={onDelete} />
          </div>
        </TabsContent>

        <TabsContent value="20min" className="mt-4">
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-2 duration-300">
            <Metrics20Min tests={chrono20} />
            <Form20Min onAdd={onAdd} />
            <History20Min tests={tests20} chrono={chrono20} onDelete={onDelete} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ── Metrics ── */

function Metrics5K({ tests }: { tests: TestResult[] }) {
  const latest = tests.length > 0 ? tests[tests.length - 1] : null
  const first = tests.length > 0 ? tests[0] : null

  const latestPace = latest ? get5kPace("5k", latest.value_a, latest.value_b) : 0
  const thresholdPace = latestPace * 1.02
  const cvPace = latestPace

  let improvement = "\u2014"
  let improvementColor = "text-muted-foreground"
  if (first && latest && tests.length >= 2) {
    const firstTotal = first.value_a * 60 + first.value_b
    const latestTotal = latest.value_a * 60 + latest.value_b
    const diff = firstTotal - latestTotal
    if (diff > 0) {
      improvement = `${diff}s faster`
      improvementColor = "text-teal-700 dark:text-teal-400"
    } else if (diff < 0) {
      improvement = `${Math.abs(diff)}s slower`
      improvementColor = "text-red-600 dark:text-red-400"
    } else {
      improvement = "No change"
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <MetricCard
        label="Latest 5K"
        value={latest ? `${latest.value_a}:${String(latest.value_b).padStart(2, "0")}` : "\u2014"}
        subtitle={latest ? fmtDate(latest.test_date) : undefined}
      />
      <MetricCard
        label="Threshold pace"
        value={latest ? fmtPace(thresholdPace) : "\u2014"}
        suffix="/km"
      />
      <MetricCard
        label="CV pace"
        value={latest ? fmtPace(cvPace) : "\u2014"}
        suffix="/km"
      />
      <MetricCard
        label="Improvement"
        value={improvement}
        valueClassName={improvementColor}
        subtitle={tests.length >= 2 ? `over ${tests.length} tests` : undefined}
      />
    </div>
  )
}

function Metrics20Min({ tests }: { tests: TestResult[] }) {
  const latest = tests.length > 0 ? tests[tests.length - 1] : null
  const first = tests.length > 0 ? tests[0] : null

  const latestDist = latest ? latest.value_a + latest.value_b / 100 : 0
  const pace20 = latestDist > 0 ? 1200 / latestDist : 0
  const estThreshold = pace20 * 1.02

  let improvement = "\u2014"
  let improvementColor = "text-muted-foreground"
  if (first && latest && tests.length >= 2) {
    const firstDist = first.value_a + first.value_b / 100
    const diff = Math.round((latestDist - firstDist) * 1000)
    if (diff > 0) {
      improvement = `+${diff}m`
      improvementColor = "text-teal-700 dark:text-teal-400"
    } else if (diff < 0) {
      improvement = `${diff}m`
      improvementColor = "text-red-600 dark:text-red-400"
    } else {
      improvement = "No change"
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <MetricCard
        label="Latest distance"
        value={latest ? latestDist.toFixed(2) : "\u2014"}
        suffix=" km"
        subtitle={latest ? fmtDate(latest.test_date) : undefined}
      />
      <MetricCard
        label="20-min pace"
        value={latest ? fmtPace(pace20) : "\u2014"}
        suffix="/km"
      />
      <MetricCard
        label="Est. threshold"
        value={latest ? fmtPace(estThreshold) : "\u2014"}
        suffix="/km"
      />
      <MetricCard
        label="Improvement"
        value={improvement}
        valueClassName={improvementColor}
        subtitle={tests.length >= 2 ? `over ${tests.length} tests` : undefined}
      />
    </div>
  )
}

function MetricCard({
  label,
  value,
  suffix,
  subtitle,
  valueClassName,
}: {
  label: string
  value: string
  suffix?: string
  subtitle?: string
  valueClassName?: string
}) {
  return (
    <div className="bg-muted rounded-lg p-2.5">
      <div className="text-[0.65rem] text-muted-foreground">{label}</div>
      <div className={`text-xl font-medium font-mono ${valueClassName ?? ""}`}>
        {value}
        {suffix && (
          <span className="text-[0.65rem] text-muted-foreground">{suffix}</span>
        )}
      </div>
      {subtitle && (
        <div className="text-[0.6rem] text-muted-foreground">{subtitle}</div>
      )}
    </div>
  )
}

/* ── Forms ── */

function Form5K({
  onAdd,
}: {
  onAdd: TestTrackerProps["onAdd"]
}) {
  const [date, setDate] = useState(today())
  const [min, setMin] = useState(24)
  const [sec, setSec] = useState(30)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!date || min === 0) return
    setSubmitting(true)
    try {
      await onAdd({ test_type: "5k", test_date: date, value_a: min, value_b: sec })
      setDate(today())
      setMin(24)
      setSec(30)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-muted/50 rounded-xl p-4 border border-border">
      <div className="text-[13px] font-medium mb-1 flex items-center gap-1.5">
        <Timer size={14} className="text-teal-500 dark:text-teal-400" />
        Record 5K result
      </div>
      <div className="text-xs text-muted-foreground mb-3">
        From a 5K race, parkrun, or solo time trial
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Date</label>
          <DatePicker value={date} onChange={setDate} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            5K finish time (mm:ss)
          </label>
          <div className="flex gap-1 items-center">
            <Input
              type="number"
              value={min}
              min={0}
              max={59}
              onChange={(e) => {
                const raw = e.target.value
                if (raw.length > 2) return
                const v = parseInt(raw) || 0
                setMin(Math.min(59, v))
              }}
              className="text-xs text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
            <span className="text-muted-foreground">:</span>
            <Input
              type="number"
              value={sec}
              min={0}
              max={59}
              onChange={(e) => {
                const raw = e.target.value
                if (raw.length > 2) return
                const v = parseInt(raw) || 0
                setSec(Math.min(59, v))
              }}
              className="text-xs text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-foreground text-background hover:bg-foreground/90"
        >
          <Plus size={14} className="text-teal-400" />
          Add
        </Button>
      </div>
    </div>
  )
}

function Form20Min({
  onAdd,
}: {
  onAdd: TestTrackerProps["onAdd"]
}) {
  const [date, setDate] = useState(today())
  const [dist, setDist] = useState("3.85")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    const d = parseFloat(dist)
    if (!date || !d) return
    const valueA = Math.floor(d)
    const valueB = Math.round((d - valueA) * 100)
    setSubmitting(true)
    try {
      await onAdd({ test_type: "20min", test_date: date, value_a: valueA, value_b: valueB })
      setDate(today())
      setDist("3.85")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-muted/50 rounded-xl p-4 border border-border">
      <div className="text-[13px] font-medium mb-1 flex items-center gap-1.5">
        <Route size={14} className="text-orange-500 dark:text-orange-400" />
        Record 20-minute test
      </div>
      <div className="text-xs text-muted-foreground mb-3">
        Distance covered in a maximal 20-minute effort
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Date</label>
          <DatePicker value={date} onChange={setDate} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Distance (km)
          </label>
          <Input
            type="number"
            value={dist}
            min={1}
            max={8}
            step={0.01}
            onChange={(e) => setDist(e.target.value)}
            className="text-xs text-center"
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-foreground text-background hover:bg-foreground/90"
        >
          <Plus size={14} className="text-orange-400" />
          Add
        </Button>
      </div>
    </div>
  )
}

/* ── History tables ── */

const gridCols =
  "grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,0.5fr)_minmax(0,0.5fr)_minmax(0,0.4fr)_28px]"

function History5K({
  tests,
  chrono,
  onDelete,
}: {
  tests: TestResult[]
  chrono: TestResult[]
  onDelete: (id: string) => Promise<void>
}) {
  return (
    <div className="bg-muted/50 rounded-xl overflow-hidden border border-border">
      <div
        className={`grid ${gridCols} px-4 py-2 text-[11px] text-muted-foreground font-medium border-b border-border`}
      >
        <span>Date</span>
        <span>5K time</span>
        <span>Threshold</span>
        <span>CV</span>
        <span>Delta</span>
        <span />
      </div>
      {tests.length === 0 ? (
        <div className="px-4 py-4 text-xs text-muted-foreground text-center">
          No tests yet — record your first result above
        </div>
      ) : (
        tests.map((t) => {
          const pace = get5kPace("5k", t.value_a, t.value_b)
          const threshold = fmtPace(pace * 1.02)
          const cv = fmtPace(pace)

          // find previous test in chronological order
          const ci = chrono.findIndex((c) => c.id === t.id)
          let delta = null as React.ReactNode
          if (ci > 0) {
            const prev = chrono[ci - 1]
            const prevTotal = prev.value_a * 60 + prev.value_b
            const curTotal = t.value_a * 60 + t.value_b
            const diff = prevTotal - curTotal
            if (diff > 0)
              delta = (
                <span className="text-[11px] text-teal-700 dark:text-teal-400">
                  -{diff}s
                </span>
              )
            else if (diff < 0)
              delta = (
                <span className="text-[11px] text-red-600 dark:text-red-400">
                  +{Math.abs(diff)}s
                </span>
              )
          }

          return (
            <div
              key={t.id}
              className={`grid ${gridCols} px-4 py-2 items-center border-b border-border text-xs`}
            >
              <div className="font-medium">{fmtDate(t.test_date)}</div>
              <div className="text-muted-foreground">
                {t.value_a}:{String(t.value_b).padStart(2, "0")}
              </div>
              <div className="font-mono text-teal-700 dark:text-teal-400">
                {threshold}
              </div>
              <div className="font-mono text-violet-700 dark:text-violet-400">
                {cv}
              </div>
              <div>{delta}</div>
              <button
                onClick={() => onDelete(t.id)}
                className="text-center text-muted-foreground hover:text-foreground text-[11px] cursor-pointer"
              >
                x
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}

function History20Min({
  tests,
  chrono,
  onDelete,
}: {
  tests: TestResult[]
  chrono: TestResult[]
  onDelete: (id: string) => Promise<void>
}) {
  return (
    <div className="bg-muted/50 rounded-xl overflow-hidden border border-border">
      <div
        className={`grid ${gridCols} px-4 py-2 text-[11px] text-muted-foreground font-medium border-b border-border`}
      >
        <span>Date</span>
        <span>Distance</span>
        <span>Pace</span>
        <span>Threshold</span>
        <span>Delta</span>
        <span />
      </div>
      {tests.length === 0 ? (
        <div className="px-4 py-4 text-xs text-muted-foreground text-center">
          No tests yet — record your first result above
        </div>
      ) : (
        tests.map((t) => {
          const dist = t.value_a + t.value_b / 100
          const pace = 1200 / dist
          const threshold = fmtPace(pace * 1.02)

          const ci = chrono.findIndex((c) => c.id === t.id)
          let delta = null as React.ReactNode
          if (ci > 0) {
            const prev = chrono[ci - 1]
            const prevDist = prev.value_a + prev.value_b / 100
            const diff = Math.round((dist - prevDist) * 1000)
            if (diff > 0)
              delta = (
                <span className="text-[11px] text-teal-700 dark:text-teal-400">
                  +{diff}m
                </span>
              )
            else if (diff < 0)
              delta = (
                <span className="text-[11px] text-red-600 dark:text-red-400">
                  {diff}m
                </span>
              )
          }

          return (
            <div
              key={t.id}
              className={`grid ${gridCols} px-4 py-2 items-center border-b border-border text-xs`}
            >
              <div className="font-medium">{fmtDate(t.test_date)}</div>
              <div className="text-muted-foreground">{dist.toFixed(2)} km</div>
              <div className="font-mono text-orange-700 dark:text-orange-400">
                {fmtPace(pace)}
              </div>
              <div className="font-mono text-teal-700 dark:text-teal-400">
                {threshold}
              </div>
              <div>{delta}</div>
              <button
                onClick={() => onDelete(t.id)}
                className="text-center text-muted-foreground hover:text-foreground text-[11px] cursor-pointer"
              >
                x
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}
