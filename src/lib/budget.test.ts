import { describe, it, expect } from "vitest"
import {
  calcBaseline,
  calcWeeklyBudget,
  calcLongRunBudget,
  calcQSessionBudget,
  calcEasyRunMin,
  fmtHoursMin,
  computeBudget,
} from "./budget"

describe("calcBaseline", () => {
  it("computes weekly average from 42-day total", () => {
    // 2520 / 42 * 7 = 420
    expect(calcBaseline(2520)).toBe(420)
  })

  it("returns 0 for 0 minutes", () => {
    expect(calcBaseline(0)).toBe(0)
  })
})

describe("calcWeeklyBudget", () => {
  it("applies positive adjustment (safe build)", () => {
    // 360 * 1.05 = 378
    expect(calcWeeklyBudget(360, 0.05)).toBe(378)
  })

  it("applies negative adjustment (recovery)", () => {
    // 360 * 0.85 = 306
    expect(calcWeeklyBudget(360, -0.15)).toBe(306)
  })
})

describe("calcLongRunBudget", () => {
  it("computes safe long run from baseline", () => {
    // (360 / 7) * 3 * 1.0 = 154.28... -> 154
    // weekly must be high enough so 30% cap doesn't trigger: 154/0.30 = 514
    const result = calcLongRunBudget(360, 1.0, 520)
    expect(result.budget).toBe(154)
    expect(result.capped).toBe(false)
  })

  it("caps at 30% of weekly budget when multiplier is very high", () => {
    // (360 / 7) * 3 * 2.0 = 308.57 -> 309
    // cap = 378 * 0.30 = 113.4 -> 113
    const result = calcLongRunBudget(360, 2.0, 378)
    expect(result.budget).toBe(113)
    expect(result.capped).toBe(true)
  })
})

describe("calcQSessionBudget", () => {
  it("computes Q session budget", () => {
    // (360 / 7) * 1.2 = 61.71... -> 62
    expect(calcQSessionBudget(360, 1.2)).toBe(62)
  })
})

describe("calcEasyRunMin", () => {
  it("solves for easy run duration", () => {
    // (378 - 3*62 - 75) / 3 = (378 - 186 - 75) / 3 = 117 / 3 = 39
    expect(calcEasyRunMin(378, 62, 75)).toBe(39)
  })

  it("returns negative when budget is too tight", () => {
    // (200 - 3*100 - 75) / 3 = (200 - 300 - 75) / 3 = -175/3 = -58.33 -> -58
    expect(calcEasyRunMin(200, 100, 75)).toBe(-58)
  })
})

describe("fmtHoursMin", () => {
  it("formats 154 minutes", () => {
    expect(fmtHoursMin(154)).toBe("2h 34m")
  })

  it("formats exactly 60 minutes", () => {
    expect(fmtHoursMin(60)).toBe("1h 00m")
  })

  it("formats 0 minutes", () => {
    expect(fmtHoursMin(0)).toBe("0h 00m")
  })
})

describe("computeBudget", () => {
  it("returns valid breakdown for safe build settings", () => {
    const result = computeBudget({
      baseline: 360,
      weeklyAdj: 0.05,
      lrMultiplier: 1.0,
      qMultiplier: 1.2,
    })
    expect(result.weeklyBudget).toBe(378)
    // raw LR = 154 but 30% cap of 378 = 113, so LR is capped
    expect(result.longRunBudget).toBe(113)
    expect(result.longRunCapped).toBe(true)
    expect(result.qSessionBudget).toBe(62)
    expect(result.isWithinBudget).toBe(true)
    expect(result.isEasyViable).toBe(true)
  })

  it("warns when settings are too aggressive", () => {
    const result = computeBudget({
      baseline: 200,
      weeklyAdj: -0.15,
      lrMultiplier: 1.18,
      qMultiplier: 1.75,
    })
    // Small baseline + recovery week + aggressive Q/LR
    expect(result.isEasyViable).toBe(false)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings.some(w => w.includes("Easy runs too short"))).toBe(true)
  })

  it("caps long run and warns", () => {
    const result = computeBudget({
      baseline: 360,
      weeklyAdj: -0.15,        // recovery: 306 weekly budget
      lrMultiplier: 1.18,      // very high risk LR
    })
    // raw LR = (360/7)*3*1.18 = 182, cap = 306*0.30 = 92
    expect(result.longRunCapped).toBe(true)
    expect(result.warnings.some(w => w.includes("Long run capped"))).toBe(true)
  })
})
