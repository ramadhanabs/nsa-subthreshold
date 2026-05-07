import { describe, it, expect } from "vitest"
import { get5kPace, getHR, getWorkouts, getPaceZones, getThreshold, paceFromPct, fmtPace } from "./calculator"

describe("get5kPace", () => {
  it("returns pace per km from 5k time", () => {
    // 24:30 over 5km = 294s/km
    expect(get5kPace("5k", 24, 30)).toBe(294)
  })

  it("returns pace per km from 20min test distance", () => {
    // 20min test, 4.50km => 1200/4.5 = 266.67
    expect(get5kPace("20min", 4, 50)).toBeCloseTo(266.67, 1)
  })

  it("returns pace per km from 10k time via Riegel", () => {
    // 50:00 10K → Riegel 5K equiv ≈ 24:01 → ~288s/km
    const pace = get5kPace("10k", 50, 0)
    expect(pace).toBeGreaterThan(280)
    expect(pace).toBeLessThan(295)
  })

  it("returns pace per km from half marathon time via Riegel", () => {
    // 1:50:00 half → should give a reasonable 5K pace
    const pace = get5kPace("half", 1, 50)
    expect(pace).toBeGreaterThan(270)
    expect(pace).toBeLessThan(310)
  })

  it("returns pace per km from marathon time via Riegel", () => {
    // 3:50:00 marathon → should give a reasonable 5K pace
    const pace = get5kPace("full", 3, 50)
    expect(pace).toBeGreaterThan(270)
    expect(pace).toBeLessThan(310)
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
  it("returns 5 workouts (2 easy + 3 sub-T)", () => {
    const wks = getWorkouts(294, "dist")
    expect(wks).toHaveLength(5)
    expect(wks[0].name).toBe("Easy run")
    expect(wks[1].name).toBe("Long run")
    expect(wks[2].name).toBe("Short sub-T session")
    expect(wks[3].name).toBe("Medium sub-T session")
    expect(wks[4].name).toBe("Long sub-T session")
  })

  it("shows distance equivalents in dist mode", () => {
    const wks = getWorkouts(294, "dist")
    expect(wks[2].detail).toContain("km total")
    expect(wks[2].detail).toContain("10 x 1000m")
  })

  it("shows time equivalents in time mode", () => {
    const wks = getWorkouts(294, "time")
    expect(wks[2].detail).toContain("total")
    expect(wks[2].detail).toContain("10 x")
  })
})

describe("getThreshold", () => {
  it("calculates threshold as 5K pace × 1.05", () => {
    expect(getThreshold(290)).toBeCloseTo(304.5, 1)
    expect(getThreshold(294)).toBeCloseTo(308.7, 1)
  })
})

describe("paceFromPct", () => {
  it("returns threshold pace at 100%", () => {
    expect(paceFromPct(304.5, 100)).toBeCloseTo(304.5, 1)
  })

  it("returns faster pace at >100%", () => {
    // 101% → faster → lower s/km
    expect(paceFromPct(304.5, 101)).toBeLessThan(304.5)
  })

  it("returns slower pace at <100%", () => {
    // 95% → slower → higher s/km
    expect(paceFromPct(304.5, 95)).toBeGreaterThan(304.5)
  })
})

describe("getPaceZones", () => {
  it("derives pace ranges from 5k pace using threshold", () => {
    const pz = getPaceZones(290)
    // threshold = 290 * 1.05 = 304.5
    expect(pz.threshold).toBeCloseTo(304.5, 1)
    // short range should be faster than medium
    expect(pz.short[0]).toBeLessThan(pz.medium[0])
    // long range should be slowest
    expect(pz.long[1]).toBeGreaterThan(pz.medium[1])
    // easy max should be slower than all intervals
    expect(pz.easyMax).toBeGreaterThan(pz.long[1])
  })

  it("short zone is 99-101% of threshold", () => {
    const pz = getPaceZones(290)
    const tp = 290 * 1.05
    // short[0] = faster end (101%), short[1] = slower end (99%)
    expect(pz.short[0]).toBeCloseTo(tp / 1.01, 1)
    expect(pz.short[1]).toBeCloseTo(tp / 0.99, 1)
  })
})

describe("fmtPace", () => {
  it("formats seconds as mm:ss", () => {
    expect(fmtPace(294)).toBe("4:54")
    expect(fmtPace(60)).toBe("1:00")
    expect(fmtPace(65)).toBe("1:05")
  })
})
