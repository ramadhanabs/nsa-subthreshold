# NSA Weekly Planner — Design

## Overview

A drag-and-drop weekly training planner at `/planner` that lets users build an NSA-style training week by assigning quality sessions, easy runs, long runs, and rest days to a 7-day grid. Tracks the 75/25 easy-to-quality ratio in real time.

## Architecture

- New route `/planner` → `PlannerPage`
- Shared nav component links Calculator ↔ Planner
- Native HTML5 drag-and-drop (no extra libraries)
- All state in PlannerPage, passed down as props

## Components

### PlannerPage (`src/pages/planner.tsx`)
State: `week`, `easyInputs`, `strides`, `longMin`, `defaultWu`, `defaultCd`, `wuCd`, `catFilter`, `dragData`

### QualityPalette (`src/components/planner/quality-palette.tsx`)
- Category filter tabs: All / Short / Medium / Long
- Draggable quality session chips showing name, sub-T minutes, total time
- Uses shadcn Button for filter tabs

### WeekGrid (`src/components/planner/week-grid.tsx`)
- 7-column responsive grid
- Renders DaySlot for each day
- Handles drag-over/drop coordination

### DaySlot (`src/components/planner/day-slot.tsx`)
- Drop target for sessions
- Renders different content per session type:
  - **Quality**: template name, sub-T/rest stats, WU/CD inputs with per-day override
  - **Easy**: duration input + strides checkbox
  - **Long**: duration input
  - **Rest**: simple label
  - **Empty**: "Drop here or click to cycle" prompt
- Click-to-cycle for non-quality days
- Clear button (×) to remove assignment

### WeeklySummary (`src/components/planner/weekly-summary.tsx`)
- Ratio progress bar (quality vs easy+LR)
- Status message (green/amber/red based on 75/25 target)
- 8 stat cards in 2 rows: quality work, easy total, WU/CD from Q, sub-T total, total week, weekly hours, Q sessions, run days
- Reset button

### DefaultWuCd (`src/components/planner/default-wu-cd.tsx`)
- Top bar for setting default warmup/cooldown minutes
- Shows "applies to all Q sessions" hint

### Nav (`src/components/nav.tsx`)
- Simple top bar with Calculator / Planner text links
- Rendered in main.tsx above Routes

## Data (`src/lib/planner-data.ts`)

### Quality templates
```ts
interface QTemplate {
  id: string
  name: string
  reps: number
  dur: number
  rest: number  // seconds
  vol: number   // minutes of sub-T work
}
```

Three categories: short (3-4min reps), medium (5-8min reps), long (10-15min reps).

### Session types
```ts
type SessionType = "quality" | "easy" | "long" | "rest"
```

Each has a label, short code, and color tokens for light/dark mode.

## Styling

- Tailwind + shadcn (Card, Button, Input)
- Session type colors as CSS custom properties with light/dark variants
- Summary section uses monochromatic `bg-muted` style matching calculator
- Inputs hide spinners, use font-mono

## State shape

```ts
interface DaySlot {
  day: string
  type: SessionType | null
  template: QTemplate | null
}

// week: DaySlot[7]
// easyInputs: Record<string, number>
// strides: Record<string, boolean>
// longMin: number
// defaultWu: number
// defaultCd: number
// wuCd: Record<string, { wu?: number; cd?: number }>
```

## Calculations

- Quality work min = sub-T vol + inter-rep rest time
- Easy total = easy runs + long run + WU/CD from quality sessions + strides
- Ratio target: 75% easy / 25% quality by time
- Status: green (70-80% easy), amber (65-85%), red (outside)
