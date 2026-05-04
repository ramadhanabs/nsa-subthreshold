import type { HRZones } from "@/lib/calculator"

interface ZoneCardsProps {
  hr: HRZones
}

export function ZoneCards({ hr }: ZoneCardsProps) {
  const zones = [
    {
      title: "Easy / long run",
      lines: ["Below LT1", "3 easy + 1 long run", `under ${hr.easy} bpm`],
    },
    {
      title: "Sub-threshold",
      lines: ["LT1 to just under LT2", "3 quality sessions", `${hr.subLow}-${hr.subHigh} bpm`],
    },
    {
      title: "LTHR ceiling",
      lines: ["Never cross this line", "Set Garmin alert here", `${hr.lthr} bpm`],
    },
    {
      title: "Danger zone",
      lines: ["Supra-threshold", "Wrecks recovery fast", `${hr.lthr + 1}+ bpm`],
    },
  ]

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
      {zones.map((z) => (
        <div key={z.title} className="bg-muted rounded-lg px-3.5 py-3">
          <div className="text-[0.7rem] text-muted-foreground mb-0.5">{z.title}</div>
          {z.lines.map((line) => (
            <div key={line} className="text-xs leading-relaxed text-muted-foreground">{line}</div>
          ))}
        </div>
      ))}
    </div>
  )
}
