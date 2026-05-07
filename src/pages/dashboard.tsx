import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { useAuth } from "@/lib/auth-context"
import { apiFetch } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { get5kPace, getHR, getPaceZones, fmtPace, type InputMode } from "@/lib/calculator"
import TestTracker from "@/components/test-tracker"
import ActivitiesList from "@/components/activities-list"
// import BudgetCalculator from "@/components/budget-calculator"
import TrainingSummary from "@/components/training-summary"

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
  ctl?: number | null
  atl?: number | null
  resting_hr?: number | null
  sleep_hours?: number | null
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
  const [wellness, setWellness] = useState<{ ctl?: number; atl?: number; restingHR?: number; sleepHours?: number } | null>(null)
  const [intervalsConnected, setIntervalsConnected] = useState(false)
  const [intervalsAthleteId, setIntervalsAthleteId] = useState("")
  const [connectAthleteId, setConnectAthleteId] = useState("")
  const [connectApiKey, setConnectApiKey] = useState("")
  const [connectMsg, setConnectMsg] = useState("")
  const [syncMsg, setSyncMsg] = useState("")
  const [connectLoading, setConnectLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [intervalsOpen, setIntervalsOpen] = useState(false)

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
            const hrRecords = records.filter((r) => r.resting_hr)
            const avgHR = hrRecords.length > 0
              ? hrRecords.reduce((s, r) => s + (r.resting_hr ?? 0), 0) / hrRecords.length
              : undefined
            const sleepRecords = records.filter((r) => r.sleep_hours)
            const avgSleep = sleepRecords.length > 0
              ? sleepRecords.reduce((s, r) => s + (r.sleep_hours ?? 0), 0) / sleepRecords.length
              : undefined
            const latestCtl = records[0]?.ctl ?? undefined
            const latestAtl = records[0]?.atl ?? undefined
            setWellness({ ctl: latestCtl, atl: latestAtl, restingHR: avgHR, sleepHours: avgSleep })
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
    <main className="max-w-[1100px] mx-auto px-5 py-8 pb-12 space-y-6">
      {/* Two-column grid: left = user data, right = Intervals.icu data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left column: User profile, parameters, zones, tests ── */}
        <div className="space-y-6">
          {/* Profile header */}
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

          {/* Athlete parameters + Training zones */}
          {derived ? (
            <div className="space-y-4">
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

          {/* Quick actions */}
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
            </div>
          </div>
        </div>

        {/* ── Right column: Intervals.icu data ── */}
        <div className="space-y-6">
          {/* Intervals.icu connection (accordion) */}
          <div className="bg-muted/50 rounded-xl">
            <button
              onClick={() => setIntervalsOpen(!intervalsOpen)}
              className="flex items-center gap-2 w-full p-4 cursor-pointer"
            >
              <GlobeIcon />
              <div className="text-[13px] font-medium">Intervals.icu</div>
              <span className="relative flex h-2.5 w-2.5">
                {intervalsConnected && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${intervalsConnected ? "bg-emerald-500" : "bg-red-500"}`} />
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`ml-auto text-muted-foreground transition-transform duration-200 ${intervalsOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <div
              className={`grid transition-all duration-200 ease-in-out ${intervalsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 space-y-3">
                  {intervalsConnected ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-muted-foreground">
                        Connect your Intervals.icu account to sync wellness data
                      </div>
                      <form onSubmit={handleIntervalsConnect} className="flex flex-col gap-2">
                        <Input
                          placeholder="Athlete ID"
                          value={connectAthleteId}
                          onChange={(e) => setConnectAthleteId(e.target.value)}
                          required
                        />
                        <Input
                          placeholder="API key"
                          type="password"
                          value={connectApiKey}
                          onChange={(e) => setConnectApiKey(e.target.value)}
                          required
                        />
                        <button
                          type="submit"
                          disabled={connectLoading}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50 self-start"
                        >
                          {connectLoading ? "Connecting..." : "Connect"}
                        </button>
                      </form>
                      {connectMsg && <div className="text-xs text-muted-foreground">{connectMsg}</div>}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Training summary */}
          {intervalsConnected && <TrainingSummary />}

          {/* Progress */}
          <div>
            <div className="text-[13px] font-medium mb-3">Progress</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted rounded-lg p-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground mb-1"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                <div className="text-[0.65rem] text-muted-foreground">CTL (Fitness)</div>
                <div className="text-xl font-medium font-mono">
                  {wellness?.ctl != null ? Math.round(wellness.ctl) : "\u2014"}
                </div>
                <div className="text-[0.65rem] text-muted-foreground">chronic training load</div>
              </div>
              <div className="bg-muted rounded-lg p-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground mb-1"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                <div className="text-[0.65rem] text-muted-foreground">Resting HR</div>
                <div className="text-xl font-medium font-mono">
                  {wellness?.restingHR != null ? Math.round(wellness.restingHR) : "\u2014"}
                </div>
                <div className="text-[0.65rem] text-muted-foreground">avg last 7d</div>
              </div>
              <div className="bg-muted rounded-lg p-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground mb-1"><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></svg>
                <div className="text-[0.65rem] text-muted-foreground">Sleep</div>
                <div className="text-xl font-medium font-mono">
                  {wellness?.sleepHours != null ? wellness.sleepHours.toFixed(1) : "\u2014"}
                </div>
                <div className="text-[0.65rem] text-muted-foreground">avg hrs last 7d</div>
              </div>
              <div className="bg-muted rounded-lg p-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground mb-1"><path d="m8 2 1.88 1.88" /><path d="M14.12 3.88 16 2" /><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" /><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" /><path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" /><path d="M6 13H2" /><path d="M3 21c0-2.1 1.7-3.9 3.8-4" /><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" /><path d="M22 13h-4" /><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" /></svg>
                <div className="text-[0.65rem] text-muted-foreground">ATL (Fatigue)</div>
                <div className="text-xl font-medium font-mono">
                  {wellness?.atl != null ? Math.round(wellness.atl) : "\u2014"}
                </div>
                <div className="text-[0.65rem] text-muted-foreground">acute training load</div>
              </div>
            </div>
          </div>

          {/* This week */}
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

          {/* Activities list */}
          {intervalsConnected && <ActivitiesList />}
        </div>
      </div>
    </main>
  )
}
