import { useDroppable, useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Input } from "@/components/ui/input"
import { totalSessionMin, type DaySlotData, type QTemplate } from "@/lib/planner-data"
import { fmtPace, type PaceZones } from "@/lib/calculator"

interface DaySlotProps {
  slot: DaySlotData
  index: number
  onClear: (index: number) => void
  // Easy run
  easyMin: number
  onEasyMinChange: (day: string, min: number) => void
  hasStrides: boolean
  onStridesChange: (day: string, v: boolean) => void
  // Long run
  longMin: number
  onLongMinChange: (min: number) => void
  // WU/CD
  wu: number
  cd: number
  wuOverridden: boolean
  cdOverridden: boolean
  onWuChange: (day: string, v: number) => void
  onCdChange: (day: string, v: number) => void
  onResetWuCd: (day: string) => void
  // Pace
  paceZones: PaceZones | null
}

const NUM_INPUT_CLS =
  "font-mono text-center text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"

function paceRangeForTemplate(t: QTemplate, pz: PaceZones): [number, number] {
  if (t.id.startsWith("s")) return pz.short
  if (t.id.startsWith("m")) return pz.medium
  return pz.long
}

function QualityContent({
  template,
  wu,
  cd,
  wuOverridden,
  cdOverridden,
  day,
  onWuChange,
  onCdChange,
  onResetWuCd,
  paceZones,
}: {
  template: QTemplate
  wu: number
  cd: number
  wuOverridden: boolean
  cdOverridden: boolean
  day: string
  onWuChange: (day: string, v: number) => void
  onCdChange: (day: string, v: number) => void
  onResetWuCd: (day: string) => void
  paceZones: PaceZones | null
}) {
  const total = Math.round(totalSessionMin(template, wu, cd))
  const pace = paceZones ? paceRangeForTemplate(template, paceZones) : null
  const estKm = pace
    ? (() => {
        const avgPace = (pace[0] + pace[1]) / 2
        const workKm = template.reps * (template.dur * 60) / avgPace
        const wuCdKm = (wu + cd) * 60 / paceZones!.easyMax
        return workKm + wuCdKm
      })()
    : null

  return (
    <div className="space-y-1.5 flex-1">
      {/* Workout chart bars */}
      <div className="flex items-end gap-[2px]" style={{ height: 24 }}>
        <div className="rounded-sm shrink-0" style={{ width: Math.max(4, wu / 2), height: 12, background: "var(--color-session-easy)", opacity: 0.5 }} />
        {Array.from({ length: template.reps }).flatMap((_, i) => {
          const repHeight = Math.max(12, Math.round((template.dur / 15) * 24))
          const blocks = [
            <div key={`r${i}`} className="rounded-sm shrink-0" style={{ width: 4, height: repHeight, background: "var(--color-session-quality)", opacity: 0.8 }} />,
          ]
          if (i < template.reps - 1) {
            blocks.push(<div key={`g${i}`} className="shrink-0" style={{ width: 1, height: 6, background: "var(--color-session-easy)", opacity: 0.3 }} />)
          }
          return blocks
        })}
        <div className="rounded-sm shrink-0" style={{ width: Math.max(4, cd / 2), height: 12, background: "var(--color-session-easy)", opacity: 0.5 }} />
      </div>

      {/* Session label */}
      <div className="text-[0.6rem] font-medium">Sub-Threshold</div>
      <div className="text-[0.6rem] text-muted-foreground">
        {template.name.includes("×") ? template.name.replace("×", " × ") : template.name}
      </div>

      {/* Breakdown */}
      <div className="text-[0.55rem] text-muted-foreground space-y-0.5 pt-0.5">
        <div className="flex justify-between">
          <span>Warmup</span>
          <span className="font-mono">{wu}min</span>
        </div>
        <div className="pt-0.5 border-t border-border/50 space-y-0.5">
          <div className="flex justify-between font-medium text-foreground">
            <span>Main Set</span>
            <span className="font-mono">{template.reps}×</span>
          </div>
          <div className="flex justify-between">
            <span>{template.dur} min pace</span>
            <span className="font-mono">
              {pace ? `${fmtPace(pace[0])}–${fmtPace(pace[1])}` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Rest</span>
            <span className="font-mono">{template.rest}s</span>
          </div>
        </div>
        <div className="flex justify-between pt-0.5 border-t border-border/50">
          <span>Cooldown</span>
          <span className="font-mono">{cd}min</span>
        </div>
        <div className="flex justify-between pt-0.5 border-t border-border/50">
          <span>Total</span>
          <span className="font-mono">{total}min</span>
        </div>
        {estKm && (
          <div className="flex justify-between">
            <span>Est. distance</span>
            <span className="font-mono">~{estKm.toFixed(1)}km</span>
          </div>
        )}
      </div>

      {/* WU/CD override */}
      {(wuOverridden || cdOverridden) && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onResetWuCd(day) }}
          className="text-[0.55rem] text-muted-foreground underline hover:text-foreground"
        >
          reset WU/CD to default
        </button>
      )}

      {/* Inline WU/CD inputs */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <div>
          <label className="mb-0.5 block text-[0.5rem] uppercase tracking-wider text-muted-foreground">WU</label>
          <Input
            type="number"
            min={0}
            max={30}
            value={wu}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onWuChange(day, Number(e.target.value))}
            className={`${NUM_INPUT_CLS} h-6 text-xs`}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[0.5rem] uppercase tracking-wider text-muted-foreground">CD</label>
          <Input
            type="number"
            min={0}
            max={30}
            value={cd}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onCdChange(day, Number(e.target.value))}
            className={`${NUM_INPUT_CLS} h-6 text-xs`}
          />
        </div>
      </div>
    </div>
  )
}

function EasyContent({
  day,
  easyMin,
  onEasyMinChange,
  hasStrides,
  onStridesChange,
}: {
  day: string
  easyMin: number
  onEasyMinChange: (day: string, min: number) => void
  hasStrides: boolean
  onStridesChange: (day: string, v: boolean) => void
}) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider opacity-60">
        Easy run
      </p>
      <Input
        type="number"
        min={20}
        max={90}
        value={easyMin}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onEasyMinChange(day, Number(e.target.value))}
        className={NUM_INPUT_CLS}
      />
      <p className="mt-1 text-center text-[10px] opacity-50">min</p>

      <label
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`mt-3 flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[10px] transition-colors ${
          hasStrides ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "opacity-50"
        }`}
      >
        <input
          type="checkbox"
          checked={hasStrides}
          onChange={(e) => onStridesChange(day, e.target.checked)}
          className="h-3 w-3 accent-emerald-500"
        />
        + Strides (4×20s)
      </label>
    </div>
  )
}

function LongContent({
  longMin,
  onLongMinChange,
}: {
  longMin: number
  onLongMinChange: (min: number) => void
}) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider opacity-60">
        Long run
      </p>
      <Input
        type="number"
        min={45}
        max={180}
        value={longMin}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onLongMinChange(Number(e.target.value))}
        className={NUM_INPUT_CLS}
      />
      <p className="mt-1 text-center text-[10px] opacity-50">min</p>
    </div>
  )
}

function RestContent() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm font-medium opacity-50">Rest</p>
    </div>
  )
}

function EmptyContent() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-center text-xs opacity-40">
        Drop here
      </p>
    </div>
  )
}

export function DaySlot({
  slot,
  index,
  onClear,
  easyMin,
  onEasyMinChange,
  hasStrides,
  onStridesChange,
  longMin,
  onLongMinChange,
  wu,
  cd,
  wuOverridden,
  cdOverridden,
  onWuChange,
  onCdChange,
  onResetWuCd,
  paceZones,
}: DaySlotProps) {
  const { day, type, template } = slot

  // Droppable target
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${index}`,
  })

  // Draggable source (only when slot is filled)
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `slot-${index}`,
    data: { type: "slot", index },
    disabled: !type,
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : undefined,
  }

  const bgStyle: React.CSSProperties = type
    ? { backgroundColor: `var(--color-session-${type}-bg)` }
    : {}

  const borderStyle: React.CSSProperties = isOver
    ? { borderColor: "rgb(245, 158, 11)", borderStyle: "dashed" }
    : type
      ? { borderColor: `color-mix(in srgb, var(--color-session-${type}) 30%, transparent)` }
      : { borderStyle: "dashed" }

  const textStyle: React.CSSProperties = type
    ? { color: `var(--color-session-${type}-text)` }
    : {}

  // Merge refs: element is both draggable and droppable
  const setRefs = (el: HTMLElement | null) => {
    setDropRef(el)
    setDragRef(el)
  }

  return (
    <div
      ref={setRefs}
      {...attributes}
      {...listeners}
      className={`flex min-h-[180px] flex-col rounded-xl border p-3 transition-colors touch-none ${
        !type ? "border-dashed border-muted-foreground/25 bg-muted/30" : "cursor-grab active:cursor-grabbing"
      }`}
      style={{ ...bgStyle, ...borderStyle, ...textStyle, ...style }}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold">{day}</span>
        {type && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onClear(index)
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full text-xs opacity-40 transition-opacity hover:opacity-80"
          >
            &times;
          </button>
        )}
      </div>

      {/* Content */}
      {type === "quality" && template && (
        <QualityContent
          template={template}
          wu={wu}
          cd={cd}
          wuOverridden={wuOverridden}
          cdOverridden={cdOverridden}
          day={day}
          onWuChange={onWuChange}
          onCdChange={onCdChange}
          onResetWuCd={onResetWuCd}
          paceZones={paceZones}
        />
      )}
      {type === "easy" && (
        <EasyContent
          day={day}
          easyMin={easyMin}
          onEasyMinChange={onEasyMinChange}
          hasStrides={hasStrides}
          onStridesChange={onStridesChange}
        />
      )}
      {type === "long" && (
        <LongContent longMin={longMin} onLongMinChange={onLongMinChange} />
      )}
      {type === "rest" && <RestContent />}
      {!type && <EmptyContent />}
    </div>
  )
}
