# NSA Weekly Planner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a drag-and-drop weekly training planner at `/planner` that lets users build an NSA training week and tracks the 75/25 easy-to-quality ratio.

**Architecture:** New page component with state managed in PlannerPage, broken into focused sub-components (QualityPalette, WeekGrid, DaySlot, WeeklySummary). Native HTML5 drag-and-drop. Shared Nav component for routing between Calculator and Planner.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui (Card, Button, Input), React Router

---

### Task 1: Add planner data types and constants

**Files:**
- Create: `src/lib/planner-data.ts`

**Step 1: Create the data file with types and templates**

```ts
export interface QTemplate {
  id: string
  name: string
  reps: number
  dur: number
  rest: number
  vol: number
}

export type SessionType = "quality" | "easy" | "long" | "rest"

export interface DaySlotData {
  day: string
  type: SessionType | null
  template: QTemplate | null
}

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

export const Q_TEMPLATES: Record<string, QTemplate[]> = {
  short: [
    { id: "s1", name: "7×3min", reps: 7, dur: 3, rest: 60, vol: 21 },
    { id: "s2", name: "8×3min", reps: 8, dur: 3, rest: 60, vol: 24 },
    { id: "s3", name: "9×3min", reps: 9, dur: 3, rest: 60, vol: 27 },
    { id: "s4", name: "10×3min", reps: 10, dur: 3, rest: 60, vol: 30 },
    { id: "s5", name: "11×3min", reps: 11, dur: 3, rest: 60, vol: 33 },
    { id: "s6", name: "12×3min", reps: 12, dur: 3, rest: 60, vol: 36 },
    { id: "s7", name: "8×4min", reps: 8, dur: 4, rest: 60, vol: 32 },
    { id: "s8", name: "9×4min", reps: 9, dur: 4, rest: 60, vol: 36 },
    { id: "s9", name: "10×4min", reps: 10, dur: 4, rest: 60, vol: 40 },
  ],
  medium: [
    { id: "m1", name: "4×5min", reps: 4, dur: 5, rest: 60, vol: 20 },
    { id: "m2", name: "5×5min", reps: 5, dur: 5, rest: 60, vol: 25 },
    { id: "m3", name: "4×6min", reps: 4, dur: 6, rest: 60, vol: 24 },
    { id: "m4", name: "5×6min", reps: 5, dur: 6, rest: 60, vol: 30 },
    { id: "m5", name: "6×6min", reps: 6, dur: 6, rest: 60, vol: 36 },
    { id: "m6", name: "4×8min", reps: 4, dur: 8, rest: 60, vol: 32 },
    { id: "m7", name: "5×8min", reps: 5, dur: 8, rest: 60, vol: 40 },
  ],
  long: [
    { id: "l1", name: "2×10min", reps: 2, dur: 10, rest: 90, vol: 20 },
    { id: "l2", name: "3×10min", reps: 3, dur: 10, rest: 90, vol: 30 },
    { id: "l3", name: "3×11min", reps: 3, dur: 11, rest: 90, vol: 33 },
    { id: "l4", name: "3×12min", reps: 3, dur: 12, rest: 105, vol: 36 },
    { id: "l5", name: "4×10min", reps: 4, dur: 10, rest: 105, vol: 40 },
    { id: "l6", name: "2×15min", reps: 2, dur: 15, rest: 105, vol: 30 },
    { id: "l7", name: "3×15min", reps: 3, dur: 15, rest: 120, vol: 45 },
  ],
}

export const SESSION_META: Record<SessionType, { label: string; short: string }> = {
  quality: { label: "Quality", short: "Q" },
  easy: { label: "Easy Run", short: "E" },
  long: { label: "Long Run", short: "LR" },
  rest: { label: "Rest", short: "R" },
}

export function totalSessionMin(t: QTemplate, wu: number, cd: number): number {
  const restTotal = (t.reps - 1) * (t.rest / 60)
  return wu + cd + t.vol + restTotal
}

export function qWorkMin(t: QTemplate): number {
  return t.vol + (t.reps - 1) * (t.rest / 60)
}

export function initWeek(): DaySlotData[] {
  return DAYS.map((d) => ({ day: d, type: null, template: null }))
}
```

**Step 2: Commit**

```bash
git add src/lib/planner-data.ts
git commit -m "feat: add planner data types and templates"
```

---

### Task 2: Add session color tokens to CSS

**Files:**
- Modify: `src/index.css`

**Step 1: Add session color tokens inside `@theme inline` block, after the existing zone tokens**

Light mode tokens (inside `@theme inline`):
```css
    --color-session-quality: #D97706;
    --color-session-quality-bg: rgba(217, 119, 6, 0.08);
    --color-session-quality-text: #854F0B;
    --color-session-easy: #2563EB;
    --color-session-easy-bg: rgba(37, 99, 235, 0.07);
    --color-session-easy-text: #1E40AF;
    --color-session-long: #7C3AED;
    --color-session-long-bg: rgba(124, 58, 237, 0.07);
    --color-session-long-text: #5B21B6;
    --color-session-rest: #6B7280;
    --color-session-rest-bg: rgba(107, 114, 128, 0.06);
    --color-session-rest-text: #4B5563;
```

Dark mode tokens (inside `.dark` block):
```css
    --color-session-quality: #FBBF24;
    --color-session-quality-bg: rgba(251, 191, 36, 0.10);
    --color-session-quality-text: #FDE68A;
    --color-session-easy: #60A5FA;
    --color-session-easy-bg: rgba(96, 165, 250, 0.10);
    --color-session-easy-text: #BFDBFE;
    --color-session-long: #A78BFA;
    --color-session-long-bg: rgba(167, 139, 250, 0.10);
    --color-session-long-text: #DDD6FE;
    --color-session-rest: #9CA3AF;
    --color-session-rest-bg: rgba(156, 163, 175, 0.08);
    --color-session-rest-text: #D1D5DB;
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Success

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add session color tokens for planner"
```

---

### Task 3: Add Nav component and routing

**Files:**
- Create: `src/components/nav.tsx`
- Modify: `src/main.tsx`
- Create: `src/pages/planner.tsx` (placeholder)

**Step 1: Create Nav component**

```tsx
import { Link, useLocation } from "react-router"

export function Nav() {
  const { pathname } = useLocation()
  return (
    <nav className="max-w-[740px] mx-auto px-5 pt-4 pb-2 flex gap-4 text-sm">
      <Link
        to="/"
        className={pathname === "/" ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"}
      >
        Calculator
      </Link>
      <Link
        to="/planner"
        className={pathname === "/planner" ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"}
      >
        Planner
      </Link>
    </nav>
  )
}
```

**Step 2: Create placeholder PlannerPage**

```tsx
export default function PlannerPage() {
  return (
    <div className="max-w-[740px] mx-auto px-5 py-8">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Weekly Planner</h1>
      <p className="text-sm text-muted-foreground">Plan your NSA training week.</p>
    </div>
  )
}
```

**Step 3: Update main.tsx — add Nav and planner route**

Add `import { Nav } from "@/components/nav"` and `import PlannerPage from "./pages/planner"`.

Add `<Nav />` after `<BrowserRouter>` and before `<Routes>`. Add `<Route path="/planner" element={<PlannerPage />} />`.

**Step 4: Move the dark mode toggle from calculator header to Nav**

The Switch for dark/light mode should move to Nav so it's available on both pages. Remove it from `calculator.tsx` header and add it to `nav.tsx`. The dark state and useEffect should live in Nav.

**Step 5: Verify build**

Run: `pnpm build`
Expected: Success

**Step 6: Commit**

```bash
git add src/components/nav.tsx src/pages/planner.tsx src/main.tsx src/pages/calculator.tsx
git commit -m "feat: add Nav component, planner route, move dark toggle to nav"
```

---

### Task 4: Build QualityPalette component

**Files:**
- Create: `src/components/planner/quality-palette.tsx`

**Step 1: Create the component**

This renders:
- Category filter buttons (All / Short / Medium / Long) using shadcn Button
- Draggable quality template chips in a flex-wrap grid
- Each chip shows template name + vol/total minutes
- `onDragStart` callback to parent with the template

Use `session-quality` color tokens for chip styling. Hide spinner on inputs. Chips get `draggable` attribute and `onDragStart`.

**Step 2: Verify build**

Run: `pnpm build`
Expected: Success

**Step 3: Commit**

```bash
git add src/components/planner/quality-palette.tsx
git commit -m "feat: add QualityPalette component"
```

---

### Task 5: Build DaySlot component

**Files:**
- Create: `src/components/planner/day-slot.tsx`

**Step 1: Create the component**

Props: `slot: DaySlotData`, `index: number`, callbacks for drop/clear/cycle/input changes, wu/cd getters/setters, strides state, longMin.

Renders inside a shadcn Card-like container:
- Day label + clear button (×) in header
- **Quality**: session name, vol/rest stats, WU/CD input grid with override detection, total time
- **Easy**: duration input + strides checkbox
- **Long**: duration input
- **Rest**: centered "Rest" label
- **Empty**: "Drop here or click to cycle" prompt

All inputs use shadcn Input with spinner hidden, font-mono, centered. Session type colors from CSS tokens.

Drop target: `onDragOver`, `onDragLeave`, `onDrop` handlers. Dashed border on drag-over.

**Step 2: Verify build**

Run: `pnpm build`
Expected: Success

**Step 3: Commit**

```bash
git add src/components/planner/day-slot.tsx
git commit -m "feat: add DaySlot component"
```

---

### Task 6: Build WeekGrid component

**Files:**
- Create: `src/components/planner/week-grid.tsx`

**Step 1: Create the component**

Simple wrapper that renders a `grid grid-cols-7 gap-1.5` (responsive: `grid-cols-2 sm:grid-cols-4 lg:grid-cols-7`). Maps over `week` array rendering `DaySlot` for each. Also renders the "Drag to fill non-Q days" row with draggable Easy/Long/Rest chips above the grid.

**Step 2: Verify build**

Run: `pnpm build`
Expected: Success

**Step 3: Commit**

```bash
git add src/components/planner/week-grid.tsx
git commit -m "feat: add WeekGrid component"
```

---

### Task 7: Build WeeklySummary component

**Files:**
- Create: `src/components/planner/weekly-summary.tsx`

**Step 1: Create the component**

Props: all computed stats (totalQWorkMin, totalEasyAll, totalQWuCdMin, totalSubT, totalWeekMin, qPct, ePct, ratioOk, ratioClose, neededEasyMin, qDayCount, restDayCount), plus `onReset` callback.

Renders:
- Ratio progress bar (two divs in a flex container, widths from percentages). Uses `session-quality` color for Q segment, `session-easy` for E segment. Monochromatic fallback when empty.
- Status message with conditional background (green for ok, amber for close, red for off)
- 2 rows × 4 stat cards using `bg-muted` style matching existing metric cards
- Reset button

**Step 2: Verify build**

Run: `pnpm build`
Expected: Success

**Step 3: Commit**

```bash
git add src/components/planner/weekly-summary.tsx
git commit -m "feat: add WeeklySummary component"
```

---

### Task 8: Build DefaultWuCd component

**Files:**
- Create: `src/components/planner/default-wu-cd.tsx`

**Step 1: Create the component**

Simple bar with "Default WU/CD" label, two number inputs (WU/CD), and hint text. Uses shadcn Input with spinner hidden. Styled with `session-easy` color tokens to indicate these are easy-pace minutes.

**Step 2: Verify build**

Run: `pnpm build`
Expected: Success

**Step 3: Commit**

```bash
git add src/components/planner/default-wu-cd.tsx
git commit -m "feat: add DefaultWuCd component"
```

---

### Task 9: Assemble PlannerPage with all state

**Files:**
- Modify: `src/pages/planner.tsx`

**Step 1: Wire everything together**

Replace placeholder with full implementation. State variables:
- `week` (DaySlotData[]), `catFilter`, `dragData`
- `easyInputs`, `strides`, `longMin`
- `defaultWu`, `defaultCd`, `wuCd`

Computed values: totalQWorkMin, totalEasyAll, totalQWuCdMin, totalSubT, totalWeekMin, qPct, ePct, ratioOk, ratioClose, neededEasyMin.

Layout order:
1. Header (title + subtitle)
2. DefaultWuCd
3. QualityPalette
4. WeekGrid (includes session type drag chips + 7-day grid)
5. WeeklySummary
6. Footer tip about NSA patterns

**Step 2: Verify build**

Run: `pnpm build`
Expected: Success

**Step 3: Commit**

```bash
git add src/pages/planner.tsx
git commit -m "feat: assemble PlannerPage with full interactivity"
```

---

### Task 10: Polish and verify

**Files:**
- Various

**Step 1: Run type check**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 2: Run lint**

Run: `pnpm lint`
Expected: No errors (may need to suppress react-refresh for new planner components if they export helpers)

**Step 3: Run tests**

Run: `pnpm vitest run`
Expected: All existing tests pass

**Step 4: Production build**

Run: `pnpm build`
Expected: Success

**Step 5: Fix any issues found above**

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: polish planner — fix lint, verify build"
```
