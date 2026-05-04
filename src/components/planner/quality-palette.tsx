import { Button } from "@/components/ui/button"
import { Q_TEMPLATES, totalSessionMin, type QTemplate } from "@/lib/planner-data"

interface QualityPaletteProps {
  catFilter: string
  onCatFilterChange: (cat: string) => void
  onDragStart: (template: QTemplate) => void
}

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "short", label: "Short" },
  { key: "medium", label: "Medium" },
  { key: "long", label: "Long" },
] as const

export function QualityPalette({
  catFilter,
  onCatFilterChange,
  onDragStart,
}: QualityPaletteProps) {
  const templates =
    catFilter === "all"
      ? Object.values(Q_TEMPLATES).flat()
      : (Q_TEMPLATES[catFilter] ?? [])

  return (
    <div className="space-y-3">
      {/* Category filter buttons */}
      <div className="flex gap-2">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.key}
            size="sm"
            variant={catFilter === cat.key ? "default" : "outline"}
            onClick={() => onCatFilterChange(cat.key)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Draggable template chips */}
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <div
            key={t.id}
            draggable
            onDragStart={() => onDragStart(t)}
            className="cursor-grab rounded-md border border-[var(--color-session-quality)]/20 bg-[var(--color-session-quality-bg)] px-3 py-1.5 text-[var(--color-session-quality-text)] select-none active:cursor-grabbing"
          >
            <span className="text-sm font-medium">{t.name}</span>
            <span className="ml-1.5 text-xs opacity-70">
              {t.vol}min sub-T · {Math.round(totalSessionMin(t, 10, 10))}min
              total
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
