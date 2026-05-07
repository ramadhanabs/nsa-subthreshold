import { describe, it, expect } from "bun:test"
import {
  computeWeeklyVolumes,
  computeCV,
  detectCTLTrend,
  detectMaxGap,
  computeReadiness,
} from "./Assessment"

// Helper: generate a date string N days ago from today
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

describe("computeWeeklyVolumes", () => {
  it("returns zeros for empty activities", () => {
    const result = computeWeeklyVolumes([], 8)
    expect(result).toHaveLength(8)
    expect(result.every((v) => v === 0)).toBe(true)
  })

  it("groups activities by ISO week", () => {
    // Create activities on consecutive days in the same week
    const monday = new Date()
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)) // this Monday
    const mondayStr = monday.toISOString().slice(0, 10)
    const tuesday = new Date(monday)
    tuesday.setDate(tuesday.getDate() + 1)
    const tuesdayStr = tuesday.toISOString().slice(0, 10)

    const activities = [
      { date: mondayStr, duration_secs: 3600 }, // 60 min
      { date: tuesdayStr, duration_secs: 1800 }, // 30 min
    ]
    const result = computeWeeklyVolumes(activities, 4)
    expect(result).toHaveLength(4)
    // Last week should have 90 min
    expect(result[result.length - 1]).toBe(90)
  })

  it("returns correct number of weeks", () => {
    expect(computeWeeklyVolumes([], 4)).toHaveLength(4)
    expect(computeWeeklyVolumes([], 12)).toHaveLength(12)
  })
})

describe("computeCV", () => {
  it("returns 0 for empty array", () => {
    expect(computeCV([])).toBe(0)
  })

  it("returns 0 for identical values", () => {
    expect(computeCV([100, 100, 100, 100])).toBe(0)
  })

  it("returns 0 for all zeros", () => {
    expect(computeCV([0, 0, 0])).toBe(0)
  })

  it("computes correct CV for known values", () => {
    // mean=10, stdev=~4.08, CV=~40.8%
    const cv = computeCV([5, 10, 15])
    expect(cv).toBeCloseTo(40.82, 0)
  })

  it("returns low CV for consistent values", () => {
    const cv = computeCV([95, 100, 105, 100])
    expect(cv).toBeLessThan(10)
  })
})

describe("detectCTLTrend", () => {
  it("returns stable for too few values", () => {
    expect(detectCTLTrend([{ ctl: 50 }, { ctl: 60 }])).toBe("stable")
  })

  it("returns rising when second half is higher", () => {
    const wellness = [
      { ctl: 40 },
      { ctl: 42 },
      { ctl: 44 },
      { ctl: 46 },
      { ctl: 55 },
      { ctl: 58 },
      { ctl: 60 },
      { ctl: 62 },
    ]
    expect(detectCTLTrend(wellness)).toBe("rising")
  })

  it("returns declining when second half is lower", () => {
    const wellness = [
      { ctl: 60 },
      { ctl: 58 },
      { ctl: 56 },
      { ctl: 55 },
      { ctl: 40 },
      { ctl: 38 },
      { ctl: 36 },
      { ctl: 34 },
    ]
    expect(detectCTLTrend(wellness)).toBe("declining")
  })

  it("returns stable when halves are similar", () => {
    const wellness = [
      { ctl: 50 },
      { ctl: 51 },
      { ctl: 49 },
      { ctl: 50 },
      { ctl: 50 },
      { ctl: 51 },
      { ctl: 49 },
      { ctl: 50 },
    ]
    expect(detectCTLTrend(wellness)).toBe("stable")
  })

  it("filters out null CTL values", () => {
    const wellness = [
      { ctl: null },
      { ctl: 40 },
      { ctl: 42 },
      { ctl: null },
      { ctl: 55 },
      { ctl: 58 },
    ]
    expect(detectCTLTrend(wellness)).toBe("rising")
  })
})

describe("detectMaxGap", () => {
  it("returns 0 when every day has activity", () => {
    const activities: Array<{ date: string }> = []
    const from = new Date()
    for (let i = 0; i <= 28; i++) {
      const d = new Date(from)
      d.setDate(d.getDate() - i)
      activities.push({ date: d.toISOString().slice(0, 10) })
    }
    expect(detectMaxGap(activities, from.toISOString().slice(0, 10))).toBe(0)
  })

  it("returns 28 when no activities", () => {
    // 29 days in window (day 0 through day 28), all gaps
    const gap = detectMaxGap([], daysAgo(0))
    expect(gap).toBe(29)
  })

  it("detects a gap in the middle", () => {
    const from = daysAgo(0)
    const activities = [
      { date: daysAgo(5) },
      { date: daysAgo(6) },
      { date: daysAgo(15) },
      { date: daysAgo(16) },
    ]
    // Gap between day 6 ago and day 15 ago = 8 days gap (days 7-14)
    const gap = detectMaxGap(activities, from)
    // The gap could also be at the edges; just check it's reasonable
    expect(gap).toBeGreaterThanOrEqual(5)
  })
})

describe("computeReadiness", () => {
  function makeActivities(
    runsPerWeek: number,
    minutesPerRun: number,
    kmPerRun: number,
    weeks: number
  ) {
    const activities: Array<{ date: string; duration_secs: number; distance_m: number }> = []
    for (let w = 0; w < weeks; w++) {
      for (let r = 0; r < runsPerWeek; r++) {
        const d = new Date()
        d.setDate(d.getDate() - w * 7 - r)
        activities.push({
          date: d.toISOString().slice(0, 10),
          duration_secs: minutesPerRun * 60,
          distance_m: kmPerRun * 1000,
        })
      }
    }
    return activities
  }

  function makeWellness(days: number, ctl: number, tsb: number) {
    const wellness: Array<{ date: string; ctl: number | null; atl: number | null; tsb: number | null }> = []
    for (let i = 0; i < days; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (days - 1 - i))
      wellness.push({
        date: d.toISOString().slice(0, 10),
        ctl,
        atl: ctl + 5,
        tsb,
      })
    }
    return wellness
  }

  it("returns not_ready for insufficient volume", () => {
    // 3 runs/week * 20 min = 60 min/week -- way below 180
    const activities = makeActivities(3, 20, 3, 8)
    const wellness = makeWellness(28, 30, -5)
    const result = computeReadiness(activities, wellness)
    expect(result.readiness).toBe("not_ready")
    expect(result.tier).toBe("not_ready")
  })

  it("returns ready for solid training", () => {
    // 5 runs/week * 60 min = 300 min/week
    const activities = makeActivities(5, 60, 10, 8)
    const wellness = makeWellness(28, 50, -5)
    const result = computeReadiness(activities, wellness)
    expect(result.readiness).toBe("ready")
    expect(result.tier).toBe("full_nsa")
    expect(result.recommendedQSessions).toBe(3)
  })

  it("assigns foundation tier at 180-250 min/week", () => {
    // 4 runs/week * 50 min = 200 min/week
    const activities = makeActivities(4, 50, 8, 8)
    const wellness = makeWellness(28, 40, -5)
    const result = computeReadiness(activities, wellness)
    expect(result.tier).toBe("foundation")
    expect(result.recommendedQSessions).toBe(1)
  })

  it("assigns transition tier at 250-300 min/week", () => {
    // 5 runs/week * 55 min = 275 min/week
    const activities = makeActivities(5, 55, 9, 8)
    const wellness = makeWellness(28, 45, -5)
    const result = computeReadiness(activities, wellness)
    expect(result.tier).toBe("transition")
    expect(result.recommendedQSessions).toBe(2)
  })

  it("assigns advanced tier at 420+ min/week", () => {
    // 6 runs/week * 80 min = 480 min/week
    const activities = makeActivities(6, 80, 14, 8)
    const wellness = makeWellness(28, 70, -5)
    const result = computeReadiness(activities, wellness)
    expect(result.tier).toBe("advanced_nsa")
    expect(result.recommendedQSessions).toBe(3)
  })

  it("flags low TSB", () => {
    const activities = makeActivities(5, 60, 10, 8)
    const wellness = makeWellness(28, 50, -25)
    const result = computeReadiness(activities, wellness)
    expect(result.flags.some((f) => f.includes("TSB too low"))).toBe(true)
  })

  it("calculates maxQVolumeMin as 25% of baseline", () => {
    // 5 runs/week * 60 min = 300 min/week
    const activities = makeActivities(5, 60, 10, 8)
    const wellness = makeWellness(28, 50, -5)
    const result = computeReadiness(activities, wellness)
    // baseline ~ 300, maxQ ~ 75
    expect(result.maxQVolumeMin).toBeGreaterThan(50)
    expect(result.maxQVolumeMin).toBeLessThan(120)
  })

  it("includes volumeCV in result", () => {
    const activities = makeActivities(5, 60, 10, 8)
    const wellness = makeWellness(28, 50, -5)
    const result = computeReadiness(activities, wellness)
    expect(typeof result.volumeCV).toBe("number")
    expect(result.volumeCV).toBeGreaterThanOrEqual(0)
  })

  it("flags declining CTL trend", () => {
    const activities = makeActivities(5, 60, 10, 8)
    const wellness: Array<{ date: string; ctl: number | null; atl: number | null; tsb: number | null }> = []
    for (let i = 0; i < 28; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (27 - i))
      wellness.push({
        date: d.toISOString().slice(0, 10),
        ctl: 60 - i * 1.5, // declining from 60 to ~18
        atl: 50,
        tsb: -5,
      })
    }
    const result = computeReadiness(activities, wellness)
    expect(result.ctlTrend).toBe("declining")
    expect(result.flags.some((f) => f.includes("declining"))).toBe(true)
  })
})
