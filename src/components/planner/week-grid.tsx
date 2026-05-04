import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { CalendarDays } from "lucide-react"
import { DaySlot } from "@/components/planner/day-slot"
import { SESSION_META, type DaySlotData, type SessionType } from "@/lib/planner-data"
import type { PaceZones } from "@/lib/calculator"

interface WeekGridProps {
  week: DaySlotData[]
  onClear: (index: number) => void
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
  paceZones: PaceZones | null
}

const CHIP_TYPES: SessionType[] = ["easy", "long", "rest"]

function TypeChip({ type }: { type: SessionType }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `type-${type}`,
    data: { type },
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : undefined,
    background: `var(--color-session-${type}-bg)`,
    color: `var(--color-session-${type}-text)`,
    borderColor: `color-mix(in srgb, var(--color-session-${type}) 30%, transparent)`,
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="cursor-grab select-none rounded-full border px-3 py-1 text-xs font-medium active:cursor-grabbing touch-none"
      style={style}
    >
      {SESSION_META[type].label}
    </div>
  )
}

export function WeekGrid({
  week,
  onClear,
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
  paceZones,
}: WeekGridProps) {
  return (
    <div className="space-y-3 bg-muted/50 rounded-xl p-4">
      {/* Draggable session type chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <CalendarDays size={13} className="text-muted-foreground" />
          Drag to fill non-Q days:
        </span>
        {CHIP_TYPES.map((type) => (
          <TypeChip key={type} type={type} />
        ))}
      </div>

      {/* 7-day grid */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-1.5">
        {week.map((slot, i) => (
          <DaySlot
            key={slot.day}
            slot={slot}
            index={i}
            onClear={onClear}
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
            paceZones={paceZones}
          />
        ))}
      </div>
    </div>
  )
}
