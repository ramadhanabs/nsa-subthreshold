import { DaySlot } from "@/components/planner/day-slot"
import { SESSION_META, type DaySlotData, type SessionType } from "@/lib/planner-data"

interface WeekGridProps {
  week: DaySlotData[]
  dragOverIndex: number | null
  onDrop: (index: number) => void
  onDragOver: (index: number) => void
  onDragLeave: (index: number) => void
  onClear: (index: number) => void
  onCycle: (index: number) => void
  onTypeDragStart: (type: SessionType) => void
  // Easy
  easyInputs: Record<string, number>
  onEasyMinChange: (day: string, min: number) => void
  strides: Record<string, boolean>
  onStridesChange: (day: string, v: boolean) => void
  // Long
  longMin: number
  onLongMinChange: (min: number) => void
  // WU/CD
  getWu: (day: string) => number
  getCd: (day: string) => number
  isWuOverridden: (day: string) => boolean
  isCdOverridden: (day: string) => boolean
  onWuChange: (day: string, v: number) => void
  onCdChange: (day: string, v: number) => void
  onResetWuCd: (day: string) => void
}

const CHIP_TYPES: SessionType[] = ["easy", "long", "rest"]

export function WeekGrid({
  week,
  dragOverIndex,
  onDrop,
  onDragOver,
  onDragLeave,
  onClear,
  onCycle,
  onTypeDragStart,
  easyInputs,
  onEasyMinChange,
  strides,
  onStridesChange,
  longMin,
  onLongMinChange,
  getWu,
  getCd,
  isWuOverridden,
  isCdOverridden,
  onWuChange,
  onCdChange,
  onResetWuCd,
}: WeekGridProps) {
  return (
    <div className="space-y-3">
      {/* Draggable session type chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Drag to fill non-Q days:
        </span>
        {CHIP_TYPES.map((type) => (
          <div
            key={type}
            draggable
            onDragStart={() => onTypeDragStart(type)}
            className="cursor-grab select-none rounded-full border px-3 py-1 text-xs font-medium active:cursor-grabbing"
            style={{
              background: `var(--color-session-${type}-bg)`,
              color: `var(--color-session-${type}-text)`,
              borderColor: `color-mix(in srgb, var(--color-session-${type}) 30%, transparent)`,
            }}
          >
            {SESSION_META[type].label}
          </div>
        ))}
      </div>

      {/* 7-day grid */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
        {week.map((slot, i) => (
          <DaySlot
            key={slot.day}
            slot={slot}
            index={i}
            isOver={dragOverIndex === i}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClear={onClear}
            onCycle={onCycle}
            easyMin={easyInputs[slot.day] || 40}
            onEasyMinChange={onEasyMinChange}
            hasStrides={!!strides[slot.day]}
            onStridesChange={onStridesChange}
            longMin={longMin}
            onLongMinChange={onLongMinChange}
            wu={getWu(slot.day)}
            cd={getCd(slot.day)}
            wuOverridden={isWuOverridden(slot.day)}
            cdOverridden={isCdOverridden(slot.day)}
            onWuChange={onWuChange}
            onCdChange={onCdChange}
            onResetWuCd={onResetWuCd}
          />
        ))}
      </div>
    </div>
  )
}
