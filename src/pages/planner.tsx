import { useState } from "react"
import { DefaultWuCd } from "@/components/planner/default-wu-cd"
import { QualityPalette } from "@/components/planner/quality-palette"
import { WeekGrid } from "@/components/planner/week-grid"
import { WeeklySummary } from "@/components/planner/weekly-summary"
import {
  initWeek,
  qWorkMin,
  type DaySlotData,
  type QTemplate,
  type SessionType,
} from "@/lib/planner-data"

export default function PlannerPage() {
  const [week, setWeek] = useState<DaySlotData[]>(initWeek)
  const [catFilter, setCatFilter] = useState("all")
  const [dragData, setDragData] = useState<{ type: string; template: QTemplate | null } | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [easyInputs, setEasyInputs] = useState<Record<string, number>>({})
  const [strides, setStrides] = useState<Record<string, boolean>>({})
  const [longMin, setLongMin] = useState(75)
  const [defaultWu, setDefaultWu] = useState(10)
  const [defaultCd, setDefaultCd] = useState(10)
  const [wuCd, setWuCd] = useState<Record<string, { wu?: number; cd?: number }>>({})

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

  // Drag handlers
  const handleQualityDragStart = (template: QTemplate) =>
    setDragData({ type: "quality", template })
  const handleTypeDragStart = (type: SessionType) =>
    setDragData({ type, template: null })

  const handleDrop = (dayIdx: number) => {
    if (!dragData) return
    setWeek((prev) => {
      const next = [...prev]
      if (dragData.type === "quality") {
        next[dayIdx] = { ...next[dayIdx], type: "quality", template: dragData.template }
      } else {
        next[dayIdx] = { ...next[dayIdx], type: dragData.type as SessionType, template: null }
      }
      return next
    })
    setDragData(null)
    setDragOverIndex(null)
  }

  const handleClear = (dayIdx: number) => {
    setWeek((prev) => {
      const next = [...prev]
      next[dayIdx] = { ...next[dayIdx], type: null, template: null }
      return next
    })
  }

  const handleCycle = (dayIdx: number) => {
    const types: (SessionType | null)[] = [null, "easy", "long", "rest"]
    setWeek((prev) => {
      const next = [...prev]
      const cur = next[dayIdx].type
      if (cur === "quality") return next
      const idx = types.indexOf(cur)
      next[dayIdx] = { ...next[dayIdx], type: types[(idx + 1) % types.length], template: null }
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

  return (
    <div className="max-w-[740px] mx-auto px-5 py-8 pb-12 space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Weekly Planner</h1>
        <p className="text-sm text-muted-foreground">
          Plan your NSA training week — drag quality sessions to days, fill easy and long runs.
        </p>
      </header>

      <DefaultWuCd
        defaultWu={defaultWu}
        defaultCd={defaultCd}
        onDefaultWuChange={setDefaultWu}
        onDefaultCdChange={setDefaultCd}
      />

      <QualityPalette
        catFilter={catFilter}
        onCatFilterChange={setCatFilter}
        onDragStart={handleQualityDragStart}
      />

      <WeekGrid
        week={week}
        dragOverIndex={dragOverIndex}
        onDrop={handleDrop}
        onDragOver={setDragOverIndex}
        onDragLeave={() => setDragOverIndex(null)}
        onClear={handleClear}
        onCycle={handleCycle}
        onTypeDragStart={handleTypeDragStart}
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
      />

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
  )
}
