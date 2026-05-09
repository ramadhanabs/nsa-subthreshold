import { describe, it, expect } from "vitest"
import {
  Q_TEMPLATES,
  toIntervalsWorkout,
  toEasyRunWorkout,
  toIntervalsDescription,
  toEasyRunDescription,
  estimateQualityLoad,
  estimateEasyLoad,
  totalSessionMin,
} from "./planner-data"

describe("toIntervalsWorkout", () => {
  it("generates correct JSON for short template (8×3min)", () => {
    const t = Q_TEMPLATES.short[1] // 8×3min
    const result = toIntervalsWorkout(t, 10, 5)

    expect(result.description).toBe("NSA Quality Short — 8×3min sub-threshold intervals")
    expect(result.target).toBe("PACE")
    expect(result.steps).toHaveLength(3)

    // Warmup: 10min = 600s
    expect(result.steps[0]).toEqual({ duration: 600, warmup: true, text: "Easy warmup" })

    // Repeat block
    const repeat = result.steps[1] as { reps: number; steps: unknown[] }
    expect(repeat.reps).toBe(8)
    expect(repeat.steps).toHaveLength(2)
    expect(repeat.steps[0]).toEqual({
      duration: 180, // 3min
      pace: { value: 100, units: "%pace" }, // midpoint of 99-101
      text: "Sub-T effort",
    })
    expect(repeat.steps[1]).toEqual({ duration: 60, text: "Walk/jog recovery" })

    // Cooldown: 5min = 300s
    expect(result.steps[2]).toEqual({ duration: 300, cooldown: true, text: "Easy cooldown" })
  })

  it("generates correct JSON for medium template (5×6min)", () => {
    const t = Q_TEMPLATES.medium[3] // 5×6min
    const result = toIntervalsWorkout(t, 10, 5)

    expect(result.description).toBe("NSA Quality Medium — 5×6min sub-threshold intervals")
    const repeat = result.steps[1] as { reps: number; steps: unknown[] }
    expect(repeat.reps).toBe(5)
    expect(repeat.steps[0]).toEqual({
      duration: 360, // 6min
      pace: { value: 98, units: "%pace" }, // midpoint of 97-99
      text: "Sub-T effort",
    })
    expect(repeat.steps[1]).toEqual({ duration: 60, text: "Walk/jog recovery" })
  })

  it("generates correct JSON for long template (3×12min)", () => {
    const t = Q_TEMPLATES.long[3] // 3×12min
    const result = toIntervalsWorkout(t, 10, 5)

    expect(result.description).toBe("NSA Quality Long — 3×12min sub-threshold intervals")
    const repeat = result.steps[1] as { reps: number; steps: unknown[] }
    expect(repeat.reps).toBe(3)
    expect(repeat.steps[0]).toEqual({
      duration: 720, // 12min
      pace: { value: 96, units: "%pace" }, // midpoint of 95-97
      text: "Sub-T effort",
    })
    expect(repeat.steps[1]).toEqual({ duration: 105, text: "Walk/jog recovery" })
  })

  it("converts WU/CD minutes to seconds", () => {
    const t = Q_TEMPLATES.short[0]
    const result = toIntervalsWorkout(t, 15, 10)

    expect(result.steps[0]).toMatchObject({ duration: 900 }) // 15 * 60
    expect(result.steps[2]).toMatchObject({ duration: 600 }) // 10 * 60
  })
})

describe("toEasyRunWorkout", () => {
  it("generates easy run JSON", () => {
    const result = toEasyRunWorkout(50, false)

    expect(result.description).toBe("NSA Easy Run")
    expect(result.target).toBe("PACE")
    expect(result.steps).toHaveLength(1)
    expect(result.steps[0]).toEqual({
      duration: 3000, // 50 * 60
      pace: { value: 74, units: "%pace" },
      text: "Easy run",
    })
  })

  it("generates long run JSON", () => {
    const result = toEasyRunWorkout(90, true)

    expect(result.description).toBe("NSA Long Run")
    expect(result.steps[0]).toEqual({
      duration: 5400, // 90 * 60
      pace: { value: 74, units: "%pace" },
      text: "Long run",
    })
  })
})

describe("toIntervalsDescription", () => {
  it("generates markdown for short template", () => {
    const t = Q_TEMPLATES.short[1] // 8×3min
    const desc = toIntervalsDescription(t, 10, 5)

    expect(desc).toBe(
      "Warmup\n- 10m 69-79% Pace\n\n" +
      "8x\n- 3m 99-101% Pace\n- 1m 69-79% Pace\n\n" +
      "Cooldown\n- 5m 69-79% Pace"
    )
  })

  it("formats non-round rest durations", () => {
    const t = Q_TEMPLATES.long[3] // 3×12min, 105s rest
    const desc = toIntervalsDescription(t, 10, 5)

    expect(desc).toContain("1m45s 69-79% Pace")
  })
})

describe("toEasyRunDescription", () => {
  it("generates single-line easy run markdown", () => {
    expect(toEasyRunDescription(50)).toBe("- 50m 69-79% Pace")
    expect(toEasyRunDescription(90)).toBe("- 90m 69-79% Pace")
  })
})

describe("estimateQualityLoad", () => {
  it("1 hour at threshold = 100 load (sanity check)", () => {
    // Fake template: 1×60min at 100% threshold, no rest
    const t = { id: "x", name: "test", reps: 1, dur: 60, rest: 0, vol: 60, pctLow: 100, pctHigh: 100 }
    const load = estimateQualityLoad(t, 0, 0)
    expect(load).toBe(100)
  })

  it("calculates load for 8×3min short session", () => {
    const t = Q_TEMPLATES.short[1] // 8×3min, 99-101%, 60s rest
    const load = estimateQualityLoad(t, 10, 5)
    // WU: 0.74² × (10/60) × 100 ≈ 9.13
    // CD: 0.74² × (5/60) × 100 ≈ 4.56
    // Work per rep: 1.0² × (3/60) × 100 = 5.0
    // Rest per rep: 0.74² × (1/60) × 100 ≈ 0.91
    // Total: 9.13 + 8*(5.0+0.91) + 4.56 ≈ 61
    expect(load).toBeGreaterThan(55)
    expect(load).toBeLessThan(70)
  })

  it("longer sessions produce higher load", () => {
    const short = Q_TEMPLATES.short[0] // 7×3min
    const long = Q_TEMPLATES.long[6]   // 3×15min
    expect(estimateQualityLoad(long, 10, 5)).toBeGreaterThan(estimateQualityLoad(short, 10, 5))
  })
})

describe("estimateEasyLoad", () => {
  it("50min easy run produces reasonable load", () => {
    const load = estimateEasyLoad(50)
    // 0.74² × (50/60) × 100 ≈ 45.6
    expect(load).toBeGreaterThan(40)
    expect(load).toBeLessThan(50)
  })

  it("longer runs produce higher load", () => {
    expect(estimateEasyLoad(90)).toBeGreaterThan(estimateEasyLoad(50))
  })
})

describe("test workout templates", () => {
  it("has test templates with correct structure", () => {
    expect(Q_TEMPLATES.test).toHaveLength(2)
    expect(Q_TEMPLATES.test[0].id).toBe("t1")
    expect(Q_TEMPLATES.test[0].name).toBe("5k Time Trial")
    expect(Q_TEMPLATES.test[1].id).toBe("t2")
    expect(Q_TEMPLATES.test[1].name).toBe("20' Test")
  })

  it("generates workout JSON for 5K TT", () => {
    const t = Q_TEMPLATES.test[0]
    const result = toIntervalsWorkout(t, 10, 5)
    expect(result.description).toContain("5k Time Trial")
  })

  it("generates workout JSON for 20min Test", () => {
    const t = Q_TEMPLATES.test[1]
    const result = toIntervalsWorkout(t, 10, 5)
    expect(result.description).toContain("20' Test")
  })
})

describe("totalSessionMin", () => {
  it("calculates total duration including rest between reps", () => {
    const t = Q_TEMPLATES.short[1] // 8×3min, 60s rest
    // WU + CD + vol + (reps-1) * rest_min = 10 + 5 + 24 + 7*1 = 46
    expect(totalSessionMin(t, 10, 5)).toBe(46)
  })
})
