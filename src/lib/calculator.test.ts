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
