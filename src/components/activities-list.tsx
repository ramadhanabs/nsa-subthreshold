import { useState, useEffect, useCallback } from "react"
import { Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { fmtPace } from "@/lib/calculator"

interface ActivityRecord {
  id: string
  intervals_id: string
  date: string
  type: string
  name: string | null
  distance_m: number | null
  duration_secs: number | null
  avg_pace: number | null
  avg_hr: number | null
}

type Preset = "7d" | "30d" | "90d"

function getDateRange(preset: Preset): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90
  from.setDate(from.getDate() - days)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.round(secs % 60)
  if (h > 0) {
    return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`
  }
  return `${m}:${s < 10 ? "0" : ""}${s}`
}

export default function ActivitiesList() {
  const [preset, setPreset] = useState<Preset>("30d")
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const fetchActivities = useCallback(() => {
    const { from, to } = getDateRange(preset)
    setLoading(true)
    apiFetch<ActivityRecord[]>(`/api/activities?from=${from}&to=${to}`)
      .then(setActivities)
      .catch(() => setActivities([]))
      .finally(() => setLoading(false))
  }, [preset])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  async function handleSync() {
    const { from, to } = getDateRange(preset)
    setSyncing(true)
    try {
      await apiFetch("/api/activities/sync", {
        method: "POST",
        body: JSON.stringify({ from, to }),
      })
      fetchActivities()
    } catch {
      // ignore
    } finally {
      setSyncing(false)
    }
  }

  const presets: Preset[] = ["7d", "30d", "90d"]

  return (
    <div className="rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          <div className="text-[13px] font-medium">Activities</div>
        </div>
        <div className="flex items-center gap-1.5">
          {presets.map((p) => (
            <Button
              key={p}
              variant={preset === p ? "default" : "outline"}
              size="xs"
              onClick={() => setPreset(p)}
            >
              {p}
            </Button>
          ))}
          <Button
            variant="outline"
            size="xs"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? "Syncing..." : "Sync"}
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-xs text-muted-foreground py-6 text-center">Loading...</div>
      ) : activities.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center">
          No activities found. Sync your activities from Intervals.icu
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Header row */}
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.5fr)] gap-x-2 text-[11px] text-muted-foreground border-b border-border pb-1.5 mb-1">
            <div>Date</div>
            <div>Name</div>
            <div>Distance</div>
            <div>Duration</div>
            <div>Pace</div>
            <div>Avg HR</div>
          </div>
          {/* Data rows */}
          {activities.map((a) => (
            <div
              key={a.id}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.5fr)] gap-x-2 text-xs py-1.5 border-b border-border/50 last:border-0"
            >
              <div className="truncate">{a.date}</div>
              <div className="truncate">{a.name ?? a.type}</div>
              <div>{a.distance_m != null ? `${(a.distance_m / 1000).toFixed(1)} km` : "—"}</div>
              <div>{a.duration_secs != null ? fmtDuration(a.duration_secs) : "—"}</div>
              <div>{a.avg_pace != null ? `${fmtPace(a.avg_pace)}/km` : "—"}</div>
              <div>{a.avg_hr != null ? Math.round(a.avg_hr).toString() : "—"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
