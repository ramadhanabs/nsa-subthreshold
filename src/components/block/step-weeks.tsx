import { useState, useEffect } from "react"
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core"
import { Check, X, ChevronLeft, ChevronRight, RotateCcw, TrendingUp, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getPaceZones, get5kPace, fmtPace, type InputMode } from "@/lib/calculator"
import { useBlockWizard } from "@/lib/block-wizard-context"
import { computeWeekSummary } from "@/lib/block-utils"
import { apiFetch } from "@/lib/api"
import { QualityPalette } from "@/components/planner/quality-palette"
import { WeekGrid } from "@/components/planner/week-grid"
import {
  initWeek,
  qWorkMin,
  SESSION_META,
  type DaySlotData,
  type QTemplate,
  type SessionType,
} from "@/lib/planner-data"
import type { WeekPlan } from "@/lib/block-types"

const WEEK_LABELS = ["Week 1 (Build)", "Week 2 (Build)", "Week 3 (Build)", "Week 4 (Deload)"]

const snapCenterToCursor: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  if (activatorEvent && draggingNodeRect) {
    const activatorCoords = (activatorEvent as PointerEvent)
    if (activatorCoords) {
      const offsetX = activatorCoords.clientX - draggingNodeRect.left - draggingNodeRect.width / 2
      const offsetY = activatorCoords.clientY - draggingNodeRect.top - draggingNodeRect.height / 2
      return { ...transform, x: transform.x + offsetX, y: transform.y + offsetY }
    }
  }
  return transform
}
const SUGGESTED_PATTERN = ["E", "Q", "E", "Q", "E", "Q", "LR"]

interface TestResult {
  test_type: string
  value_a: number
  value_b: number
}

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

  // Sync local state when activeWeek changes
  useEffect(() => {
    const existing = weeks[activeWeek - 1]
    if (existing) {
      setWeek([...existing.days])
      setEasyInputs(existing.easyInputs ?? {})
      setLongMin(existing.longMin ?? 75)
      setDefaultWu(existing.defaultWu)
      setDefaultCd(existing.defaultCd)
    } else {
      setWeek(initWeek())
      setEasyInputs({})
      setLongMin(75)
    }
    setStrides({})
    setWuCd({})
    setCatFilter(activeWeek === 4 ? "test" : "all")
  }, [activeWeek])

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeDragData, setActiveDragData] = useState<Record<string, unknown> | null>(null)

  // Pace zones from user's test results
  const [paceZones, setPaceZones] = useState<ReturnType<typeof getPaceZones> | null>(null)

  useEffect(() => {
    // Try localStorage first (set by calculator page)
    const stored = localStorage.getItem("nsa-5k-pace")
    if (stored) {
      const fkp = Number(stored)
      if (!isNaN(fkp)) {
        setPaceZones(getPaceZones(fkp))
        return
      }
    }
    // Fall back to latest test result from API
    apiFetch<TestResult[]>("/api/tests")
      .then((tests) => {
        if (tests.length > 0) {
          const latest = tests[0]
          const fkp = get5kPace(latest.test_type as InputMode, latest.value_a, latest.value_b)
          setPaceZones(getPaceZones(fkp))
        }
      })
      .catch(() => {})
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
  const easyRunsOk = week.every((d) =>
    d.type !== "easy" || (easyInputs[d.day] ?? 40) <= 90
  )
  const hasLongRun = week.some((d) => d.type === "long")
  const longRunMinOk = longMin >= 60
  const longRunMaxOk = longMin <= 240
  const longRunOk = hasLongRun && longRunMinOk && longRunMaxOk

  // Easy vs quality ratio — single source of truth for Q%
  const qDays = week.filter((d) => d.type === "quality")
  const eDays = week.filter((d) => d.type === "easy")
  const lrDays = week.filter((d) => d.type === "long")
  const totalQWorkMin = qDays.reduce((s, d) => s + (d.template ? qWorkMin(d.template) : 0), 0)
  const totalQWuCdMin = qDays.reduce((s, d) => s + getWu(d.day) + getCd(d.day), 0)
  const totalEMin = eDays.reduce((s, d) => s + (easyInputs[d.day] ?? 40), 0)
  const totalLRMin = lrDays.length > 0 ? longMin : 0
  const totalEasyAll = totalEMin + totalLRMin + totalQWuCdMin
  const totalWeekMin = totalQWorkMin + totalEasyAll
  const ePct = totalWeekMin > 0 ? Math.round((totalEasyAll / totalWeekMin) * 100) : 0
  const qPctActual = totalWeekMin > 0 ? Math.round((totalQWorkMin / totalWeekMin) * 100) : 0
  const qPctOk = qPctActual >= 20 && qPctActual <= 25
  const ratioOk = qPctOk
  const ratioClose = qPctActual >= 18 && qPctActual <= 27

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
    easyRunsOk &&
    longRunOk &&
    (activeWeek !== 4 || hasTestWorkout)

  // DnD handlers
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

  const handleResetWeek = () => {
    setWeek(initWeek())
    setEasyInputs({})
    setStrides({})
    setWuCd({})
    setLongMin(75)
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
    setCatFilter(activeWeek === 3 ? "test" : "all")
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

        {/* Targets + Validation + Ratio (left 3 cols) | Workout Templates (right 9 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3 space-y-4">
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
                    <span>Q range</span>
                    <span className="font-mono">20–25%</span>
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
                  {paceZones && (
                    <div className="flex justify-between pt-1 border-t border-border/50">
                      <span>Threshold</span>
                      <span className="font-mono">{fmtPace(paceZones.threshold)}/km</span>
                    </div>
                  )}
                </div>
              )}

              {/* Volume stats */}
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
                {paceZones && summary.totalDurationMin > 0 && (() => {
                  const avgSubTPace = (paceZones.short[0] + paceZones.long[1]) / 2
                  const qKm = totalQWorkMin * 60 / avgSubTPace
                  const easyKm = totalEasyAll * 60 / paceZones.easyMax
                  return (
                    <div className="flex justify-between">
                      <span>Est. distance</span>
                      <span className="font-mono">~{(qKm + easyKm).toFixed(1)} km</span>
                    </div>
                  )
                })()}
              </div>
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
                <ValidationCheck ok={qPctOk} label={`Q volume 20–25% (${qPctActual}%)`} inactive={summary.numQualitySessions === 0} />
                <ValidationCheck ok={!hasConsecutiveQ} label="No consecutive Q days" inactive={qDays.length < 2} />
                <ValidationCheck ok={hasRestDay} label="Rest day present" />
                <ValidationCheck ok={hasLongRun && longRunMinOk} label="Long run ≥ 60min" />
                <ValidationCheck ok={longRunMaxOk} label="Long run ≤ 240min" inactive={!hasLongRun} />
                <ValidationCheck ok={easyRunsOk} label="Easy runs ≤ 90min" inactive={eDays.length === 0} />
                {activeWeek === 4 && (
                  <ValidationCheck ok={hasTestWorkout} label="Test workout placed" />
                )}
              </div>

            </CardContent>
          </Card>

          {/* Easy vs Quality ratio */}
          <Card>
            <CardContent className="py-4 px-4 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Easy / Quality Ratio
              </div>
              {totalWeekMin > 0 ? (
                <div className="space-y-2">
                  <div className="flex h-3 rounded-full overflow-hidden">
                    <div
                      className="transition-all duration-300"
                      style={{ width: `${ePct}%`, background: "var(--color-session-easy)" }}
                    />
                    <div
                      className="transition-all duration-300"
                      style={{ width: `${qPctActual}%`, background: "var(--color-session-quality)" }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Easy <span className="font-mono font-medium text-foreground">{ePct}%</span>
                    </span>
                    <span className="text-muted-foreground">
                      Quality <span className="font-mono font-medium text-foreground">{qPctActual}%</span>
                    </span>
                  </div>
                  <div className={`text-xs ${ratioOk ? "text-green-600" : ratioClose ? "text-amber-500" : "text-red-500"}`}>
                    {ratioOk
                      ? "Ideal ratio (Q 20–25%)"
                      : ratioClose
                        ? `Close — aim for Q 20–25% (currently ${qPctActual}%)`
                        : qPctActual < 20
                          ? "Too little quality — add more sub-threshold work"
                          : "Too much quality — add more easy volume"}
                  </div>
                  <div className="pt-1 border-t border-border/50 text-[0.65rem] text-muted-foreground space-y-0.5">
                    <div className="flex justify-between">
                      <span>Easy runs</span>
                      <span className="font-mono">{Math.round(totalEMin)} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Long run</span>
                      <span className="font-mono">{Math.round(totalLRMin)} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>WU/CD (easy pace)</span>
                      <span className="font-mono">{Math.round(totalQWuCdMin)} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sub-threshold work</span>
                      <span className="font-mono">{Math.round(totalQWorkMin)} min</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Add sessions to see ratio</p>
              )}
            </CardContent>
          </Card>

          {/* CTL Projection */}
          {(() => {
            if (!assessment) return null
            const startCtl = assessment.ctl
            const hasLoad = summary.estimatedLoad > 0
            const avgDailyLoad = hasLoad ? summary.estimatedLoad / 7 : 0
            let projectedCtl = startCtl

            // For completed prior weeks, advance CTL through them
            for (let w = 0; w < activeWeek - 1; w++) {
              const pw = weeks[w]
              if (pw) {
                const pwDailyAvg = pw.summary.estimatedLoad / 7
                for (let d = 0; d < 7; d++) {
                  projectedCtl = projectedCtl + (pwDailyAvg - projectedCtl) / 42
                }
              }
            }

            const ctlBeforeWeek = projectedCtl

            // Simulate current week
            for (let d = 0; d < 7; d++) {
              projectedCtl = projectedCtl + (avgDailyLoad - projectedCtl) / 42
            }

            const weeklyRamp = projectedCtl - ctlBeforeWeek
            const rampPct = ctlBeforeWeek > 0 ? (weeklyRamp / ctlBeforeWeek) * 100 : 0

            const rampColor = !hasLoad
              ? "text-muted-foreground"
              : Math.abs(rampPct) <= 5
                ? "text-green-600"
                : Math.abs(rampPct) <= 8
                  ? "text-amber-500"
                  : "text-red-500"

            const rampLabel = !hasLoad
              ? "Add workouts to see projection"
              : Math.abs(rampPct) <= 5
                ? "Safe ramp"
                : Math.abs(rampPct) <= 8
                  ? "Moderate ramp"
                  : "Aggressive ramp"

            return (
              <Card>
                <CardContent className="py-4 px-4 space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    CTL Projection
                    <Tooltip>
                      <TooltipTrigger className="cursor-help">
                        <Info className="w-3 h-3 text-muted-foreground/50" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[240px] text-xs leading-relaxed">
                        CTL (Chronic Training Load) projected using exponential moving average with 42-day time constant. Ramp rate shows weekly CTL change — keep below 5-8% for safe progression.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Current CTL</span>
                      <span className="font-mono">{startCtl.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Before this week</span>
                      <span className="font-mono">{ctlBeforeWeek.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border/50">
                      <span>After this week</span>
                      <span className="font-mono font-medium text-foreground">
                        {hasLoad ? projectedCtl.toFixed(1) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Weekly ramp</span>
                      <span className={`font-mono font-medium ${rampColor}`}>
                        {hasLoad
                          ? `${weeklyRamp >= 0 ? "+" : ""}${weeklyRamp.toFixed(1)} (${rampPct >= 0 ? "+" : ""}${rampPct.toFixed(1)}%)`
                          : "—"}
                      </span>
                    </div>
                    <div className={`text-xs pt-1 ${rampColor}`}>
                      {rampLabel}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })()}
          </div>

          {/* Right: Workout Templates (9 cols) */}
          <div className="lg:col-span-9">
            <QualityPalette
              catFilter={catFilter}
              onCatFilterChange={setCatFilter}
              defaultWu={defaultWu}
              defaultCd={defaultCd}
              onDefaultWuChange={setDefaultWu}
              onDefaultCdChange={setDefaultCd}
              paceZones={paceZones}
              isDragging={!!activeId}
            />
          </div>
        </div>

        {/* Full-width week grid */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Week Grid</div>
          <Button variant="ghost" size="sm" onClick={handleResetWeek} className="text-xs text-muted-foreground gap-1">
            <RotateCcw className="w-3 h-3" />
            Reset Week
          </Button>
        </div>

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
          hints={SUGGESTED_PATTERN}
        />

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

      <DragOverlay modifiers={[snapCenterToCursor]}>{renderDragOverlay()}</DragOverlay>
    </DndContext>
  )
}

function ValidationCheck({ ok, label, inactive }: { ok: boolean; label: string; inactive?: boolean }) {
  if (inactive) {
    return (
      <div className="flex items-center gap-1.5 opacity-30">
        <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground" />
        <span className="text-muted-foreground">{label}</span>
      </div>
    )
  }
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
