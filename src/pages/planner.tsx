import { useState, useMemo, useEffect } from "react"
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
import { Upload } from "lucide-react"
import { getPaceZones } from "@/lib/calculator"
import { useAuth } from "@/lib/auth-context"
import { apiFetch } from "@/lib/api"
import { QualityPalette } from "@/components/planner/quality-palette"
import { WeekGrid } from "@/components/planner/week-grid"
import { WeeklySummary } from "@/components/planner/weekly-summary"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  initWeek,
  qWorkMin,
  SESSION_META,
  type DaySlotData,
  type QTemplate,
  type SessionType,
} from "@/lib/planner-data"

const snapCenterToCursor: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  if (activatorEvent && draggingNodeRect) {
    const evt = activatorEvent as PointerEvent
    const offsetX = evt.clientX - draggingNodeRect.left - draggingNodeRect.width / 2
    const offsetY = evt.clientY - draggingNodeRect.top - draggingNodeRect.height / 2
    return { ...transform, x: transform.x + offsetX, y: transform.y + offsetY }
  }
  return transform
}

function getNextMonday() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export default function PlannerPage() {
  const { user } = useAuth()
  const [week, setWeek] = useState<DaySlotData[]>(initWeek)
  const [catFilter, setCatFilter] = useState("all")
  const [exportDate, setExportDate] = useState(getNextMonday)
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState("")
  const [easyInputs, setEasyInputs] = useState<Record<string, number>>({})
  const [strides, setStrides] = useState<Record<string, boolean>>({})
  const [longMin, setLongMin] = useState(75)
  const [defaultWu, setDefaultWu] = useState(10)
  const [defaultCd, setDefaultCd] = useState(10)
  const [wuCd, setWuCd] = useState<Record<string, { wu?: number; cd?: number }>>({})

  // Drag overlay state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeDragData, setActiveDragData] = useState<Record<string, unknown> | null>(null)

  // Scroll tracking (debug)
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Pace zones from calculator (persisted in localStorage)
  const paceZones = useMemo(() => {
    const stored = localStorage.getItem("nsa-5k-pace")
    if (!stored) return null
    const fkp = Number(stored)
    return isNaN(fkp) ? null : getPaceZones(fkp)
  }, [])

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
    setWuCd((p) => {
      const n = { ...p }
      delete n[day]
      return n
    })

  // @dnd-kit sensors
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
    setActiveDragData((event.active.data.current as Record<string, unknown>) ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    setActiveDragData(null)

    const { active, over } = event
    if (!over) return

    const activeStr = String(active.id)
    const overStr = String(over.id)

    // Only accept drops onto "drop-{index}" targets
    if (!overStr.startsWith("drop-")) return
    const dayIdx = Number(overStr.replace("drop-", ""))

    // 1. Quality template drag
    if (activeStr.startsWith("template-")) {
      const template = (active.data.current as { template: QTemplate }).template
      setWeek((prev) => {
        const next = [...prev]
        next[dayIdx] = { ...next[dayIdx], type: "quality", template }
        return next
      })
      return
    }

    // 2. Session type chip drag
    if (activeStr.startsWith("type-")) {
      const sessionType = activeStr.replace("type-", "") as SessionType
      setWeek((prev) => {
        const next = [...prev]
        next[dayIdx] = { ...next[dayIdx], type: sessionType, template: null }
        return next
      })
      return
    }

    // 3. Slot-to-slot swap
    if (activeStr.startsWith("slot-")) {
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
      // Swap associated state (easyInputs, strides, wuCd)
      setEasyInputs((p) => {
        const n = { ...p }
        const tmp = n[srcDay]; n[srcDay] = n[dstDay]; n[dstDay] = tmp
        return n
      })
      setStrides((p) => {
        const n = { ...p }
        const tmp = n[srcDay]; n[srcDay] = n[dstDay]; n[dstDay] = tmp
        return n
      })
      setWuCd((p) => {
        const n = { ...p }
        const tmp = n[srcDay]; n[srcDay] = n[dstDay]; n[dstDay] = tmp
        return n
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

  // Computed values
  const STRIDE_TOTAL_MIN = Math.round((4 * 20) / 60 * 10) / 10

  const qDays = week.filter((d) => d.type === "quality")
  const eDays = week.filter((d) => d.type === "easy")
  const lrDays = week.filter((d) => d.type === "long")
  const rDays = week.filter((d) => d.type === "rest")

  const totalQWorkMin = qDays.reduce((s, d) => s + (d.template ? qWorkMin(d.template) : 0), 0)
  const totalQWuCdMin = qDays.reduce((s, d) => s + getWu(d.day) + getCd(d.day), 0)
  const totalStrideMin = eDays.reduce((s, d) => s + (strides[d.day] ? STRIDE_TOTAL_MIN : 0), 0)
  const totalEMin = eDays.reduce((s, d) => s + (easyInputs[d.day] || 40), 0) + totalStrideMin
  const totalLRMin = lrDays.length > 0 ? longMin : 0
  const totalEasyAll = totalEMin + totalLRMin + totalQWuCdMin
  const totalWeekMin = totalQWorkMin + totalEasyAll
  const qPct = totalWeekMin > 0 ? Math.round((totalQWorkMin / totalWeekMin) * 100) : 0
  const ePct = totalWeekMin > 0 ? Math.round((totalEasyAll / totalWeekMin) * 100) : 0
  const totalSubT = qDays.reduce((s, d) => s + (d.template ? d.template.vol : 0), 0)
  const ratioOk = ePct >= 70 && ePct <= 80
  const ratioClose = ePct >= 65 && ePct <= 85
  const neededEasyMin =
    totalQWorkMin > 0 ? Math.round((totalQWorkMin / 0.25) * 0.75) - totalEasyAll : 0

  // Export handler
  const workoutPreview = week
    .filter((d) => d.type && d.type !== "rest")
    .map((d) => ({
      day: d.day,
      name:
        d.type === "quality" && d.template
          ? `NSA: ${d.template.name} sub-T`
          : d.type === "easy"
            ? "Easy run"
            : d.type === "long"
              ? "Long run"
              : "",
    }))

  const handleExport = async () => {
    setExporting(true)
    setExportMsg("")
    try {
      const res = await apiFetch<{ count: number }>("/api/intervals/export", {
        method: "POST",
        body: JSON.stringify({
          week_data: week,
          start_date: exportDate,
          default_wu: defaultWu,
          default_cd: defaultCd,
        }),
      })
      setExportMsg(`Exported ${res.count} workouts`)
    } catch (err) {
      setExportMsg(err instanceof Error ? err.message : "Export failed")
    } finally {
      setExporting(false)
    }
  }

  // Reset handler
  const resetAll = () => {
    setWeek(initWeek())
    setEasyInputs({})
    setStrides({})
    setLongMin(75)
    setDefaultWu(10)
    setDefaultCd(10)
    setWuCd({})
  }

  // Drag overlay content
  const renderDragOverlay = () => {
    if (!activeId) return null

    if (activeId.startsWith("template-") && activeDragData) {
      const t = activeDragData.template as QTemplate
      return (
        <div className="rounded-lg bg-muted p-2.5 shadow-lg border border-border/50 opacity-90 w-40">
          <div className="text-xs font-medium">Sub-Threshold</div>
          <div className="text-xs text-muted-foreground">
            {t.name.includes("×") ? t.name.replace("×", " × ") : t.name}
          </div>
        </div>
      )
    }

    if (activeId.startsWith("type-")) {
      const sessionType = activeId.replace("type-", "") as SessionType
      return (
        <div
          className="rounded-full border px-3 py-1 text-xs font-medium shadow-lg opacity-90"
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
        <div
          className="rounded-xl border p-3 shadow-lg opacity-90 min-w-[100px]"
          style={{
            backgroundColor: `var(--color-session-${slot.type}-bg)`,
            color: `var(--color-session-${slot.type}-text)`,
            borderColor: `color-mix(in srgb, var(--color-session-${slot.type}) 30%, transparent)`,
          }}
        >
          <span className="text-xs font-semibold">{slot.day}</span>
          {slot.type === "quality" && slot.template && (
            <div className="text-xs mt-1">{slot.template.name}</div>
          )}
          {slot.type !== "quality" && (
            <div className="text-xs mt-1">{SESSION_META[slot.type].label}</div>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="max-w-[1280px] mx-auto px-5 py-8 pb-[240px] lg:pb-12">
        <header className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Weekly Planner</h1>
          <p className="text-sm text-muted-foreground">
            Plan your NSA training week — drag quality sessions to days, fill easy and long runs.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6">
          {/* Left panel — summary + settings */}
          <div className="space-y-4">
            <WeeklySummary
              totalQWorkMin={totalQWorkMin}
              totalEasyAll={totalEasyAll}
              totalQWuCdMin={totalQWuCdMin}
              totalSubT={totalSubT}
              totalWeekMin={totalWeekMin}
              qPct={qPct}
              ePct={ePct}
              ratioOk={ratioOk}
              ratioClose={ratioClose}
              neededEasyMin={neededEasyMin}
              qDayCount={qDays.length}
              restDayCount={rDays.length}
              onReset={resetAll}
            />

            {user && (
              <Dialog onOpenChange={() => setExportMsg("")}>
                <DialogTrigger className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors inline-flex items-center gap-1.5">
                  <Upload className="size-3.5" />
                  Export to Intervals.icu
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export to Intervals.icu</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-3">
                    <label className="block text-xs font-medium">
                      Week start date
                      <Input
                        type="date"
                        className="mt-1"
                        value={exportDate}
                        onChange={(e) => setExportDate(e.target.value)}
                      />
                    </label>

                    {workoutPreview.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Workouts to create:
                        </p>
                        <ul className="text-xs space-y-0.5">
                          {workoutPreview.map((w) => (
                            <li key={w.day} className="flex gap-2">
                              <span className="font-medium w-8">{w.day}</span>
                              <span className="text-muted-foreground">{w.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No workouts to export. Assign sessions to days first.
                      </p>
                    )}

                    {exportMsg && (
                      <p
                        className={`text-xs font-medium ${
                          exportMsg.startsWith("Exported")
                            ? "text-green-600 dark:text-green-400"
                            : "text-destructive"
                        }`}
                      >
                        {exportMsg}
                      </p>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      size="sm"
                      disabled={exporting || workoutPreview.length === 0}
                      onClick={handleExport}
                    >
                      {exporting ? "Exporting..." : "Export"}
                    </Button>
                    <DialogClose render={<Button variant="outline" size="sm" />}>
                      Cancel
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

          </div>

          {/* Right panel — workout templates */}
          <div>
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
        <div className="mt-6">
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

        {/* Floating weekly summary — mobile only, after scroll threshold */}
        <div className={`fixed bottom-0 left-0 right-0 lg:hidden z-50 bg-background/90 backdrop-blur-sm border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] p-3 max-h-[50vh] overflow-y-auto transition-transform duration-300 ${scrollY >= 370 ? "translate-y-0" : "translate-y-full"}`}>
          <WeeklySummary
            totalQWorkMin={totalQWorkMin}
            totalEasyAll={totalEasyAll}
            totalQWuCdMin={totalQWuCdMin}
            totalSubT={totalSubT}
            totalWeekMin={totalWeekMin}
            qPct={qPct}
            ePct={ePct}
            ratioOk={ratioOk}
            ratioClose={ratioClose}
            neededEasyMin={neededEasyMin}
            qDayCount={qDays.length}
            restDayCount={rDays.length}
            onReset={resetAll}
          />
        </div>
      </div>

      <DragOverlay modifiers={[snapCenterToCursor]}>{renderDragOverlay()}</DragOverlay>
    </DndContext>
  )
}
