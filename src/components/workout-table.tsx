import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { type WkMode, type Workout, type HRZones, fmtPace, hrRange } from "@/lib/calculator"

interface WorkoutTableProps {
  wkMode: WkMode
  workouts: Workout[]
  hr: HRZones
  onWkModeChange: (mode: WkMode) => void
}

const zoneColors: Record<string, { bg: string; text: string; label: string }> = {
  easy: { bg: "bg-zone-blue-bg", text: "text-zone-blue-text", label: "Easy" },
  low: { bg: "bg-zone-teal-bg", text: "text-zone-teal-text", label: "Low sub-T" },
  sub: { bg: "bg-zone-amber-bg", text: "text-zone-amber-text", label: "Sub-T" },
  top: { bg: "bg-zone-coral-bg", text: "text-zone-coral-text", label: "Upper sub-T" },
}

const zonePaceColor: Record<string, string> = {
  easy: "text-zone-blue",
  low: "text-zone-teal",
  sub: "text-zone-amber",
  top: "text-zone-coral",
}

export function WorkoutTable({ wkMode, workouts, hr, onWkModeChange }: WorkoutTableProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2.5">
        <span className="text-sm text-muted-foreground">Workout format</span>
        <div className="flex gap-1.5">
          <Button
            variant={wkMode === "dist" ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => onWkModeChange("dist")}
          >
            Distance
          </Button>
          <Button
            variant={wkMode === "time" ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => onWkModeChange("time")}
          >
            Time
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workout</TableHead>
              <TableHead>Pace/km</TableHead>
              <TableHead>HR range</TableHead>
              <TableHead>Rest</TableHead>
              <TableHead>Zone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workouts.map((w) => {
              const zc = zoneColors[w.zone]
              return (
                <TableRow key={w.name}>
                  <TableCell>
                    <div className="text-sm font-medium">{w.name}</div>
                    <div className="text-xs text-muted-foreground">{w.detail}</div>
                  </TableCell>
                  <TableCell className={`font-mono text-sm font-medium ${zonePaceColor[w.zone]}`}>
                    {fmtPace(w.pace)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {hrRange(w.zone, hr)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{w.rest}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${zc.bg} ${zc.text} border-0 text-xs`}>
                      {zc.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
