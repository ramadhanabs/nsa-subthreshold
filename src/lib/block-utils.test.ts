import { describe, it, expect } from "vitest"
import { generateEventName, computeWeekSummary, buildEvents } from "./block-utils"
import { Q_TEMPLATES, type DaySlotData } from "./planner-data"
import type { WeekPlan } from "./block-types"

describe("generateEventName", () => {
  it("names quality sessions with roman numerals", () => {
    expect(generateEventName("quality_short", "8×3min", 0)).toBe(
      "Subthreshold I (Short — 8×3min)",
    )
    expect(generateEventName("quality_medium", "5×6min", 1)).toBe(
      "Subthreshold II (Medium — 5×6min)",
    )
    expect(generateEventName("quality_long", "3×10min", 2)).toBe(
      "Subthreshold III (Long — 3×10min)",
    )
  })

  it("increments roman numeral index correctly", () => {
    expect(generateEventName("quality_short", "10×3min", 3)).toBe(
      "Subthreshold IV (Short — 10×3min)",
    )
  })

  it("names easy and long runs with duration", () => {
    expect(generateEventName("easy", "", 0, 50)).toBe("Easy Run (50min)")
    expect(generateEventName("long_run", "", 0, 90)).toBe("Long Run (90min)")
  })

  it("names test workouts", () => {
    expect(generateEventName("test_5k", "", 0)).toBe("5K Time Trial")
    expect(generateEventName("test_20min", "", 0)).toBe("20min Threshold Test")
  })

  it("names rest days", () => {
    expect(generateEventName("rest", "", 0)).toBe("Rest")
  })
})

describe("computeWeekSummary", () => {
  it("computes summary for a week with mixed sessions", () => {
    const days: DaySlotData[] = [
      { day: "Mon", type: "quality", template: Q_TEMPLATES.short[1] },
      { day: "Tue", type: "easy", template: null },
      { day: "Wed", type: "rest", template: null },
      { day: "Thu", type: "quality", template: Q_TEMPLATES.medium[3] },
      { day: "Fri", type: "easy", template: null },
      { day: "Sat", type: "long", template: null },
      { day: "Sun", type: "rest", template: null },
    ]

    const summary = computeWeekSummary(days, 10, 10)

    expect(summary.qualityDurationMin).toBe(54) // 24 + 30
    expect(summary.numQualitySessions).toBe(2)
    expect(summary.totalDurationMin).toBeGreaterThan(0)
    expect(summary.qualityPercentage).toBeGreaterThan(0)
    expect(summary.qualityPercentage).toBeLessThan(100)
    expect(summary.estimatedLoad).toBeGreaterThan(0)
  })

  it("computes summary for empty week", () => {
    const days: DaySlotData[] = [
      { day: "Mon", type: null, template: null },
      { day: "Tue", type: null, template: null },
      { day: "Wed", type: null, template: null },
      { day: "Thu", type: null, template: null },
      { day: "Fri", type: null, template: null },
      { day: "Sat", type: null, template: null },
      { day: "Sun", type: null, template: null },
    ]

    const summary = computeWeekSummary(days, 10, 10)
    expect(summary.totalDurationMin).toBe(0)
    expect(summary.qualityDurationMin).toBe(0)
    expect(summary.numQualitySessions).toBe(0)
    expect(summary.estimatedLoad).toBe(0)
  })

  it("uses custom easyInputs and longMin", () => {
    const days: DaySlotData[] = [
      { day: "Mon", type: "easy", template: null },
      { day: "Tue", type: null, template: null },
      { day: "Wed", type: null, template: null },
      { day: "Thu", type: null, template: null },
      { day: "Fri", type: null, template: null },
      { day: "Sat", type: "long", template: null },
      { day: "Sun", type: null, template: null },
    ]

    const summary = computeWeekSummary(days, 10, 10, { Mon: 60 }, 90)
    expect(summary.totalDurationMin).toBe(150)
  })
})

function mkWeek(
  weekNumber: 1 | 2 | 3 | 4,
  days: DaySlotData[],
): WeekPlan {
  return {
    weekNumber,
    weekType: weekNumber === 4 ? "deload" : "build",
    startDate: "2026-06-01",
    days,
    summary: computeWeekSummary(days, 10, 10),
    defaultWu: 10,
    defaultCd: 10,
  }
}

describe("buildEvents", () => {
  it("flattens a single week into events with correct dates", () => {
    const days: DaySlotData[] = [
      { day: "Mon", type: "quality", template: Q_TEMPLATES.short[1] },
      { day: "Tue", type: "easy", template: null },
      { day: "Wed", type: "rest", template: null },
      { day: "Thu", type: null, template: null },
      { day: "Fri", type: null, template: null },
      { day: "Sat", type: "long", template: null },
      { day: "Sun", type: "rest", template: null },
    ]

    const events = buildEvents([mkWeek(1, days)], "2026-06-01")

    expect(events).toHaveLength(3)
    expect(events[0].date).toBe("2026-06-01")
    expect(events[1].date).toBe("2026-06-02")
    expect(events[2].date).toBe("2026-06-06")

    expect(events[0].workoutType).toBe("quality_short")
    expect(events[1].workoutType).toBe("easy")
    expect(events[2].workoutType).toBe("long_run")

    expect(events[0].name).toBe("Subthreshold I (Short — 8×3min)")
    expect(events[1].name).toBe("Easy Run (40min)")
    expect(events[2].name).toBe("Long Run (75min)")

    expect(events[0].weekNumber).toBe(1)
    expect(events[0].workoutDoc).toBeDefined()
  })

  it("computes correct dates across multiple weeks", () => {
    const mkDays = (): DaySlotData[] => [
      { day: "Mon", type: "quality", template: Q_TEMPLATES.short[0] },
      { day: "Tue", type: null, template: null },
      { day: "Wed", type: null, template: null },
      { day: "Thu", type: null, template: null },
      { day: "Fri", type: null, template: null },
      { day: "Sat", type: null, template: null },
      { day: "Sun", type: null, template: null },
    ]

    const events = buildEvents(
      [mkWeek(1, mkDays()), mkWeek(2, mkDays()), null, null],
      "2026-06-01",
    )

    expect(events).toHaveLength(2)
    expect(events[0].date).toBe("2026-06-01")
    expect(events[1].date).toBe("2026-06-08")
  })

  it("assigns incrementing roman numerals to quality sessions within a week", () => {
    const days: DaySlotData[] = [
      { day: "Mon", type: "quality", template: Q_TEMPLATES.short[1] },
      { day: "Tue", type: "easy", template: null },
      { day: "Wed", type: "rest", template: null },
      { day: "Thu", type: "quality", template: Q_TEMPLATES.medium[3] },
      { day: "Fri", type: "easy", template: null },
      { day: "Sat", type: "quality", template: Q_TEMPLATES.long[1] },
      { day: "Sun", type: "rest", template: null },
    ]

    const events = buildEvents([mkWeek(1, days)], "2026-06-01")
    const qualityEvents = events.filter((e) => e.workoutType.startsWith("quality_"))

    expect(qualityEvents).toHaveLength(3)
    expect(qualityEvents[0].name).toContain("Subthreshold I")
    expect(qualityEvents[1].name).toContain("Subthreshold II")
    expect(qualityEvents[2].name).toContain("Subthreshold III")
  })

  it("returns empty array for all-null weeks", () => {
    expect(buildEvents([null, null, null, null], "2026-06-01")).toHaveLength(0)
  })
})
