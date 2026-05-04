import type { HRZones } from "@/lib/calculator"

interface MetricCardsProps {
  hr: HRZones
}

export function MetricCards({ hr }: MetricCardsProps) {
  const metrics = [
    { label: "LTHR (89% MHR)", value: hr.lthr },
    { label: "Easy ceiling (70%)", value: hr.easy },
    { label: "Sub-T low (90%)", value: hr.subLow },
    { label: "Sub-T high (98%)", value: hr.subHigh },
  ]

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2.5">
      {metrics.map((m) => (
        <div key={m.label} className="bg-muted rounded-lg px-4 py-3.5">
          <div className="text-[0.7rem] text-muted-foreground mb-0.5">{m.label}</div>
          <div className="text-xl font-medium font-mono">{m.value}</div>
        </div>
      ))}
    </div>
  )
}
