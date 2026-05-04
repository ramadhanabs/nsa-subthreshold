import { Gauge } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { type PaceZones, fmtPace } from "@/lib/calculator"

interface PaceCardProps {
  paceZones: PaceZones
}

const intervals = [
  {
    label: "Short",
    key: "short" as const,
    tip: "CV pace x 1.03–1.08. Used for ~1 km or ~4 min efforts. Slightly faster than threshold — sharpens turnover while staying sub-LT2.",
  },
  {
    label: "Medium",
    key: "medium" as const,
    tip: "CV pace x 1.07–1.11. Used for ~1.6 km or ~6 min efforts. The core NSA session — steady sub-threshold pace that builds lactate clearance.",
  },
  {
    label: "Long",
    key: "long" as const,
    tip: "CV pace x 1.10–1.14. Used for ~2–3 km or ~8–12 min efforts. Slowest sub-T pace — builds deep aerobic endurance near LT2.",
  },
]

function InfoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none" className="inline-block text-muted-foreground/60">
      <path
        d="M7.5 0.875C3.83 0.875 0.875 3.83 0.875 7.5S3.83 14.125 7.5 14.125 14.125 11.17 14.125 7.5 11.17 0.875 7.5 0.875ZM7.5 4.25a.625.625 0 110 1.25.625.625 0 010-1.25ZM8.5 10.5h-2v-.75h.5V7.5H6.5v-.75h1.5v3h.5v.75Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function PaceCard({ paceZones }: PaceCardProps) {
  const { threshold, easyMax } = paceZones

  return (
    <Card>
      <CardContent className="py-5 px-5 space-y-5">
        <div>
          <div className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center gap-1.5">
            <Gauge size={13} />
            Threshold Pace
            <Tooltip>
              <TooltipTrigger className="cursor-help"><InfoIcon />
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px] text-xs leading-relaxed">
                Estimated critical velocity (CV) = 5K pace x 1.02. Derived from the
                Daniels/Tinman VDOT equivalency tables. CV approximates the pace you
                could hold for ~30–40 min — just below lactate threshold (LT2).
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="text-2xl font-semibold font-mono tracking-tight">
            {fmtPace(threshold)}/km
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            NSA Intervals
            <Tooltip>
              <TooltipTrigger className="cursor-help"><InfoIcon />
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px] text-xs leading-relaxed">
                Norwegian Singles approach (Sirpoc84/LetsRun). All intervals run below
                threshold — pace factors applied to CV to keep effort sub-LT2. Shorter
                reps are slightly faster, longer reps slightly slower.
              </TooltipContent>
            </Tooltip>
          </div>
          {intervals.map((i) => {
            const range = paceZones[i.key] as [number, number]
            return (
              <div key={i.key} className="flex items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm">{i.label}</span>
                  <Tooltip>
                    <TooltipTrigger className="cursor-help self-center"><InfoIcon />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[260px] text-xs leading-relaxed">
                      {i.tip}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                  {fmtPace(range[0])} – {fmtPace(range[1])}/km
                </span>
              </div>
            )
          })}
        </div>

        <div className="border-t pt-3 space-y-2">
          <div className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            Easy / Long Runs
            <Tooltip>
              <TooltipTrigger className="cursor-help"><InfoIcon />
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px] text-xs leading-relaxed">
                Max easy pace = 5K pace x 1.38 (Friel/Daniels easy zone). Stay under
                70% max HR. Slower is fine — the aerobic benefit is nearly identical
                across the easy range.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Max Pace</span>
            <span className="text-sm font-mono text-muted-foreground">
              ≤{fmtPace(easyMax)}/km
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
