import { Input } from "@/components/ui/input"
import { totalSessionMin, type DaySlotData, type QTemplate } from "@/lib/planner-data"

interface DaySlotProps {
  slot: DaySlotData
  index: number
  isOver: boolean
  onDrop: (index: number) => void
  onDragOver: (index: number) => void
  onDragLeave: (index: number) => void
  onClear: (index: number) => void
  onCycle: (index: number) => void
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
}

const NUM_INPUT_CLS =
  "font-mono text-center text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"

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
}) {
  const restSec = template.rest
  const restLabel = restSec >= 60 ? `${restSec / 60}m` : `${restSec}s`
  const total = Math.round(totalSessionMin(template, wu, cd))

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
        Quality
      </p>
      <p className="text-base font-bold leading-tight">{template.name}</p>
      <p className="text-xs opacity-70">
        {template.vol}m sub-T &middot; {restLabel} rest
      </p>

      {/* WU / CD grid */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-0.5 block text-[10px] uppercase tracking-wider opacity-50">
            WU
          </label>
          <Input
            type="number"
            min={0}
            max={30}
            value={wu}
            onChange={(e) => onWuChange(day, Number(e.target.value))}
            className={NUM_INPUT_CLS}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] uppercase tracking-wider opacity-50">
            CD
          </label>
          <Input
            type="number"
            min={0}
            max={30}
            value={cd}
            onChange={(e) => onCdChange(day, Number(e.target.value))}
            className={NUM_INPUT_CLS}
          />
        </div>
      </div>

      <p className="text-[10px] opacity-50">easy pace</p>

      {(wuOverridden || cdOverridden) && (
        <button
          type="button"
          onClick={() => onResetWuCd(day)}
          className="text-[10px] text-blue-500 underline hover:text-blue-600"
        >
          reset to default
        </button>
      )}

      <p className="text-xs font-medium opacity-80">{total}min total</p>
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
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
        Easy run
      </p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={20}
          max={90}
          value={easyMin}
          onChange={(e) => onEasyMinChange(day, Number(e.target.value))}
          className={`w-16 ${NUM_INPUT_CLS}`}
        />
        <span className="text-xs opacity-60">min</span>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={hasStrides}
          onChange={(e) => onStridesChange(day, e.target.checked)}
          className="accent-current"
        />
        4&times;20s strides
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
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
        Long run
      </p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={45}
          max={180}
          value={longMin}
          onChange={(e) => onLongMinChange(Number(e.target.value))}
          className={`w-16 ${NUM_INPUT_CLS}`}
        />
        <span className="text-xs opacity-60">min</span>
      </div>
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
        Drop here or click to cycle
      </p>
    </div>
  )
}

export function DaySlot({
  slot,
  index,
  isOver,
  onDrop,
  onDragOver,
  onDragLeave,
  onClear,
  onCycle,
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
}: DaySlotProps) {
  const { day, type, template } = slot

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

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver(index)
      }}
      onDragLeave={() => onDragLeave(index)}
      onDrop={(e) => {
        e.preventDefault()
        onDrop(index)
      }}
      onClick={!type ? () => onCycle(index) : undefined}
      className={`flex min-h-[180px] flex-col rounded-xl border p-3 transition-colors ${
        !type ? "cursor-pointer border-dashed border-muted-foreground/25 bg-muted/30" : ""
      }`}
      style={{ ...bgStyle, ...borderStyle, ...textStyle }}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold">{day}</span>
        {type && (
          <button
            type="button"
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
