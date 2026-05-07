import { useState, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getPaceZones } from "@/lib/calculator"
import { useBlockWizard } from "@/lib/block-wizard-context"
import { computeWeekSummary } from "@/lib/block-utils"
import { QualityPalette } from "@/components/planner/quality-palette"
import { WeekGrid } from "@/components/planner/week-grid"
import {
  initWeek,
  SESSION_META,
  type DaySlotData,
  type QTemplate,
  type SessionType,
} from "@/lib/planner-data"
import type { WeekPlan } from "@/lib/block-types"

const WEEK_LABELS = ["Week 1 (Build)", "Week 2 (Build)", "Week 3 (Build)", "Week 4 (Deload)"]

export function StepWeeks() {
  const {
    activeWeek,
    weeks,
    assessment,
    startDate,
    saveWeek,
    goToWeek,
    goToStep,
  } = useBlockWizard()

  // Local state for the current week being edited
  const [week, setWeek] = useState<DaySlotData[]>(() => {
    const existing = weeks[activeWeek - 1]
    return existing ? [...existing.days] : initWeek()
  })
  const [catFilter, setCatFilter] = useState(activeWeek === 4 ? "test" : "all")
  const [easyInputs, setEasyInputs] = useState<Record<string, number>>({})
  const [strides, setStrides] = useState<Record<string, boolean>>({})
  const [longMin, setLongMin] = useState(75)
  const [defaultWu, setDefaultWu] = useState(10)
  const [defaultCd, setDefaultCd] = useState(10)
  const [wuCd, setWuCd] = useState<Record<string, { wu?: number; cd?: number }>>({})

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeDragData, setActiveDragData] = useState<Record<string, unknown> | null>(null)

  const paceZones = useMemo(() => {
    const stored = localStorage.getItem("nsa-5k-pace")
    if (!stored) return null
    const fkp = Number(stored)
    return isNaN(fkp) ? null : getPaceZones(fkp)
  }, [])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  // WU/CD helpers
  const getWu = (day: string) => wuCd[day]?.wu ?? defaultWu
  const getCd = (day: string) => wuCd[day]?.cd ?? defaultCd
  const isWuOverridden = (day: string) => wuCd[day]?.wu !== undefined
  const isCdOverridden = (day: string) => wuCd[day]?.cd !== undefined
  const handleWuChange = (day: string, v: number) =>
    setWuCd((p) => ({ ...p, [day]: { ...(p[day] || {}), wu: v } }))
  const handleCdChange = (day: string, v: number) =>
    setWuCd((p) => ({ ...p, [day]: { ...(p[day] || {}), cd: v } }))
  const handleResetWuCd = (day: string) =>
    setWuCd((p) => { const n = { ...p }; delete n[day]; return n })

  // Computed validation
  const summary = computeWeekSummary(week, defaultWu, defaultCd, easyInputs, longMin)
  const hasConsecutiveQ = week.some((d, i) =>
    i > 0 && d.type === "quality" && week[i - 1].type === "quality"
  )
  const hasRestDay = week.some((d) => d.type === "rest")
  const hasTestWorkout = activeWeek === 4 && week.some(
    (d) => d.template && (d.template.id === "t1" || d.template.id === "t2")
  )
  const qPctOk = summary.qualityPercentage <= 25

  // Progression targets
  const prevWeekVol = activeWeek > 1 ? weeks[activeWeek - 2]?.summary.totalDurationMin ?? 0 : 0
  const targetVol = activeWeek === 1
    ? null
    : activeWeek === 4
      ? prevWeekVol > 0 ? Math.round(prevWeekVol * 0.55) : null
      : prevWeekVol > 0 ? Math.round(prevWeekVol * 1.04) : null

  const canProceed =
    summary.numQualitySessions > 0 &&
    qPctOk &&
    !hasConsecutiveQ &&
    hasRestDay &&
    (activeWeek !== 4 || hasTestWorkout)

  // DnD handlers (same as planner)
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
    setActiveDragData((event.active.data.current as Record<string, unknown>) ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    setActiveDragData(null)
    const { active, over } = event
    if (!over) return
    const overStr = String(over.id)
    if (!overStr.startsWith("drop-")) return
    const dayIdx = Number(overStr.replace("drop-", ""))
    const activeStr = String(active.id)

    if (activeStr.startsWith("template-")) {
      const template = (active.data.current as { template: QTemplate }).template
      setWeek((prev) => {
        const next = [...prev]
        next[dayIdx] = { ...next[dayIdx], type: "quality", template }
        return next
      })
    } else if (activeStr.startsWith("type-")) {
      const sessionType = activeStr.replace("type-", "") as SessionType
      setWeek((prev) => {
        const next = [...prev]
        next[dayIdx] = { ...next[dayIdx], type: sessionType, template: null }
        return next
      })
    } else if (activeStr.startsWith("slot-")) {
      const srcIdx = Number(activeStr.replace("slot-", ""))
      if (srcIdx === dayIdx) return
      const srcDay = week[srcIdx].day
      const dstDay = week[dayIdx].day
      setWeek((prev) => {
        const next = [...prev]
        const srcSlot = { ...next[srcIdx] }
        const dstSlot = { ...next[dayIdx] }
        next[dayIdx] = { ...srcSlot, day: next[dayIdx].day }
        next[srcIdx] = { ...dstSlot, day: next[srcIdx].day }
        return next
      })
      setEasyInputs((p) => {
        const n = { ...p }; const tmp = n[srcDay]; n[srcDay] = n[dstDay]; n[dstDay] = tmp; return n
      })
      setStrides((p) => {
        const n = { ...p }; const tmp = n[srcDay]; n[srcDay] = n[dstDay]; n[dstDay] = tmp; return n
      })
      setWuCd((p) => {
        const n = { ...p }; const tmp = n[srcDay]; n[srcDay] = n[dstDay]; n[dstDay] = tmp; return n
      })
    }
  }

  const handleClear = (dayIdx: number) => {
    setWeek((prev) => {
      const next = [...prev]
      next[dayIdx] = { ...next[dayIdx], type: null, template: null }
      return next
    })
  }

  const handleSaveWeek = () => {
    const weekStartDate = startDate
      ? (() => {
          const d = new Date(startDate)
          d.setDate(d.getDate() + (activeWeek - 1) * 7)
          return d.toISOString().slice(0, 10)
        })()
      : ""

    const plan: WeekPlan = {
      weekNumber: activeWeek,
      weekType: activeWeek === 4 ? "deload" : "build",
      startDate: weekStartDate,
      days: week,
      summary,
      defaultWu,
      defaultCd,
      easyInputs,
      longMin,
    }
    saveWeek(plan)

    // Reset local state for next week
    setWeek(initWeek())
    setCatFilter(activeWeek === 3 ? "test" : "all") // next week is W4 if current is W3
    setEasyInputs({})
    setStrides({})
    setWuCd({})
  }

  const renderDragOverlay = () => {
    if (!activeId) return null
    if (activeId.startsWith("template-") && activeDragData) {
      const t = activeDragData.template as QTemplate
      return (
        <div className="rounded-lg bg-muted p-2.5 shadow-lg border border-border/50 opacity-90 w-40">
          <div className="text-xs font-medium">Sub-Threshold</div>
          <div className="text-xs text-muted-foreground">{t.name}</div>
        </div>
      )
    }
    if (activeId.startsWith("type-")) {
      const sessionType = activeId.replace("type-", "") as SessionType
      return (
        <div className="rounded-full border px-3 py-1 text-xs font-medium shadow-lg opacity-90"
          style={{
            background: `var(--color-session-${sessionType}-bg)`,
            color: `var(--color-session-${sessionType}-text)`,
            borderColor: `color-mix(in srgb, var(--color-session-${sessionType}) 30%, transparent)`,
          }}
        >
          {SESSION_META[sessionType].label}
        </div>
      )
    }
    if (activeId.startsWith("slot-")) {
      const idx = Number(activeId.replace("slot-", ""))
      const slot = week[idx]
      if (!slot.type) return null
      return (
        <div className="rounded-xl border p-3 shadow-lg opacity-90 min-w-[100px]"
          style={{
            backgroundColor: `var(--color-session-${slot.type}-bg)`,
            color: `var(--color-session-${slot.type}-text)`,
          }}
        >
          <span className="text-xs font-semibold">{slot.day}</span>
          {slot.type === "quality" && slot.template && <div className="text-xs mt-1">{slot.template.name}</div>}
          {slot.type !== "quality" && <div className="text-xs mt-1">{SESSION_META[slot.type].label}</div>}
        </div>
      )
    }
    return null
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* Week tabs */}
        <div className="flex gap-2">
          {WEEK_LABELS.map((label, i) => {
            const wn = (i + 1) as 1 | 2 | 3 | 4
            const done = weeks[i] !== null
            const active = wn === activeWeek
            return (
              <Button
                key={wn}
                size="sm"
                variant={active ? "default" : done ? "outline" : "ghost"}
                disabled={wn > activeWeek && !done}
                onClick={() => {
                  if (done || wn === activeWeek) goToWeek(wn)
                }}
                className="text-xs"
              >
                {done && !active && <Check className="w-3 h-3 mr-1" />}
                {label}
              </Button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
          {/* Left: Targets + Validation */}
          <div className="space-y-4">
            {/* Targets */}
            <Card>
              <CardContent className="py-4 px-4 space-y-2">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {WEEK_LABELS[activeWeek - 1]} — Targets
                </div>
                {assessment && (
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Q sessions</span>
                      <span className="font-mono">{assessment.recommendedQSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Q volume</span>
                      <span className="font-mono">{assessment.maxQVolumeMin} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Q ceiling</span>
                      <span className="font-mono">25%</span>
                    </div>
                    {targetVol && (
                      <div className="flex justify-between pt-1 border-t border-border/50">
                        <span>{activeWeek === 4 ? "Deload target" : "Volume target"}</span>
                        <span className="font-mono">~{targetVol} min</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Pattern</span>
                      <span className="font-mono text-[0.6rem]">E–Q–E–Q–E–Q–LR</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Validation */}
            <Card>
              <CardContent className="py-4 px-4 space-y-2">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Validation
                </div>
                <div className="text-xs space-y-1.5">
                  <ValidationCheck ok={summary.numQualitySessions > 0} label="At least 1 Q session" />
                  <ValidationCheck ok={qPctOk} label={`Q volume ≤ 25% (currently ${summary.qualityPercentage}%)`} />
                  <ValidationCheck ok={!hasConsecutiveQ} label="No consecutive Q days" />
                  <ValidationCheck ok={hasRestDay} label="Rest day present" />
                  {activeWeek === 4 && (
                    <ValidationCheck ok={hasTestWorkout} label="Test workout placed" />
                  )}
                </div>

                <div className="pt-2 border-t border-border/50 text-xs space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Total volume</span>
                    <span className="font-mono">{summary.totalDurationMin} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Q volume</span>
                    <span className="font-mono">{summary.qualityDurationMin} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. load</span>
                    <span className="font-mono">{summary.estimatedLoad}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Template palette */}
            <QualityPalette
              catFilter={catFilter}
              onCatFilterChange={setCatFilter}
              defaultWu={defaultWu}
              defaultCd={defaultCd}
              onDefaultWuChange={setDefaultWu}
              onDefaultCdChange={setDefaultCd}
              paceZones={paceZones}
            />
          </div>

          {/* Right: Week grid */}
          <div>
            <WeekGrid
              week={week}
              onClear={handleClear}
              easyInputs={easyInputs}
              onEasyMinChange={(day, min) => setEasyInputs((p) => ({ ...p, [day]: min }))}
              strides={strides}
              onStridesChange={(day, v) => setStrides((p) => ({ ...p, [day]: v }))}
              longMin={longMin}
              onLongMinChange={setLongMin}
              getWu={getWu}
              getCd={getCd}
              isWuOverridden={isWuOverridden}
              isCdOverridden={isCdOverridden}
              onWuChange={handleWuChange}
              onCdChange={handleCdChange}
              onResetWuCd={handleResetWuCd}
              paceZones={paceZones}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeWeek === 1 ? goToStep(2) : goToWeek((activeWeek - 1) as 1 | 2 | 3 | 4)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {activeWeek === 1 ? "Back to Dates" : `Week ${activeWeek - 1}`}
          </Button>
          <Button
            size="sm"
            disabled={!canProceed}
            onClick={handleSaveWeek}
          >
            {activeWeek === 4 ? "Finish & Review" : `Save Week ${activeWeek} & Continue`}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      <DragOverlay>{renderDragOverlay()}</DragOverlay>
    </DndContext>
  )
}

function ValidationCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {ok ? (
        <Check className="w-3.5 h-3.5 text-green-600" />
      ) : (
        <X className="w-3.5 h-3.5 text-red-500" />
      )}
      <span className={ok ? "text-foreground" : "text-red-500"}>{label}</span>
    </div>
  )
}
