import type { HRZones } from "@/lib/calculator"

interface ZoneCardsProps {
  hr: HRZones
}

export function ZoneCards({ hr }: ZoneCardsProps) {
  const zones = [
    {
      title: "Easy / long run",
      lines: ["Below LT1", "3 easy + 1 long run", `under ${hr.easy} bpm`],
      bg: "bg-zone-blue-bg",
      title_color: "text-zone-blue-text",
      line_color: "text-zone-blue",
    },
    {
      title: "Sub-threshold",
      lines: ["LT1 to just under LT2", "3 quality sessions", `${hr.subLow}-${hr.subHigh} bpm`],
      bg: "bg-zone-amber-bg",
      title_color: "text-zone-amber-text",
      line_color: "text-zone-amber",
    },
    {
      title: "LTHR ceiling",
      lines: ["Never cross this line", "Set Garmin alert here", `${hr.lthr} bpm`],
      bg: "bg-zone-coral-bg",
      title_color: "text-zone-coral-text",
      line_color: "text-zone-coral",
    },
    {
      title: "Danger zone",
      lines: ["Supra-threshold", "Wrecks recovery fast", `${hr.lthr + 1}+ bpm`],
      bg: "bg-zone-red-bg",
      title_color: "text-zone-red-text",
      line_color: "text-zone-red",
    },
  ]

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
      {zones.map((z) => (
        <div key={z.title} className={`${z.bg} rounded-lg px-3.5 py-3`}>
          <div className={`text-sm font-medium mb-1 ${z.title_color}`}>{z.title}</div>
          {z.lines.map((line) => (
            <div key={line} className={`text-xs leading-relaxed ${z.line_color}`}>{line}</div>
          ))}
        </div>
      ))}
    </div>
  )
}
