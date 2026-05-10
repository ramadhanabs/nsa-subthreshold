interface MetricCardsProps {
  ftp: number
}

export function MetricCards({ ftp }: MetricCardsProps) {
  const metrics = [
    { label: "Easy ceiling (75%)", value: `${Math.round(ftp * 0.75)}W` },
    { label: "Tempo (76–89%)", value: `${Math.round(ftp * 0.76)}–${Math.round(ftp * 0.89)}W` },
    { label: "Sub-T (90–105%)", value: `${Math.round(ftp * 0.90)}–${Math.round(ftp * 1.05)}W` },
    { label: "Threshold (100%)", value: `${ftp}W` },
  ]

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
      {metrics.map((m) => (
        <div key={m.label} className="bg-muted rounded-lg px-4 py-3.5">
          <div className="text-[0.7rem] text-muted-foreground mb-0.5">{m.label}</div>
          <div className="text-lg font-medium font-mono">{m.value}</div>
        </div>
      ))}
    </div>
  )
}
