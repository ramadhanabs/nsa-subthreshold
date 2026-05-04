import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"

/* ─── colour constants (need hex for SVG, not CSS vars) ─── */
function getColors() {
  const isDark = document.documentElement.classList.contains("dark")
  return {
    tc: isDark ? "#E8E7E2" : "#1A1A18",
    tc2: isDark ? "#6B6A65" : "#9C9B96",
    tc3: isDark ? "#444441" : "#D3D1C7",
    teal: isDark ? "#3CC8A0" : "#1D9E75",
    tealT: isDark ? "#9FE1CB" : "#085041",
    red: isDark ? "#E85050" : "#E24B4A",
    redT: isDark ? "#F4A0A0" : "#791F1F",
    amber: "#EF9F27",
    blue: isDark ? "#5A9DE6" : "#378ADD",
    bg2: isDark ? "#1E1E1C" : "#F2F1ED",
    brd: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
  }
}

/* ─── info per phase ─── */
const info = [
  { t: "Your baseline lactate curve", d: "Both charts start identical \u2014 same runner, same LT1, same LT2. Watch how each method shifts the curve differently.", nl: "3 sub-threshold sessions per week", vl: "2 hard sessions per week" },
  { t: "Where each method trains", d: "NSA targets the amber zone just below LT2 (2.5\u20133.5 mmol/L). VO2max targets the red zone above LT2 (5\u20136+ mmol/L). Same runner, very different lactate states.", nl: "Targets 2.5\u20133.5 mmol/L, below LT2", vl: "Targets 5\u20136+ mmol/L, above LT2" },
  { t: "Week 8 \u2014 adaptations begin", d: "Both curves start shifting right. NSA builds mitochondria and lactate clearance from sustained sub-threshold volume. VO2max increases the oxygen ceiling and anaerobic tolerance.", nl: "LT2 shifts right from aerobic buildup", vl: "LT2 shifts right from ceiling increase" },
  { t: "Week 16 \u2014 the gap widens", d: "NSA has accumulated 25% more total training load (3x vs 2x/week). The curve has shifted further right. VO2max curve also shifted, but less \u2014 fewer total sessions despite higher per-session stress.", nl: "More sessions = more total rightward shift", vl: "Fewer sessions = less total shift" },
  { t: "Week 24 \u2014 the compounding result", d: "The final picture. Both methods work. NSA produced a larger total shift because it enabled more weekly volume through lower recovery cost. The pace at old LT2 is now comfortably sub-threshold.", nl: "Old LT2 pace now sits at ~3.0 mmol/L", vl: "Old LT2 pace now sits at ~3.5 mmol/L" },
  { t: "Side by side \u2014 the full story", d: "NSA isn\u2019t magic per session. It wins on volume. Lower recovery cost \u2192 more sessions \u2192 more stimulus \u2192 bigger curve shift. The garden hose that never stops fills more than the fire hose that needs refueling.", nl: "3x/wk, +42 shift, ~356 TSS/wk", vl: "2x/wk, +28 shift, ~310 TSS/wk" },
]

/* ─── phase data ─── */
interface ChartState {
  baseOp: number; baseDash: boolean; shift: number; curveOp: number; curveCol: string
  lt1Op: number; lt2Op: number; lt2x: number; lt2Label: string; oldLt2Op: number
  nzX1: number; nzX2: number; nzOp: number
  vzX1: number; vzX2: number; vzOp: number
  dotX: number; dotY: number; dotOp: number
  arrLen: number; badgeOp: number
}

const phaseData: { nsa: ChartState; vo2: ChartState }[] = [
  {
    nsa: { baseOp: 0.7, baseDash: false, shift: 0, curveOp: 0, curveCol: "teal", lt1Op: 0.8, lt2Op: 1, lt2x: 210, lt2Label: "LT2", oldLt2Op: 0, nzX1: 0, nzX2: 0, nzOp: 0, vzX1: 0, vzX2: 0, vzOp: 0, dotX: 0, dotY: 0, dotOp: 0, arrLen: 0, badgeOp: 0 },
    vo2: { baseOp: 0.7, baseDash: false, shift: 0, curveOp: 0, curveCol: "red", lt1Op: 0.8, lt2Op: 1, lt2x: 210, lt2Label: "LT2", oldLt2Op: 0, nzX1: 0, nzX2: 0, nzOp: 0, vzX1: 0, vzX2: 0, vzOp: 0, dotX: 0, dotY: 0, dotOp: 0, arrLen: 0, badgeOp: 0 },
  },
  {
    nsa: { baseOp: 0.5, baseDash: false, shift: 0, curveOp: 0, curveCol: "teal", lt1Op: 0.5, lt2Op: 0.8, lt2x: 210, lt2Label: "LT2", oldLt2Op: 0, nzX1: 160, nzX2: 210, nzOp: 1, vzX1: 0, vzX2: 0, vzOp: 0, dotX: 185, dotY: 145, dotOp: 1, arrLen: 0, badgeOp: 0 },
    vo2: { baseOp: 0.5, baseDash: false, shift: 0, curveOp: 0, curveCol: "red", lt1Op: 0.5, lt2Op: 0.8, lt2x: 210, lt2Label: "LT2", oldLt2Op: 0, nzX1: 0, nzX2: 0, nzOp: 0, vzX1: 210, vzX2: 280, vzOp: 1, dotX: 245, dotY: 78, dotOp: 1, arrLen: 0, badgeOp: 0 },
  },
  {
    nsa: { baseOp: 0.2, baseDash: true, shift: 18, curveOp: 0.9, curveCol: "teal", lt1Op: 0.3, lt2Op: 1, lt2x: 228, lt2Label: "New", oldLt2Op: 0.25, nzX1: 175, nzX2: 228, nzOp: 0.8, vzX1: 0, vzX2: 0, vzOp: 0, dotX: 0, dotY: 0, dotOp: 0, arrLen: 14, badgeOp: 0 },
    vo2: { baseOp: 0.2, baseDash: true, shift: 12, curveOp: 0.9, curveCol: "red", lt1Op: 0.3, lt2Op: 1, lt2x: 222, lt2Label: "New", oldLt2Op: 0.25, nzX1: 0, nzX2: 0, nzOp: 0, vzX1: 222, vzX2: 280, vzOp: 0.6, dotX: 0, dotY: 0, dotOp: 0, arrLen: 8, badgeOp: 0 },
  },
  {
    nsa: { baseOp: 0.15, baseDash: true, shift: 30, curveOp: 0.9, curveCol: "teal", lt1Op: 0.2, lt2Op: 1, lt2x: 240, lt2Label: "New", oldLt2Op: 0.2, nzX1: 185, nzX2: 240, nzOp: 0.8, vzX1: 0, vzX2: 0, vzOp: 0, dotX: 0, dotY: 0, dotOp: 0, arrLen: 26, badgeOp: 0 },
    vo2: { baseOp: 0.15, baseDash: true, shift: 20, curveOp: 0.9, curveCol: "red", lt1Op: 0.2, lt2Op: 1, lt2x: 230, lt2Label: "New", oldLt2Op: 0.2, nzX1: 0, nzX2: 0, nzOp: 0, vzX1: 230, vzX2: 280, vzOp: 0.6, dotX: 0, dotY: 0, dotOp: 0, arrLen: 16, badgeOp: 0 },
  },
  {
    nsa: { baseOp: 0.12, baseDash: true, shift: 42, curveOp: 0.9, curveCol: "teal", lt1Op: 0.15, lt2Op: 1, lt2x: 252, lt2Label: "New", oldLt2Op: 0.15, nzX1: 195, nzX2: 252, nzOp: 0.8, vzX1: 0, vzX2: 0, vzOp: 0, dotX: 0, dotY: 0, dotOp: 0, arrLen: 38, badgeOp: 0 },
    vo2: { baseOp: 0.12, baseDash: true, shift: 28, curveOp: 0.9, curveCol: "red", lt1Op: 0.15, lt2Op: 1, lt2x: 238, lt2Label: "New", oldLt2Op: 0.15, nzX1: 0, nzX2: 0, nzOp: 0, vzX1: 238, vzX2: 280, vzOp: 0.6, dotX: 0, dotY: 0, dotOp: 0, arrLen: 24, badgeOp: 0 },
  },
  {
    nsa: { baseOp: 0.1, baseDash: true, shift: 42, curveOp: 0.9, curveCol: "teal", lt1Op: 0.1, lt2Op: 1, lt2x: 252, lt2Label: "New", oldLt2Op: 0.1, nzX1: 0, nzX2: 0, nzOp: 0, vzX1: 0, vzX2: 0, vzOp: 0, dotX: 0, dotY: 0, dotOp: 0, arrLen: 0, badgeOp: 1 },
    vo2: { baseOp: 0.1, baseDash: true, shift: 28, curveOp: 0.9, curveCol: "red", lt1Op: 0.1, lt2Op: 1, lt2x: 238, lt2Label: "New", oldLt2Op: 0.1, nzX1: 0, nzX2: 0, nzOp: 0, vzX1: 0, vzX2: 0, vzOp: 0, dotX: 0, dotY: 0, dotOp: 0, arrLen: 0, badgeOp: 1 },
  },
]

/* ─── SVG drawing helpers ─── */

function axes(c: ReturnType<typeof getColors>) {
  let h = ""
  h += `<line x1="30" y1="190" x2="310" y2="190" stroke="${c.tc}" stroke-width="0.5" opacity="0.15"/>`
  h += `<line x1="30" y1="190" x2="30" y2="20" stroke="${c.tc}" stroke-width="0.5" opacity="0.15"/>`
  h += `<text class="ax-text" x="22" y="192" text-anchor="end">0</text>`
  h += `<text class="ax-text" x="22" y="152" text-anchor="end">2</text>`
  h += `<text class="ax-text" x="22" y="112" text-anchor="end">4</text>`
  h += `<text class="ax-text" x="22" y="72" text-anchor="end">6</text>`
  h += `<line x1="30" y1="152" x2="310" y2="152" stroke="${c.tc}" stroke-width="0.5" opacity="0.04"/>`
  h += `<line x1="30" y1="112" x2="310" y2="112" stroke="${c.tc}" stroke-width="0.5" opacity="0.04"/>`

  const ticks = [
    { x: 30, pct: "40%" }, { x: 86, pct: "50%" }, { x: 142, pct: "60%" },
    { x: 198, pct: "70%" }, { x: 254, pct: "80%" }, { x: 310, pct: "90%" },
  ]
  for (const t of ticks) {
    h += `<line x1="${t.x}" y1="190" x2="${t.x}" y2="194" stroke="${c.tc}" stroke-width="0.5" opacity="0.25"/>`
    h += `<text class="ax-text" x="${t.x}" y="204" text-anchor="middle">${t.pct}</text>`
  }

  h += `<text class="ax-text" x="170" y="218" text-anchor="middle">Intensity (% of max)</text>`

  const zones = [
    { x1: 30, x2: 130, label: "Easy", col: c.blue, op: 0.5 },
    { x1: 130, x2: 210, label: "Sub-T", col: c.amber, op: 0.5 },
    { x1: 210, x2: 310, label: "VO2max+", col: c.red, op: 0.5 },
  ]
  for (const z of zones) {
    const cx = (z.x1 + z.x2) / 2
    h += `<line x1="${z.x1}" y1="228" x2="${z.x2}" y2="228" stroke="${z.col}" stroke-width="3" stroke-linecap="round" opacity="${z.op}"/>`
    h += `<text style="font-size:9px;font-weight:500" x="${cx}" y="242" text-anchor="middle" fill="${z.col}" opacity="0.7">${z.label}</text>`
  }

  const paces = [
    { x: 60, label: "6:30" }, { x: 130, label: "5:30" }, { x: 170, label: "5:10" },
    { x: 210, label: "4:50" }, { x: 260, label: "4:30" },
  ]
  for (const pp of paces) {
    h += `<text style="font-size:8px;font-family:'JetBrains Mono'" x="${pp.x}" y="256" text-anchor="middle" fill="${c.tc2}" opacity="0.6">${pp.label}</text>`
  }
  h += `<text style="font-size:8px" x="170" y="268" text-anchor="middle" fill="${c.tc2}" opacity="0.4">approx. pace /km</text>`
  return h
}

function baseCurve(op: number, dash: boolean, c: ReturnType<typeof getColors>) {
  const s = dash ? ' stroke-dasharray="4 3"' : ""
  return `<path d="M30,185 C70,184 100,182 130,176 C150,172 165,164 180,150 C195,132 210,112 225,88 C238,70 250,58 265,50 C280,44 295,41 310,40" fill="none" stroke="${c.tc}" stroke-width="1.5" stroke-linecap="round" opacity="${op}"${s}/>`
}

function shiftCurve(s: number, col: string, op: number) {
  return `<path d="M30,185 C${70 + s},184 ${100 + s},182 ${130 + s},176 C${150 + s},172 ${165 + s},164 ${180 + s},150 C${195 + s},132 ${210 + s},112 ${225 + s},88 C${238 + s},70 ${250 + s},58 ${265 + s},50" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" opacity="${op}"/>`
}

function mkLT1(x: number, op: number, c: ReturnType<typeof getColors>) {
  return `<line x1="${x}" y1="20" x2="${x}" y2="190" stroke="${c.blue}" stroke-width="0.5" stroke-dasharray="3 2" opacity="${op * 0.4}"/>` +
    `<text class="label-text" x="${x}" y="16" text-anchor="middle" fill="${c.blue}" opacity="${op}">LT1</text>`
}

function mkLT2(x: number, op: number, label: string, c: ReturnType<typeof getColors>) {
  return `<line x1="${x}" y1="20" x2="${x}" y2="190" stroke="${c.red}" stroke-width="0.5" stroke-dasharray="3 2" opacity="${op * 0.4}"/>` +
    `<text class="label-text" x="${x}" y="16" text-anchor="middle" fill="${c.red}" opacity="${op}">${label}</text>`
}

function nsaZone(x1: number, x2: number, op: number, c: ReturnType<typeof getColors>) {
  return `<rect x="${x1}" y="20" width="${Math.max(0, x2 - x1)}" height="170" fill="${c.amber}" opacity="${op * 0.1}"/>`
}

function vo2Zone(x1: number, x2: number, op: number, c: ReturnType<typeof getColors>) {
  return `<rect x="${x1}" y="20" width="${Math.max(0, x2 - x1)}" height="170" fill="${c.red}" opacity="${op * 0.08}"/>`
}

function dot(cx: number, cy: number, col: string, op: number) {
  return `<circle cx="${cx}" cy="${cy}" r="4" fill="${col}" opacity="${op || 0.9}"/>`
}

function arrow(x: number, y: number, len: number, col: string, op: number) {
  if (len < 2) return ""
  return `<line x1="${x}" y1="${y}" x2="${x + len}" y2="${y}" stroke="${col}" stroke-width="1.5" marker-end="url(#arw)" opacity="${op || 0.7}"/>`
}

function badge(x: number, y: number, w: number, text: string, col: string, op: number, c: ReturnType<typeof getColors>) {
  if (op < 0.05) return ""
  return `<g opacity="${op}"><rect x="${x}" y="${y}" width="${w}" height="22" rx="4" fill="${c.bg2}" stroke="${c.brd}" stroke-width="0.5"/>` +
    `<text class="badge-text" x="${x + 8}" y="${y + 14.5}" fill="${col}">${text}</text></g>`
}

function mkDefs() {
  return '<defs><marker id="arw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>'
}

function drawChart(el: SVGSVGElement, s: Record<string, number | string | boolean>, side: "nsa" | "vo2") {
  const c = getColors()
  let h = mkDefs() + axes(c)

  h += baseCurve(s.baseOp as number, s.baseDash as boolean, c)

  if ((s.curveOp as number) > 0.01) {
    const col = side === "nsa" ? c.teal : c.red
    h += shiftCurve(s.shift as number, col, s.curveOp as number)
  }

  if ((s.lt1Op as number) > 0.01) h += mkLT1(130, s.lt1Op as number, c)
  if ((s.oldLt2Op as number) > 0.01) h += mkLT2(210, s.oldLt2Op as number, "Old", c)
  h += mkLT2(Math.round(s.lt2x as number), s.lt2Op as number, s.lt2Label as string, c)

  if (side === "nsa") {
    if ((s.nzOp as number) > 0.01) h += nsaZone(Math.round(s.nzX1 as number), Math.round(s.nzX2 as number), s.nzOp as number, c)
  } else {
    if ((s.vzOp as number) > 0.01) h += vo2Zone(Math.round(s.vzX1 as number), Math.round(s.vzX2 as number), s.vzOp as number, c)
  }

  if ((s.dotOp as number) > 0.05) {
    const dc = side === "nsa" ? c.amber : c.red
    h += dot(Math.round(s.dotX as number), Math.round(s.dotY as number), dc, s.dotOp as number)
  }

  if ((s.arrLen as number) > 2) {
    const ac = side === "nsa" ? c.teal : c.red
    h += arrow(212, 200, Math.round(s.arrLen as number), ac, 0.7)
  }

  if ((s.badgeOp as number) > 0.05) {
    if (side === "nsa") {
      h += badge(36, 26, 96, "+42 shift", c.tealT, s.badgeOp as number, c)
    } else {
      h += badge(36, 26, 96, "+28 shift", c.redT, s.badgeOp as number, c)
    }
  }

  el.innerHTML = h
}

function drawCombinedChart(el: SVGSVGElement, nsaS: Record<string, number | string | boolean>, vo2S: Record<string, number | string | boolean>) {
  const c = getColors()
  let h = mkDefs() + axes(c)

  // baseline (use NSA's opacity since they're the same)
  h += baseCurve(nsaS.baseOp as number, nsaS.baseDash as boolean, c)

  // NSA zones
  if ((nsaS.nzOp as number) > 0.01) h += nsaZone(Math.round(nsaS.nzX1 as number), Math.round(nsaS.nzX2 as number), nsaS.nzOp as number, c)
  // VO2 zones
  if ((vo2S.vzOp as number) > 0.01) h += vo2Zone(Math.round(vo2S.vzX1 as number), Math.round(vo2S.vzX2 as number), vo2S.vzOp as number, c)

  // NSA shifted curve
  if ((nsaS.curveOp as number) > 0.01) {
    h += shiftCurve(nsaS.shift as number, c.teal, nsaS.curveOp as number)
  }
  // VO2 shifted curve
  if ((vo2S.curveOp as number) > 0.01) {
    h += shiftCurve(vo2S.shift as number, c.red, vo2S.curveOp as number)
  }

  // LT markers
  if ((nsaS.lt1Op as number) > 0.01) h += mkLT1(130, nsaS.lt1Op as number, c)
  if ((nsaS.oldLt2Op as number) > 0.01) h += mkLT2(210, nsaS.oldLt2Op as number, "Old", c)

  // NSA new LT2
  if ((nsaS.curveOp as number) > 0.01 && Math.round(nsaS.lt2x as number) !== 210) {
    h += `<line x1="${Math.round(nsaS.lt2x as number)}" y1="20" x2="${Math.round(nsaS.lt2x as number)}" y2="190" stroke="${c.teal}" stroke-width="0.5" stroke-dasharray="3 2" opacity="${(nsaS.lt2Op as number) * 0.4}"/>`
    h += `<text class="label-text" x="${Math.round(nsaS.lt2x as number)}" y="16" text-anchor="middle" fill="${c.teal}" opacity="${nsaS.lt2Op}">NSA</text>`
  }
  // VO2 new LT2
  if ((vo2S.curveOp as number) > 0.01 && Math.round(vo2S.lt2x as number) !== 210) {
    h += `<line x1="${Math.round(vo2S.lt2x as number)}" y1="20" x2="${Math.round(vo2S.lt2x as number)}" y2="190" stroke="${c.red}" stroke-width="0.5" stroke-dasharray="3 2" opacity="${(vo2S.lt2Op as number) * 0.4}"/>`
    h += `<text class="label-text" x="${Math.round(vo2S.lt2x as number)}" y="16" text-anchor="middle" fill="${c.red}" opacity="${vo2S.lt2Op}">VO2</text>`
  }

  // Original LT2 if no shift yet
  if ((nsaS.curveOp as number) <= 0.01) {
    h += mkLT2(210, nsaS.lt2Op as number, nsaS.lt2Label as string, c)
  }

  // Dots
  if ((nsaS.dotOp as number) > 0.05) h += dot(Math.round(nsaS.dotX as number), Math.round(nsaS.dotY as number), c.amber, nsaS.dotOp as number)
  if ((vo2S.dotOp as number) > 0.05) h += dot(Math.round(vo2S.dotX as number), Math.round(vo2S.dotY as number), c.red, vo2S.dotOp as number)

  // Arrows
  if ((nsaS.arrLen as number) > 2) h += arrow(212, 196, Math.round(nsaS.arrLen as number), c.teal, 0.7)
  if ((vo2S.arrLen as number) > 2) h += arrow(212, 204, Math.round(vo2S.arrLen as number), c.red, 0.7)

  // Badges
  if ((nsaS.badgeOp as number) > 0.05) h += badge(36, 26, 96, "+42 NSA", c.tealT, nsaS.badgeOp as number, c)
  if ((vo2S.badgeOp as number) > 0.05) h += badge(36, 52, 96, "+28 VO2", c.redT, vo2S.badgeOp as number, c)

  el.innerHTML = h
}

/* ─── animation helpers ─── */

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpState(
  from: Record<string, number | string | boolean>,
  to: Record<string, number | string | boolean>,
  t: number,
): Record<string, number | string | boolean> {
  const r: Record<string, number | string | boolean> = {}
  for (const k in to) {
    if (typeof to[k] === "number") {
      r[k] = lerp((from[k] as number) || 0, to[k] as number, t)
    } else {
      r[k] = t > 0.5 ? to[k] : from[k]
    }
  }
  return r
}

/* ─── component ─── */

const TOTAL = 6
const ANIM_DURATION = 600

export default function ComparisonPage({ embedded }: { embedded?: boolean } = {}) {
  const [phase, setPhase] = useState(0)
  const [chartView, setChartView] = useState<"split" | "combined">("split")
  const nsaRef = useRef<SVGSVGElement>(null)
  const vo2Ref = useRef<SVGSVGElement>(null)
  const comboRef = useRef<SVGSVGElement>(null)
  const animFrameRef = useRef<number | null>(null)
  const prevPhaseRef = useRef(0)

  /* initial render */
  useEffect(() => {
    if (nsaRef.current && vo2Ref.current) {
      drawChart(nsaRef.current, phaseData[0].nsa as unknown as Record<string, number | string | boolean>, "nsa")
      drawChart(vo2Ref.current, phaseData[0].vo2 as unknown as Record<string, number | string | boolean>, "vo2")
    }
    if (comboRef.current) {
      drawCombinedChart(comboRef.current, phaseData[0].nsa as unknown as Record<string, number | string | boolean>, phaseData[0].vo2 as unknown as Record<string, number | string | boolean>)
    }
  }, [])

  /* re-draw on theme change (MutationObserver on <html> class) */
  useEffect(() => {
    const obs = new MutationObserver(() => {
      if (nsaRef.current && vo2Ref.current) {
        drawChart(nsaRef.current, phaseData[phase].nsa as unknown as Record<string, number | string | boolean>, "nsa")
        drawChart(vo2Ref.current, phaseData[phase].vo2 as unknown as Record<string, number | string | boolean>, "vo2")
      }
      if (comboRef.current) {
        drawCombinedChart(comboRef.current, phaseData[phase].nsa as unknown as Record<string, number | string | boolean>, phaseData[phase].vo2 as unknown as Record<string, number | string | boolean>)
      }
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [phase])

  const animateStep = useCallback((fromP: number, toP: number) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

    const fromNsa = phaseData[fromP].nsa as unknown as Record<string, number | string | boolean>
    const toNsa = phaseData[toP].nsa as unknown as Record<string, number | string | boolean>
    const fromVo2 = phaseData[fromP].vo2 as unknown as Record<string, number | string | boolean>
    const toVo2 = phaseData[toP].vo2 as unknown as Record<string, number | string | boolean>

    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const raw = Math.min(elapsed / ANIM_DURATION, 1)
      const t = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2

      const sNsa = lerpState(fromNsa, toNsa, t)
      const sVo2 = lerpState(fromVo2, toVo2, t)

      if (nsaRef.current) drawChart(nsaRef.current, sNsa, "nsa")
      if (vo2Ref.current) drawChart(vo2Ref.current, sVo2, "vo2")
      if (comboRef.current) drawCombinedChart(comboRef.current, sNsa, sVo2)

      if (raw < 1) {
        animFrameRef.current = requestAnimationFrame(tick)
      }
    }

    animFrameRef.current = requestAnimationFrame(tick)
  }, [])

  const goTo = useCallback((newP: number) => {
    const oldP = prevPhaseRef.current
    prevPhaseRef.current = newP
    setPhase(newP)
    animateStep(oldP, newP)
  }, [animateStep])

  const next = useCallback(() => { if (prevPhaseRef.current < TOTAL - 1) goTo(prevPhaseRef.current + 1) }, [goTo])
  const prev = useCallback(() => { if (prevPhaseRef.current > 0) goTo(prevPhaseRef.current - 1) }, [goTo])

  /* keyboard nav */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next()
      if (e.key === "ArrowLeft") prev()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [next, prev])

  /* cleanup animation frame on unmount */
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  const cur = info[phase]

  return (
    <div className={embedded ? "" : "max-w-[760px] mx-auto px-5 py-8 pb-12"}>
      {/* header */}
      <header className="text-center mb-10">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">NSA vs VO2max</h1>
        <p className="text-sm text-muted-foreground">How each method shifts your lactate curve — step by step</p>
      </header>

      {/* controls */}
      <div className="flex gap-2 items-center mb-5">
        <span className="text-xs text-muted-foreground">Step through:</span>
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL }, (_, i) => (
            <button
              key={i}
              aria-label={`Step ${i + 1}`}
              onClick={() => goTo(i)}
              className={
                i === phase
                  ? "w-5 h-2 rounded-sm bg-zone-teal transition-all duration-300"
                  : i < phase
                    ? "w-2 h-2 rounded-full bg-zone-teal transition-all duration-300"
                    : "w-2 h-2 rounded-full bg-border transition-all duration-300"
              }
            />
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={prev}>Back</Button>
          <Button variant="outline" size="sm" onClick={next}>Next</Button>
        </div>
      </div>

      {/* phase info */}
      <div className="text-lg font-medium tracking-tight mb-1">{cur.t}</div>
      <div className="text-sm text-muted-foreground mb-5 min-h-[40px] max-w-[640px] leading-relaxed">{cur.d}</div>

      {/* Chart view toggle */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          size="sm"
          variant={chartView === "split" ? "default" : "outline"}
          onClick={() => setChartView("split")}
        >
          Split view
        </Button>
        <Button
          size="sm"
          variant={chartView === "combined" ? "default" : "outline"}
          onClick={() => setChartView("combined")}
        >
          Combined
        </Button>
      </div>

      {/* Split charts */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 ${chartView === "split" ? "" : "hidden"}`}>
        <div className="rounded-xl p-4 overflow-hidden border border-border bg-gradient-to-b from-background to-muted/50">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-zone-teal" />
            <div className="text-sm font-medium">NSA — push from below</div>
          </div>
          <div className="text-xs text-muted-foreground mb-2 min-h-[18px]">{cur.nl}</div>
          <svg ref={nsaRef} viewBox="0 0 320 270" className="w-full" />
        </div>
        <div className="rounded-xl p-4 overflow-hidden border border-border bg-gradient-to-b from-background to-muted/50">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-zone-red" />
            <div className="text-sm font-medium">VO2max — pull from above</div>
          </div>
          <div className="text-xs text-muted-foreground mb-2 min-h-[18px]">{cur.vl}</div>
          <svg ref={vo2Ref} viewBox="0 0 320 270" className="w-full" />
        </div>
      </div>

      {/* Combined chart */}
      <div className={`rounded-xl p-4 overflow-hidden border border-border bg-gradient-to-b from-background to-muted/50 mb-5 ${chartView === "combined" ? "" : "hidden"}`}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-zone-teal" />
          <div className="w-2.5 h-2.5 rounded-sm bg-zone-red" />
          <div className="text-sm font-medium">Combined — both approaches overlaid</div>
        </div>
        <div className="text-xs text-muted-foreground mb-2 min-h-[18px]">Direct comparison on the same axes</div>
        <svg ref={comboRef} viewBox="0 0 320 270" className="w-full" />
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-3.5 text-xs text-muted-foreground mb-5">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-[3px] rounded-sm bg-muted-foreground inline-block" />
          Baseline curve
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-[3px] rounded-sm bg-zone-teal inline-block" />
          After NSA training
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-[3px] rounded-sm bg-zone-red inline-block" />
          After VO2max training
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-2.5 rounded-sm bg-zone-amber opacity-20 inline-block" />
          Sub-T zone
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-2.5 rounded-sm bg-zone-red opacity-15 inline-block" />
          VO2max zone
        </span>
      </div>

      {/* summary card — phase 5 only */}
      {phase === 5 && (
        <div className="bg-muted rounded-xl p-5 mb-5">
          <div className="text-sm font-medium mb-1.5">The compounding math</div>
          <div className="text-sm text-muted-foreground leading-relaxed">
            NSA doesn&rsquo;t produce a bigger per-session stimulus than VO2max. It produces a bigger total stimulus per week because recovery cost is lower, enabling 3 sessions instead of 2. Over months, more sessions = more rightward curve shift = faster race times.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="rounded-lg p-3.5 bg-zone-teal-bg">
              <div className="text-[0.7rem] text-zone-teal-text">NSA weekly quality TSS</div>
              <div className="text-lg font-medium font-mono text-zone-teal">231</div>
              <div className="text-[0.7rem] text-zone-teal-text">3 sessions &times; 77 TSS</div>
            </div>
            <div className="rounded-lg p-3.5 bg-zone-red-bg">
              <div className="text-[0.7rem] text-zone-red-text">VO2max weekly quality TSS</div>
              <div className="text-lg font-medium font-mono text-zone-red">184</div>
              <div className="text-[0.7rem] text-zone-red-text">2 sessions &times; 92 TSS</div>
            </div>
          </div>
        </div>
      )}

      {/* footer */}
      <footer className="text-xs text-muted-foreground border-t pt-4 mt-6 leading-relaxed">
        Based on Sirpoc84&rsquo;s Norwegian Singles method posts (LetsRun, 2023&ndash;2025). The lactate curve shift is illustrative — actual magnitudes vary by individual. The core principle holds: lower recovery cost per session enables more weekly volume, which compounds into greater total adaptation over time.
      </footer>
    </div>
  )
}
