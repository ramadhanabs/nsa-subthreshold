# Sub-threshold Calculator: Vite + React + shadcn Conversion

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert a single-file HTML calculator into a Vite + React Router + Tailwind + shadcn/ui app with Recharts-based charts.

**Architecture:** Single-page React app with state lifted to the page component. Pure calculation logic extracted to `lib/calculator.ts`. shadcn components (Card, Button, Input, Slider, Table, Badge, Chart) for UI. Dark mode via shadcn's class-based theme.

**Tech Stack:** Vite, React 19, TypeScript, React Router, Tailwind CSS v4, shadcn/ui (Radix), Recharts (via shadcn Chart)

**Source reference:** `/Users/mac/Downloads/subthreshold-calculator.html`

---

### Task 1: Scaffold Vite + React + Tailwind + shadcn project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `src/index.css`, `src/main.tsx`, `src/App.tsx`, `index.html`

**Step 1: Create Vite project**

```bash
cd /Users/mac/Documents/explore/nsa-subthreshold
pnpm create vite@latest . --template react-ts
```

If prompted about non-empty directory, proceed (only `docs/` exists).

**Step 2: Install dependencies**

```bash
pnpm install
pnpm add tailwindcss @tailwindcss/vite
pnpm add -D @types/node
pnpm add react-router
```

**Step 3: Configure Tailwind in Vite**

Replace `vite.config.ts`:

```ts
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

**Step 4: Configure TypeScript paths**

Add to `compilerOptions` in both `tsconfig.json` and `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Step 5: Replace `src/index.css`**

```css
@import "tailwindcss";
```

**Step 6: Initialize shadcn**

```bash
pnpm dlx shadcn@latest init
```

Accept defaults. This creates `components.json` and `src/components/ui/` structure, and updates `src/index.css` with shadcn's CSS variable layer.

**Step 7: Add shadcn components**

```bash
pnpm dlx shadcn@latest add card button input slider table badge chart
```

**Step 8: Add custom fonts and color tokens**

Append to `src/index.css` after the shadcn imports:

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600&family=JetBrains+Mono:wght@400;500&display=swap');

@theme {
  --font-sans: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --color-zone-blue: #2E6FBA;
  --color-zone-blue-bg: #E8F0FA;
  --color-zone-blue-text: #1A4A82;
  --color-zone-amber: #C8850F;
  --color-zone-amber-bg: #FBF0D8;
  --color-zone-amber-text: #6B4502;
  --color-zone-coral: #C04A22;
  --color-zone-coral-bg: #FCEAE4;
  --color-zone-coral-text: #6B2810;
  --color-zone-red: #C43030;
  --color-zone-red-bg: #FDE8E8;
  --color-zone-red-text: #6B1414;
  --color-zone-teal: #0E7A5A;
  --color-zone-teal-bg: #E0F4ED;
  --color-zone-teal-text: #04382E;
}

.dark {
  --color-zone-blue: #5A9DE6;
  --color-zone-blue-bg: #1A2A3E;
  --color-zone-blue-text: #A8CCF2;
  --color-zone-amber: #E8A830;
  --color-zone-amber-bg: #2E2410;
  --color-zone-amber-text: #F4D08A;
  --color-zone-coral: #E86840;
  --color-zone-coral-bg: #2E1810;
  --color-zone-coral-text: #F4AA90;
  --color-zone-red: #E85050;
  --color-zone-red-bg: #2E1414;
  --color-zone-red-text: #F4A0A0;
  --color-zone-teal: #3CC8A0;
  --color-zone-teal-bg: #0E2E24;
  --color-zone-teal-text: #90E8D0;
}
```

**Step 9: Set up React Router in `src/main.tsx`**

```tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router"
import "./index.css"
import CalculatorPage from "./pages/calculator"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CalculatorPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
```

Delete `src/App.tsx`, `src/App.css`, and any Vite boilerplate assets.

**Step 10: Create placeholder page**

Create `src/pages/calculator.tsx`:

```tsx
export default function CalculatorPage() {
  return <div className="max-w-[740px] mx-auto px-5 py-8">
    <h1 className="text-2xl font-semibold tracking-tight">Sub-threshold training calculator</h1>
    <p className="text-sm text-muted-foreground max-w-[520px]">
      Norwegian Singles method — derive your sub-threshold paces and HR zones from a 5K race or 20-minute time trial.
    </p>
  </div>
}
```

**Step 11: Verify it runs**

```bash
pnpm dev
```

Expected: Page loads with heading and subtitle, DM Sans font, shadcn theme active.

**Step 12: Commit**

```bash
git init
echo "node_modules\ndist\n.env*" > .gitignore
git add .
git commit -m "feat: scaffold Vite + React + Tailwind + shadcn project"
```

---

### Task 2: Extract calculation logic to `lib/calculator.ts`

**Files:**
- Create: `src/lib/calculator.ts`
- Test: `src/lib/calculator.test.ts`

**Step 1: Write tests**

Create `src/lib/calculator.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { get5kPace, getHR, getWorkouts, fmtPace } from "./calculator"

describe("get5kPace", () => {
  it("returns pace per km from 5k time", () => {
    // 24:30 over 5km = 294s/km
    expect(get5kPace("5k", 24, 30)).toBe(294)
  })

  it("returns pace per km from 20min test distance", () => {
    // 20min test, 4.50km => 1200/4.5 = 266.67
    expect(get5kPace("20min", 4, 50)).toBeCloseTo(266.67, 1)
  })
})

describe("getHR", () => {
  it("derives zones from max HR 208", () => {
    const hr = getHR(208)
    expect(hr.max).toBe(208)
    expect(hr.lthr).toBe(185)
    expect(hr.easy).toBe(146)
    expect(hr.subLow).toBe(167) // round(185 * 0.90)
    expect(hr.subHigh).toBe(181) // round(185 * 0.98)
  })
})

describe("getWorkouts", () => {
  it("returns 7 workouts (5 interval + 2 easy)", () => {
    const wks = getWorkouts(294, "dist")
    expect(wks).toHaveLength(7)
    expect(wks[5].name).toBe("Easy run")
    expect(wks[6].name).toBe("Long run")
  })

  it("uses time-based names in time mode", () => {
    const wks = getWorkouts(294, "time")
    expect(wks[0].name).toBe("25 x 1:30")
  })
})

describe("fmtPace", () => {
  it("formats seconds as mm:ss", () => {
    expect(fmtPace(294)).toBe("4:54")
    expect(fmtPace(60)).toBe("1:00")
    expect(fmtPace(65)).toBe("1:05")
  })
})
```

**Step 2: Install Vitest and run to see failure**

```bash
pnpm add -D vitest
pnpm vitest run
```

Expected: FAIL — module not found.

**Step 3: Implement `src/lib/calculator.ts`**

```ts
export type InputMode = "5k" | "20min"
export type WkMode = "dist" | "time"

export interface HRZones {
  max: number
  lthr: number
  easy: number
  subLow: number
  subHigh: number
}

export type WorkoutZone = "easy" | "low" | "sub" | "top"

export interface Workout {
  name: string
  detail: string
  pace: number
  rest: string
  zone: WorkoutZone
}

export function fmtPace(s: number): string {
  const m = Math.floor(s / 60)
  const sc = Math.round(s % 60)
  return `${m}:${sc < 10 ? "0" : ""}${sc}`
}

export function get5kPace(mode: InputMode, a: number, b: number): number {
  if (mode === "5k") return (a * 60 + b) / 5
  return 1200 / (a + b / 100)
}

export function getHR(maxHR: number): HRZones {
  const lthr = Math.round(maxHR * 0.89)
  return {
    max: maxHR,
    lthr,
    easy: Math.round(maxHR * 0.70),
    subLow: Math.round(lthr * 0.90),
    subHigh: Math.round(lthr * 0.98),
  }
}

export function getWorkouts(fkp: number, wkMode: WkMode): Workout[] {
  const cv = fkp * 1.02
  const defs = [
    { dn: "25 x 400m", tn: "25 x 1:30", dd: "Short reps, highest pace", td: "Short reps ~400m equiv", pf: 0.98, rs: 30, z: "top" as const, dm: 400, ts: 90, reps: 25 },
    { dn: "10 x 1000m", tn: "10 x 4:00", dd: "Bread & butter", td: "Bread & butter ~1K equiv", pf: 1.055, rs: 60, z: "sub" as const, dm: 1000, ts: 240, reps: 10 },
    { dn: "6 x 1600m", tn: "6 x 6:00", dd: "Moderate reps", td: "Moderate ~1.6K equiv", pf: 1.09, rs: 60, z: "sub" as const, dm: 1600, ts: 360, reps: 6 },
    { dn: "5 x 2000m", tn: "5 x 8:00", dd: "Long reps", td: "Long reps ~2K equiv", pf: 1.12, rs: 60, z: "sub" as const, dm: 2000, ts: 480, reps: 5 },
    { dn: "3 x 3000m", tn: "3 x 12:00", dd: "Longest reps", td: "Longest ~3K equiv", pf: 1.14, rs: 90, z: "low" as const, dm: 3000, ts: 720, reps: 3 },
  ]

  const intervals: Workout[] = defs.map((d) => {
    const pace = cv * d.pf
    const name = wkMode === "dist" ? d.dn : d.tn
    const detailBase = wkMode === "dist" ? d.dd : d.td
    let repTime: number, repDist: number
    if (wkMode === "dist") {
      repTime = Math.round(pace * (d.dm / 1000))
      repDist = d.dm
    } else {
      repTime = d.ts
      repDist = Math.round((d.ts / pace) * 1000)
    }
    const extra =
      wkMode === "dist"
        ? ` (${fmtPace(repTime)}/rep)`
        : ` (~${repDist}m/rep)`
    const rest =
      d.rs < 60 ? `${d.rs}s` : d.rs === 90 ? "1:30" : `${Math.round(d.rs / 60)}:00`
    return { name, detail: detailBase + extra, pace, rest, zone: d.z }
  })

  return [
    ...intervals,
    { name: "Easy run", detail: "3x/wk ~50 min", pace: fkp * 1.33, rest: "—", zone: "easy" as const },
    { name: "Long run", detail: "1x/wk ~75 min", pace: fkp * 1.38, rest: "—", zone: "easy" as const },
  ]
}

export function hrRange(zone: WorkoutZone, hr: HRZones): string {
  if (zone === "easy") return `< ${hr.easy}`
  if (zone === "low") return `${hr.subLow}-${Math.round((hr.subLow + hr.subHigh) / 2)}`
  if (zone === "sub") return `${Math.round(hr.subLow * 1.01)}-${hr.subHigh}`
  if (zone === "top") return `${hr.subHigh}-${hr.lthr}`
  return "—"
}
```

**Step 4: Run tests**

```bash
pnpm vitest run
```

Expected: All pass.

**Step 5: Commit**

```bash
git add src/lib/calculator.ts src/lib/calculator.test.ts package.json pnpm-lock.yaml
git commit -m "feat: extract calculator logic with tests"
```

---

### Task 3: Build `RaceInput` component

**Files:**
- Create: `src/components/race-input.tsx`

**Step 1: Implement component**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type InputMode, fmtPace } from "@/lib/calculator"

interface RaceInputProps {
  inputMode: InputMode
  inpA: number
  inpB: number
  paceDisplay: string
  onModeChange: (mode: InputMode) => void
  onInpAChange: (v: number) => void
  onInpBChange: (v: number) => void
}

export function RaceInput({
  inputMode, inpA, inpB, paceDisplay,
  onModeChange, onInpAChange, onInpBChange,
}: RaceInputProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Race / test input</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1.5">
          <Button
            variant={inputMode === "5k" ? "default" : "outline"}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onModeChange("5k")}
          >
            5K race
          </Button>
          <Button
            variant={inputMode === "20min" ? "default" : "outline"}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onModeChange("20min")}
          >
            20' test
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground min-w-7">
            {inputMode === "5k" ? "Min" : "Dist"}
          </label>
          <Input
            type="number"
            value={inpA}
            onChange={(e) => onInpAChange(Number(e.target.value))}
            className="w-14 text-center font-mono text-sm"
          />
          <span className="text-muted-foreground">:</span>
          <Input
            type="number"
            value={inpB}
            onChange={(e) => onInpBChange(Number(e.target.value))}
            className="w-14 text-center font-mono text-sm"
          />
          <span className="text-xs text-muted-foreground ml-1">{paceDisplay}</span>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/race-input.tsx
git commit -m "feat: add RaceInput component"
```

---

### Task 4: Build `HeartRateInput` component

**Files:**
- Create: `src/components/heart-rate-input.tsx`

**Step 1: Implement component**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import type { HRZones } from "@/lib/calculator"

interface HeartRateInputProps {
  mhr: number
  hr: HRZones
  onMhrChange: (v: number) => void
}

export function HeartRateInput({ mhr, hr, onMhrChange }: HeartRateInputProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Heart rate input</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground min-w-12">Max HR</label>
          <Slider
            value={[mhr]}
            onValueChange={([v]) => onMhrChange(v)}
            min={180}
            max={215}
            step={1}
            className="flex-1"
          />
          <span className="text-base font-medium font-mono min-w-9 text-right">{mhr}</span>
        </div>
        <div className="flex gap-3.5 text-xs text-muted-foreground">
          <span>LTHR: <strong className="font-medium text-foreground">{hr.lthr}</strong></span>
          <span>Easy cap: <strong className="font-medium text-foreground">{hr.easy}</strong></span>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/heart-rate-input.tsx
git commit -m "feat: add HeartRateInput component"
```

---

### Task 5: Build `MetricCards` component

**Files:**
- Create: `src/components/metric-cards.tsx`

**Step 1: Implement component**

```tsx
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
```

**Step 2: Commit**

```bash
git add src/components/metric-cards.tsx
git commit -m "feat: add MetricCards component"
```

---

### Task 6: Build `WorkoutTable` component

**Files:**
- Create: `src/components/workout-table.tsx`

**Step 1: Implement component**

```tsx
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
```

**Step 2: Commit**

```bash
git add src/components/workout-table.tsx
git commit -m "feat: add WorkoutTable component"
```

---

### Task 7: Build `ZoneChart` component

**Files:**
- Create: `src/components/zone-chart.tsx`

Uses shadcn's Chart component wrapping Recharts. Replaces the Chart.js stacked horizontal bar.

**Step 1: Implement component**

```tsx
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
```

**Step 2: Commit**

```bash
git add src/components/zone-chart.tsx
git commit -m "feat: add ZoneChart component with shadcn Chart"
```

---

### Task 8: Build `ZoneCards` component

**Files:**
- Create: `src/components/zone-cards.tsx`

**Step 1: Implement component**

```tsx
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
```

**Step 2: Commit**

```bash
git add src/components/zone-cards.tsx
git commit -m "feat: add ZoneCards component"
```

---

### Task 9: Assemble `CalculatorPage` with all state

**Files:**
- Modify: `src/pages/calculator.tsx`

**Step 1: Wire everything together**

```tsx
import { useState } from "react"
import { type InputMode, type WkMode, get5kPace, getHR, getWorkouts, fmtPace } from "@/lib/calculator"
import { RaceInput } from "@/components/race-input"
import { HeartRateInput } from "@/components/heart-rate-input"
import { MetricCards } from "@/components/metric-cards"
import { WorkoutTable } from "@/components/workout-table"
import { ZoneChart } from "@/components/zone-chart"
import { ZoneCards } from "@/components/zone-cards"

export default function CalculatorPage() {
  const [inputMode, setInputMode] = useState<InputMode>("5k")
  const [inpA, setInpA] = useState(24)
  const [inpB, setInpB] = useState(30)
  const [mhr, setMhr] = useState(208)
  const [wkMode, setWkMode] = useState<WkMode>("dist")

  const handleModeChange = (mode: InputMode) => {
    setInputMode(mode)
    if (mode === "20min") {
      setInpA(4); setInpB(50)
    } else {
      setInpA(24); setInpB(30)
    }
  }

  const fkp = get5kPace(inputMode, inpA, inpB)
  const hr = getHR(mhr)
  const workouts = getWorkouts(fkp, wkMode)

  const paceDisplay = inputMode === "5k"
    ? `${fmtPace(fkp)}/km`
    : `${(inpA + inpB / 100).toFixed(2)} km`

  return (
    <div className="max-w-[740px] mx-auto px-5 py-8 pb-12 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          Sub-threshold training calculator
        </h1>
        <p className="text-sm text-muted-foreground max-w-[520px]">
          Norwegian Singles method — derive your sub-threshold paces and HR zones
          from a 5K race or 20-minute time trial.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <RaceInput
          inputMode={inputMode}
          inpA={inpA}
          inpB={inpB}
          paceDisplay={paceDisplay}
          onModeChange={handleModeChange}
          onInpAChange={setInpA}
          onInpBChange={setInpB}
        />
        <HeartRateInput mhr={mhr} hr={hr} onMhrChange={setMhr} />
      </div>

      <MetricCards hr={hr} />
      <WorkoutTable wkMode={wkMode} workouts={workouts} hr={hr} onWkModeChange={setWkMode} />
      <ZoneChart hr={hr} />
      <ZoneCards hr={hr} />

      <footer className="pt-5 border-t text-xs text-muted-foreground leading-relaxed">
        Based on Sirpoc84's Norwegian Singles method posts (LetsRun, 2023-2025).
        Paces derived from VDOT / Tinman CV equivalencies. LTHR estimated at 89% of
        max HR (Friel method). For best accuracy, confirm LTHR with a solo 30-minute
        time trial. When in doubt, go slower — at 90% of LT pace you still get ~97%
        of the training benefit.
      </footer>
    </div>
  )
}
```

**Step 2: Run dev server and verify all components render**

```bash
pnpm dev
```

Expected: Full calculator UI loads, inputs work, table updates, chart renders, zone cards display correctly. Dark mode works via shadcn theme toggle or system preference.

**Step 3: Commit**

```bash
git add src/pages/calculator.tsx
git commit -m "feat: assemble CalculatorPage with full interactivity"
```

---

### Task 10: Polish and verify

**Step 1: Fix any Tailwind class issues with zone colors**

The `bg-zone-blue`, `text-zone-blue`, etc. classes need to map correctly. If Tailwind v4's `@theme` doesn't auto-generate these utility classes, define them explicitly in `src/index.css` using `@utility` or adjust the color references to use `[var(--color-zone-blue)]` arbitrary value syntax instead.

**Step 2: Run type check**

```bash
pnpm tsc --noEmit
```

**Step 3: Run tests**

```bash
pnpm vitest run
```

**Step 4: Run lint (if eslint was scaffolded)**

```bash
pnpm lint
```

**Step 5: Build for production**

```bash
pnpm build
```

Expected: Clean build, no errors.

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: polish and verify production build"
```
