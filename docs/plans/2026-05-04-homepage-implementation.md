# Homepage & Content Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a homepage at `/` with NSA explainer content and links to tools/content pages, plus dedicated Getting Started and Comparison pages converted from existing HTML sources.

**Architecture:** Three new page components (HomePage, GettingStartedPage, ComparisonPage) added to React Router. Homepage is static content with link cards. Getting Started converts a timeline HTML to React/Tailwind. Comparison converts an animated SVG chart to React with useState for phase stepping and requestAnimationFrame for smooth transitions.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui (Card, Button), React Router, inline SVG

---

### Task 1: Build HomePage

**Files:**
- Modify: `src/pages/home.tsx`

**Step 1: Replace placeholder with full homepage**

The homepage has these sections:

1. **Hero**: centered, large logo (use the same dark/light PNG swap pattern from nav — read `src/components/nav.tsx` to see how `dark` state works, but since homepage doesn't own dark state, just use two `<img>` tags with `hidden dark:block` / `block dark:hidden` classes), "Norwegian Singles Approach" as h1, subtitle explaining NSA

2. **Quick links**: two cards side by side (`grid grid-cols-1 sm:grid-cols-2 gap-4`). Each card is a `Link` wrapped in a `bg-muted rounded-xl p-5` div:
   - Calculator card: title "Calculator", description "Derive your sub-threshold paces and HR zones from a race result", link to `/calculator`
   - Planner card: title "Planner", description "Plan your NSA training week with drag-and-drop sessions", link to `/planner`

3. **What is NSA?**: `<section>` with h2 "What is NSA?", 3 paragraphs:
   - The Norwegian Singles Approach is a sub-threshold training method. Instead of running hard VO2max intervals, you run 3 quality sessions per week just below your lactate threshold — accumulating volume without crossing into supra-threshold territory.
   - The core principle: 75% of your weekly training time at easy pace, 25% at sub-threshold pace. Never cross your LTHR. The lower recovery cost means you can run quality sessions 3 times per week instead of 2, and more total stimulus compounds into faster improvement.
   - It works for runners of all levels who have a base of 5-8+ hours per week. You need a recent 5K time or threshold test to calibrate your paces.

4. **Getting Started summary**: `bg-muted rounded-xl p-5` card with h3 "Getting Started", 5-item compact list (just step titles: "Establish your numbers", "Transition in (weeks 1-3)", "Lock the pattern (weeks 4-8)", "Build load (weeks 8+)", "Maintain and re-test"), then a Link to `/getting-started` styled as "Read the full guide →"

5. **NSA vs VO2max summary**: similar card with h3 "NSA vs VO2max", one paragraph ("NSA doesn't produce a bigger per-session stimulus than VO2max. It wins on volume — lower recovery cost enables 3 sessions instead of 2. Over months, more sessions means a bigger rightward shift of your lactate curve."), Link to `/comparison` "See the comparison →"

Style: `max-w-[740px] mx-auto px-5 py-8 pb-12 space-y-8`

**Step 2: Verify build**

Run: `pnpm build`
Expected: Success

**Step 3: Commit**

```bash
git add src/pages/home.tsx
git commit -m "feat: build homepage with NSA explainer and quick links"
```

---

### Task 2: Build GettingStartedPage

**Files:**
- Create: `src/pages/getting-started.tsx`
- Modify: `src/main.tsx` (add route)

**Step 1: Create the page**

Convert the content from the getting-started HTML source to React/Tailwind. The page has:

**Header**: h1 "Getting started with NSA", subtitle "A step-by-step protocol to implement the Norwegian Singles approach"

**Timeline**: a CSS grid with `grid-template-columns: 32px 1fr`. Each step has:
- Left column: numbered dot (circular, 28px, `rounded-full border-2 text-xs font-medium flex items-center justify-center`, colored border) + vertical line (`w-0.5 flex-1 bg-border`)
- Right column: step title (text-sm font-medium) + description (text-xs text-muted-foreground) + any sub-content (metric cards, week rows, pattern pills, load steps)

5 steps:
- Step 0 (purple accent): "Establish your numbers" — 3 metric cards (Threshold pace, LTHR, Current volume)
- Step 1 (blue accent): "Transition in (weeks 1-3)" — 3 week rows
- Step 2 (amber accent): "Lock the pattern (weeks 4-8)" — pattern pills row (E-Q-E-Q-E-Q-LR)
- Step 3 (green accent): "Build load (weeks 8+)" — 5 numbered load steps
- Step 4 (coral accent): "Maintain and re-test" — paragraph

**Rules card**: `bg-muted rounded-xl p-4 mt-5` with "The three rules" title, then 3 rule cards in a grid:
- "Never cross LTHR" (red-ish bg)
- "Easy must be easy" (blue-ish bg)
- "When in doubt, slower" (green-ish bg)

Use monochromatic approach matching the rest of the app — `bg-muted` for metric cards and rule cards, `text-muted-foreground` for descriptions. Step dot colors can use the session/zone tokens where appropriate.

Style: `max-w-[680px] mx-auto px-5 py-8 pb-12`

**Step 2: Add route to main.tsx**

Add `import GettingStartedPage from "./pages/getting-started"` and `<Route path="/getting-started" element={<GettingStartedPage />} />`.

**Step 3: Verify build**

Run: `pnpm build`
Expected: Success

**Step 4: Commit**

```bash
git add src/pages/getting-started.tsx src/main.tsx
git commit -m "feat: add Getting Started page with timeline"
```

---

### Task 3: Build ComparisonPage — static structure

**Files:**
- Create: `src/pages/comparison.tsx`
- Modify: `src/main.tsx` (add route)

**Step 1: Create the page with static structure (no animation yet)**

The page has:

**Header**: centered, h1 "NSA vs VO2max", subtitle "How each method shifts your lactate curve — step by step"

**Controls**: flex row with "Step through:" label, dot indicators (6 dots, active one is wider/pill-shaped), Back/Next buttons (shadcn Button variant="outline" size="sm")

**Phase info**: phase title (text-lg font-medium) and description (text-sm text-muted-foreground)

**Chart grid**: `grid grid-cols-1 sm:grid-cols-2 gap-4`. Two cards:
- NSA card: green dot + "NSA — push from below" title, note text, `<svg>` placeholder
- VO2max card: red dot + "VO2max — pull from above" title, note text, `<svg>` placeholder

**Legend row**: flex-wrap row with colored indicators for baseline, NSA, VO2max, Sub-T zone, VO2max zone

**Summary card**: hidden by default, shown on step 5 — "The compounding math" with TSS comparison stats

**Footer**: attribution text

State: `phase` (0-5), phase info array with titles/descriptions/notes

For now, render empty SVGs — we'll add the chart drawing in the next task.

Style: `max-w-[760px] mx-auto px-5 py-8 pb-12`

**Step 2: Add route to main.tsx**

Add `import ComparisonPage from "./pages/comparison"` and `<Route path="/comparison" element={<ComparisonPage />} />`.

**Step 3: Verify build**

Run: `pnpm build`
Expected: Success

**Step 4: Commit**

```bash
git add src/pages/comparison.tsx src/main.tsx
git commit -m "feat: add Comparison page structure with controls"
```

---

### Task 4: Build ComparisonPage — SVG chart rendering

**Files:**
- Modify: `src/pages/comparison.tsx`

**Step 1: Port the SVG drawing functions**

Read the source HTML at `/Users/mac/Downloads/nsa-vs-vo2max-comparison.html` for the exact SVG drawing logic. Port these functions to TypeScript:

- `axes()` → returns SVG string for axis lines, tick marks, zone labels, pace labels
- `baseCurve(op, dash)` → lactate curve path
- `shiftCurve(shift, col, op)` → shifted curve
- `mkLT1(x, op)`, `mkLT2(x, op, label)` → threshold markers
- `nsaZone(x1, x2, op)`, `vo2Zone(x1, x2, op)` → zone rectangles
- `dot(cx, cy, col, op)`, `arrow(x, y, len, col, op)` → indicators
- `badge(x, y, w, text, col, op)` → stat badges
- `drawChart(state, side)` → combines everything into SVG innerHTML

The SVG viewBox is "0 0 320 270". Colors should use CSS variables where possible, falling back to the hardcoded values from the source for SVG-specific rendering.

Port `phaseData` array (6 phases × 2 sides) with all the numeric state for each phase.

Use `dangerouslySetInnerHTML` on the `<svg>` elements to inject the drawn SVG string, or use React SVG elements directly. The innerHTML approach is simpler for porting — recommend that.

**Step 2: Wire drawChart to phase state**

When `phase` changes, call `drawChart` for both SVGs with the corresponding phase data.

**Step 3: Verify build**

Run: `pnpm build`
Expected: Success

**Step 4: Commit**

```bash
git add src/pages/comparison.tsx
git commit -m "feat: add SVG chart rendering to Comparison page"
```

---

### Task 5: Build ComparisonPage — animation

**Files:**
- Modify: `src/pages/comparison.tsx`

**Step 1: Port the animation system**

From the source HTML, port:
- `lerp(a, b, t)` and `lerpState(from, to, t)` — interpolate numeric properties between phases
- `animateStep(fromPhase, toPhase)` — uses `requestAnimationFrame` to animate over 600ms with easeInOut timing
- The easing function: `raw < 0.5 ? 2*raw*raw : 1 - Math.pow(-2*raw+2, 2)/2`

Use a `useRef` for the animation frame ID to enable cleanup. Use `useCallback` for the animation tick.

When user clicks a dot or Back/Next, call `animateStep(oldPhase, newPhase)` which smoothly interpolates all SVG state properties.

Also add keyboard support: ArrowRight for next, ArrowLeft for back.

**Step 2: Verify build and test animation**

Run: `pnpm build`
Expected: Success

**Step 3: Commit**

```bash
git add src/pages/comparison.tsx
git commit -m "feat: add animated transitions to Comparison charts"
```

---

### Task 6: Polish and verify

**Files:**
- Various

**Step 1: Run type check**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 2: Run lint**

Run: `pnpm lint`
Expected: No errors

**Step 3: Run tests**

Run: `pnpm vitest run`
Expected: All existing tests pass

**Step 4: Production build**

Run: `pnpm build`
Expected: Success

**Step 5: Fix any issues**

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: polish homepage and content pages"
```
