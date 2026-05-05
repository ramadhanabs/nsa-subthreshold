import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { useAuth } from "@/lib/auth-context"
import { apiFetch } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { get5kPace, getHR, getPaceZones, fmtPace, type InputMode } from "@/lib/calculator"
import TestTracker from "@/components/test-tracker"
import ActivitiesList from "@/components/activities-list"
import BudgetCalculator from "@/components/budget-calculator"

interface TestResult {
  id: string
  test_type: string
  test_date: string
  value_a: number
  value_b: number
  max_hr: number | null
  notes: string | null
  created_at: string
}

interface WellnessRecord {
  ctl?: number
  restingHR?: number
}

function GlobeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  )
}

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${fmt(monday)} – ${fmt(sunday)}, ${sunday.getFullYear()}`
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [tests, setTests] = useState<TestResult[] | null>(null)
  const [fetchError, setFetchError] = useState(false)

  // Wellness / Intervals.icu state
  const [wellness, setWellness] = useState<WellnessRecord | null>(null)
  const [intervalsConnected, setIntervalsConnected] = useState(false)
  const [intervalsAthleteId, setIntervalsAthleteId] = useState("")
  const [connectAthleteId, setConnectAthleteId] = useState("")
  const [connectApiKey, setConnectApiKey] = useState("")
  const [connectMsg, setConnectMsg] = useState("")
  const [syncMsg, setSyncMsg] = useState("")
  const [connectLoading, setConnectLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login?redirect=/dashboard", { replace: true })
    }
  }, [user, isLoading, navigate])

  const fetchTests = useCallback(() => {
    apiFetch<TestResult[]>("/api/tests")
      .then(setTests)
      .catch(() => setFetchError(true))
  }, [])

  useEffect(() => {
    if (user) {
      fetchTests()

      // Try fetching wellness data (last 7 days)
      const from = new Date()
      from.setDate(from.getDate() - 7)
      const fromStr = from.toISOString().slice(0, 10)
      apiFetch<WellnessRecord[]>(`/api/wellness?from=${fromStr}`)
        .then((records) => {
          if (records && records.length > 0) {
            const avgHR = records.reduce((s, r) => s + (r.restingHR ?? 0), 0) / records.filter((r) => r.restingHR).length
            const latestCtl = records[records.length - 1]?.ctl
            setWellness({ ctl: latestCtl, restingHR: avgHR || undefined })
            setIntervalsConnected(true)
          }
        })
        .catch(() => {
          // Not connected or no data — ignore
        })
    }
  }, [user])

  async function handleIntervalsConnect(e: FormEvent) {
    e.preventDefault()
    setConnectLoading(true)
    setConnectMsg("")
    try {
      await apiFetch("/api/intervals/connect", {
        method: "POST",
        body: JSON.stringify({ athlete_id: connectAthleteId, api_key: connectApiKey }),
      })
      setIntervalsConnected(true)
      setIntervalsAthleteId(connectAthleteId)
      setConnectMsg("Connected successfully")
    } catch (err: unknown) {
      setConnectMsg(err instanceof Error ? err.message : "Connection failed")
    } finally {
      setConnectLoading(false)
    }
  }

  async function handleSync() {
    setSyncLoading(true)
    setSyncMsg("")
    try {
      const res = await apiFetch<{ synced: number }>("/api/intervals/sync", { method: "POST" })
      setSyncMsg(`Synced ${res.synced} records`)
      setIntervalsConnected(true)
    } catch (err: unknown) {
      setSyncMsg(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncLoading(false)
    }
  }

  const handleAddTest = useCallback(
    async (data: { test_type: string; test_date: string; value_a: number; value_b: number }) => {
      await apiFetch("/api/tests", {
        method: "POST",
        body: JSON.stringify(data),
      })
      fetchTests()
    },
    [fetchTests],
  )

  const handleDeleteTest = useCallback(
    async (id: string) => {
      await apiFetch(`/api/tests/${id}`, { method: "DELETE" })
      fetchTests()
    },
    [fetchTests],
  )

  if (isLoading) return null
  if (!user) return null

  const latest = tests?.[0] ?? null
  const derived = latest
    ? (() => {
        const fkp = get5kPace(latest.test_type as InputMode, latest.value_a, latest.value_b)
        const hr = getHR(latest.max_hr || 208)
        const paceZones = getPaceZones(fkp)
        const fiveKTime = fkp * 5
        return { fkp, hr, paceZones, fiveKTime }
      })()
    : null

  const initials = user.email.slice(0, 2).toUpperCase()

  return (
    <main className="max-w-[740px] mx-auto px-5 py-8 pb-12 space-y-6">
      {/* Section 1: Profile header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white text-sm font-medium flex items-center justify-center">
            {initials}
          </div>
          <div>
            <div className="text-sm font-medium">{user.email}</div>
            <div className="text-xs text-muted-foreground">NSA Runner</div>
          </div>
        </div>
        <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
          Edit profile
        </button>
      </div>

      {/* Section 2: Athlete parameters + Training zones */}
      {derived ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Athlete parameters */}
          <div>
            <div className="text-[13px] font-medium mb-3">Athlete parameters</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted rounded-lg p-2.5">
                <div className="text-[11px] text-muted-foreground">5K PB</div>
                <div className="text-base font-medium">{fmtPace(derived.fiveKTime)}</div>
              </div>
              <div className="bg-muted rounded-lg p-2.5">
                <div className="text-[11px] text-muted-foreground">Threshold pace</div>
                <div className="text-base font-medium">{fmtPace(derived.paceZones.threshold)}/km</div>
              </div>
              <div className="bg-muted rounded-lg p-2.5">
                <div className="text-[11px] text-muted-foreground">Max HR</div>
                <div className="text-base font-medium">{derived.hr.max} bpm</div>
              </div>
              <div className="bg-muted rounded-lg p-2.5">
                <div className="text-[11px] text-muted-foreground">LTHR</div>
                <div className="text-base font-medium">{derived.hr.lthr} bpm</div>
              </div>
            </div>
          </div>

          {/* Right: Training zones */}
          <div>
            <div className="text-[13px] font-medium mb-3">Training zones</div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-blue-500" />
                <div className="text-xs text-muted-foreground flex-1">Easy</div>
                <div className="text-xs font-medium">
                  {fmtPace(derived.paceZones.long[1])}–{fmtPace(derived.paceZones.easyMax)}/km
                </div>
                <div className="text-[11px] text-muted-foreground min-w-[64px] text-right">
                  &lt; {derived.hr.easy} bpm
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-amber-500" />
                <div className="text-xs text-muted-foreground flex-1">Sub-threshold</div>
                <div className="text-xs font-medium">
                  {fmtPace(derived.paceZones.short[0])}–{fmtPace(derived.paceZones.long[1])}/km
                </div>
                <div className="text-[11px] text-muted-foreground min-w-[64px] text-right">
                  {derived.hr.subLow}–{derived.hr.subHigh} bpm
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-red-500" />
                <div className="text-xs text-muted-foreground flex-1">LTHR ceiling</div>
                <div className="text-xs font-medium">—</div>
                <div className="text-[11px] text-red-700 dark:text-red-400 min-w-[64px] text-right">
                  {derived.hr.lthr} bpm
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
          {fetchError
            ? "Failed to load test results."
            : tests === null
              ? "Loading..."
              : "No test results yet — record your first test below"}
        </div>
      )}

      {/* Section 3: This week */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <div className="text-[13px] font-medium">This week</div>
          <div className="text-[11px] text-muted-foreground">{getWeekRange()}</div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-3">
          {DAYS.map((day) => (
            <div key={day} className="text-center">
              <div className="text-[10px] text-muted-foreground mb-1">{day}</div>
              <div className="h-12 rounded-md bg-muted flex items-center justify-center">
                <div className="text-[10px] text-muted-foreground">—</div>
              </div>
            </div>
          ))}
        </div>
        <Link
          to="/planner"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Plan your week &rarr;
        </Link>
      </div>

      {/* Training budget calculator */}
      <BudgetCalculator />

      {/* Section 4: Progress */}
      <div>
        <div className="text-[13px] font-medium mb-3">Progress</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-muted rounded-lg p-2.5">
            <div className="text-[0.65rem] text-muted-foreground">CTL</div>
            <div className="text-xl font-medium font-mono">
              {wellness?.ctl != null ? Math.round(wellness.ctl) : "\u2014"}
            </div>
            <div className="text-[0.65rem] text-muted-foreground">chronic training load</div>
          </div>
          <div className="bg-muted rounded-lg p-2.5">
            <div className="text-[0.65rem] text-muted-foreground">Resting HR</div>
            <div className="text-xl font-medium font-mono">
              {wellness?.restingHR != null ? Math.round(wellness.restingHR) : "\u2014"}
            </div>
            <div className="text-[0.65rem] text-muted-foreground">avg last 7d</div>
          </div>
          <div className="bg-muted rounded-lg p-2.5">
            <div className="text-[0.65rem] text-muted-foreground">Week streak</div>
            <div className="text-xl font-medium font-mono">{"\u2014"}</div>
            <div className="text-[0.65rem] text-muted-foreground">consecutive</div>
          </div>
          <div className="bg-muted rounded-lg p-2.5">
            <div className="text-[0.65rem] text-muted-foreground">Phase</div>
            <div className="text-xl font-medium font-mono">{"\u2014"}</div>
            <div className="text-[0.65rem] text-muted-foreground">
              {intervalsConnected ? "current block" : "connect Intervals.icu"}
            </div>
          </div>
        </div>
      </div>

      {/* Activities list (only when Intervals.icu connected) */}
      {intervalsConnected && <ActivitiesList />}

      {/* Test tracker */}
      {tests && (
        <div>
          <TestTracker
            tests={tests}
            onAdd={handleAddTest}
            onDelete={handleDeleteTest}
          />
        </div>
      )}

      {/* Section 5: Intervals.icu */}
      <div className="bg-muted/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <GlobeIcon />
          <div className="text-[13px] font-medium">Intervals.icu</div>
        </div>

        {intervalsConnected ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Connected {intervalsAthleteId ? `\u2014 Athlete ${intervalsAthleteId}` : ""}
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={handleSync}
                disabled={syncLoading}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                {syncLoading ? "Syncing..." : "Sync wellness"}
              </button>
              <button
                onClick={() => {
                  setIntervalsConnected(false)
                  setIntervalsAthleteId("")
                  setWellness(null)
                  setSyncMsg("")
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Disconnect
              </button>
            </div>
            {syncMsg && <div className="text-xs text-muted-foreground">{syncMsg}</div>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Connect your Intervals.icu account to sync wellness data
            </div>
            <form onSubmit={handleIntervalsConnect} className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Athlete ID"
                value={connectAthleteId}
                onChange={(e) => setConnectAthleteId(e.target.value)}
                required
                className="flex-1"
              />
              <Input
                placeholder="API key"
                type="password"
                value={connectApiKey}
                onChange={(e) => setConnectApiKey(e.target.value)}
                required
                className="flex-1"
              />
              <button
                type="submit"
                disabled={connectLoading}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                {connectLoading ? "Connecting..." : "Connect"}
              </button>
            </form>
            {connectMsg && <div className="text-xs text-muted-foreground">{connectMsg}</div>}
          </div>
        )}
      </div>

      {/* Section 6: Quick actions */}
      <div>
        <div className="text-[13px] font-medium mb-3">Quick actions</div>
        <div className="flex gap-2 flex-wrap">
          <Link
            to="/planner"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            Plan next week
          </Link>
          <Link
            to="/calculator"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            Pace calculator
          </Link>
          <button
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            Record a test
          </button>
          <button
            onClick={intervalsConnected ? handleSync : undefined}
            disabled={!intervalsConnected}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Sync wellness
          </button>
        </div>
      </div>
    </main>
  )
}
