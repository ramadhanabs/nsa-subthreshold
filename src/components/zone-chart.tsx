import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { HRZones } from "@/lib/calculator"

interface ZoneChartProps {
  hr: HRZones
}

const chartConfig = {
  rest: { label: "Rest", color: "var(--color-zone-teal)" },
  belowEasy: { label: "Below easy", color: "var(--color-muted)" },
  easy: { label: "Easy", color: "var(--color-zone-blue)" },
  subT: { label: "Sub-T", color: "var(--color-zone-amber)" },
  upper: { label: "Upper sub-T", color: "var(--color-zone-coral)" },
  danger: { label: "Danger", color: "var(--color-zone-red)" },
} satisfies ChartConfig

export function ZoneChart({ hr }: ZoneChartProps) {
  const rest = 60
  const data = [
    {
      name: "HR zones",
      rest,
      belowEasy: hr.easy - rest,
      easy: hr.subLow - hr.easy,
      subT: hr.subHigh - hr.subLow,
      upper: hr.lthr - hr.subHigh,
      danger: hr.max - hr.lthr,
    },
  ]

  return (
    <div className="space-y-3">
      <ChartContainer config={chartConfig} className="h-[120px] w-full">
        <BarChart data={data} layout="vertical" barCategoryGap="20%">
          <XAxis type="number" domain={[50, 220]} tickCount={10} />
          <YAxis type="category" dataKey="name" width={80} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    rest: `Rest: ~60 bpm`,
                    belowEasy: `Below easy: 60-${hr.easy} bpm`,
                    easy: `Easy: ${hr.easy}-${hr.subLow} bpm`,
                    subT: `Sub-T: ${hr.subLow}-${hr.subHigh} bpm`,
                    upper: `Upper: ${hr.subHigh}-${hr.lthr} bpm`,
                    danger: `Danger: ${hr.lthr}+ bpm`,
                  }
                  return labels[name as string] ?? `${value}`
                }}
              />
            }
          />
          <Bar dataKey="rest" stackId="a" fill="var(--color-rest)" />
          <Bar dataKey="belowEasy" stackId="a" fill="var(--color-belowEasy)" />
          <Bar dataKey="easy" stackId="a" fill="var(--color-easy)" />
          <Bar dataKey="subT" stackId="a" fill="var(--color-subT)" />
          <Bar dataKey="upper" stackId="a" fill="var(--color-upper)" />
          <Bar dataKey="danger" stackId="a" fill="var(--color-danger)" />
        </BarChart>
      </ChartContainer>

      <div className="flex flex-wrap gap-3.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-zone-blue" /> Easy / long run
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-zone-amber" /> Sub-threshold
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-zone-coral" /> Upper sub-T
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-zone-red" /> Danger
        </span>
      </div>
    </div>
  )
}
