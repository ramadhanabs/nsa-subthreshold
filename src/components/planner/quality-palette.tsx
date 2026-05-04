import { Settings, PersonStanding } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Q_TEMPLATES, totalSessionMin, type QTemplate } from "@/lib/planner-data"
import { fmtPace, type PaceZones } from "@/lib/calculator"

interface QualityPaletteProps {
  catFilter: string
  onCatFilterChange: (cat: string) => void
  onDragStart: (template: QTemplate) => void
  defaultWu: number
  defaultCd: number
  onDefaultWuChange: (v: number) => void
  onDefaultCdChange: (v: number) => void
  paceZones: PaceZones | null
}

function paceRangeForTemplate(t: QTemplate, pz: PaceZones): [number, number] {
  if (t.id.startsWith("s")) return pz.short
  if (t.id.startsWith("m")) return pz.medium
  return pz.long
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
  defaultWu,
  defaultCd,
  onDefaultWuChange,
  onDefaultCdChange,
  paceZones,
}: QualityPaletteProps) {
  const templates =
    catFilter === "all"
      ? Object.values(Q_TEMPLATES).flat()
      : (Q_TEMPLATES[catFilter] ?? [])

  return (
    <div className="space-y-3 max-h-[650px] flex flex-col bg-muted/50 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium flex items-center gap-1.5">
          <PersonStanding size={14} className="text-muted-foreground" />
          Workout templates
        </div>
        <Dialog>
          <DialogTrigger className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer">
            <Settings size={14} />
          </DialogTrigger>
          <DialogContent className="sm:max-w-[340px]">
            <DialogHeader>
              <DialogTitle>Warmup / Cooldown</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              Default warmup and cooldown duration applied to all quality sessions. You can override per day in the week grid.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <label className="text-sm w-20">Warmup</label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={defaultWu}
                  onChange={(e) => onDefaultWuChange(Number(e.target.value) || 0)}
                  className="w-16 text-center font-mono text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
                <span className="text-xs text-muted-foreground">min</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm w-20">Cooldown</label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={defaultCd}
                  onChange={(e) => onDefaultCdChange(Number(e.target.value) || 0)}
                  className="w-16 text-center font-mono text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
                <span className="text-xs text-muted-foreground">min</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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

      {/* Draggable template cards */}
      <div className="grid grid-cols-2 gap-2 overflow-y-auto min-h-0">
        {templates.map((t) => {
          const totalMin = Math.round(totalSessionMin(t, defaultWu, defaultCd))
          return (
            <div
              key={t.id}
              draggable
              onDragStart={() => onDragStart(t)}
              className="cursor-grab rounded-lg bg-muted p-2.5 select-none active:cursor-grabbing"
            >
              {/* Workout structure chart: WU + reps + rest + CD */}
              <div className="flex items-end gap-[2px] mb-2" style={{ height: 28 }}>
                {/* Warmup */}
                <div
                  className="rounded-sm shrink-0"
                  style={{
                    width: Math.max(4, defaultWu / 2),
                    height: 14,
                    background: "var(--color-session-easy)",
                    opacity: 0.5,
                  }}
                />
                {/* Main set: reps + rest gaps */}
                {Array.from({ length: t.reps }).flatMap((_, i) => {
                  const repHeight = Math.max(14, Math.round((t.dur / 15) * 28))
                  const blocks = [
                    <div
                      key={`r${i}`}
                      className="rounded-sm shrink-0"
                      style={{
                        width: 5,
                        height: repHeight,
                        background: "var(--color-session-quality)",
                        opacity: 0.8,
                      }}
                    />,
                  ]
                  if (i < t.reps - 1) {
                    blocks.push(
                      <div
                        key={`g${i}`}
                        className="shrink-0"
                        style={{
                          width: 2,
                          height: 7,
                          background: "var(--color-session-easy)",
                          opacity: 0.3,
                        }}
                      />
                    )
                  }
                  return blocks
                })}
                {/* Cooldown */}
                <div
                  className="rounded-sm shrink-0"
                  style={{
                    width: Math.max(4, defaultCd / 2),
                    height: 14,
                    background: "var(--color-session-easy)",
                    opacity: 0.5,
                  }}
                />
              </div>

              {/* Session label */}
              <div className="text-xs font-medium text-foreground">
                Sub-Threshold
              </div>
              <div className="text-xs text-muted-foreground mb-1.5">
                {t.name.includes("×") ? t.name.replace("×", " × ") : t.name}
              </div>

              {/* Session breakdown */}
              <div className="text-[0.65rem] text-muted-foreground space-y-0.5">
                <div className="flex justify-between">
                  <span>Warmup</span>
                  <span className="font-mono">{defaultWu}min</span>
                </div>
                <div className="pt-0.5 border-t border-border/50 space-y-0.5">
                  <div className="flex justify-between font-medium text-foreground">
                    <span>Main Set</span>
                    <span className="font-mono">{t.reps}×</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.dur} min pace</span>
                    <span className="font-mono">
                      {paceZones
                        ? `${fmtPace(paceRangeForTemplate(t, paceZones)[0])}–${fmtPace(paceRangeForTemplate(t, paceZones)[1])}/km`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rest</span>
                    <span className="font-mono">{t.rest}s</span>
                  </div>
                </div>
                <div className="flex justify-between pt-0.5 border-t border-border/50">
                  <span>Cooldown</span>
                  <span className="font-mono">{defaultCd}min</span>
                </div>
                <div className="flex justify-between pt-0.5 border-t border-border/50">
                  <span>Total</span>
                  <span className="font-mono">{totalMin}min</span>
                </div>
                {paceZones && (() => {
                  const [lo, hi] = paceRangeForTemplate(t, paceZones)
                  const avgPace = (lo + hi) / 2
                  const workKm = t.reps * (t.dur * 60) / avgPace
                  const wuCdKm = (defaultWu + defaultCd) * 60 / paceZones.easyMax
                  const totalKm = workKm + wuCdKm
                  return (
                    <div className="flex justify-between pt-0.5 border-t border-border/50">
                      <span>Est. distance</span>
                      <span className="font-mono">~{totalKm.toFixed(1)}km</span>
                    </div>
                  )
                })()}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
