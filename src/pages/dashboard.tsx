import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { useAuth } from "@/lib/auth-context"
import { apiFetch } from "@/lib/api"
import { get5kPace, getHR, getPaceZones, fmtPace, type InputMode } from "@/lib/calculator"

interface TestResult {
  id: string
  test_type: string
  test_date: string
  value_a: number
  value_b: number
  max_hr: number | null
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

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login?redirect=/dashboard", { replace: true })
    }
  }, [user, isLoading, navigate])

  useEffect(() => {
    if (user) {
      apiFetch<TestResult[]>("/api/tests")
        .then(setTests)
        .catch(() => setFetchError(true))
    }
  }, [user])

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

      {/* Section 4: Quick actions */}
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
        </div>
      </div>
    </main>
  )
}
