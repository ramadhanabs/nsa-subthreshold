import type { DaySlotData } from "./planner-data"
import {
  totalSessionMin,
  estimateQualityLoad as _estimateQualityLoad,
  estimateEasyLoad as _estimateEasyLoad,
  toIntervalsWorkout as _toIntervalsWorkout,
  toEasyRunWorkout as _toEasyRunWorkout,
} from "./planner-data"
import type { WeekPlan, WeekSummary, BlockEvent } from "./block-types"

const ROMAN = ["I", "II", "III", "IV"]

/** Generate an Intervals.icu event name for a workout. */
export function generateEventName(
  workoutType: string,
  templateName: string,
  qIndex: number,
  durationMin?: number,
): string {
  if (workoutType.startsWith("quality_")) {
    const cat = workoutType.replace("quality_", "")
    const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1)
    return `Subthreshold ${ROMAN[qIndex]} (${catLabel} — ${templateName})`
  }
  if (workoutType === "easy") return `Easy Run (${durationMin}min)`
  if (workoutType === "long_run") return `Long Run (${durationMin}min)`
  if (workoutType === "test_5k") return "5K Time Trial"
  if (workoutType === "test_20min") return "20min Threshold Test"
  if (workoutType === "rest") return "Rest"
  return templateName
}

/** Determine the workout_type string from a DaySlotData. */
function getWorkoutType(slot: DaySlotData): string {
  if (slot.type === "quality" && slot.template) {
    const id = slot.template.id
    if (id === "t1") return "test_5k"
    if (id === "t2") return "test_20min"
    if (id.startsWith("s")) return "quality_short"
    if (id.startsWith("m")) return "quality_medium"
    if (id.startsWith("l")) return "quality_long"
    return "quality_short"
  }
  if (slot.type === "easy") return "easy"
  if (slot.type === "long") return "long_run"
  if (slot.type === "rest") return "rest"
  return "rest"
}

/** Compute a WeekSummary from an array of DaySlotData. */
export function computeWeekSummary(
  days: DaySlotData[],
  wu: number,
  cd: number,
  easyInputs?: Record<string, number>,
  longMin?: number,
): WeekSummary {
  let totalDurationMin = 0
  let qualityDurationMin = 0
  let numQualitySessions = 0
  let estimatedLoad = 0

  for (const day of days) {
    if (!day.type || day.type === "rest") continue

    if (day.type === "quality" && day.template) {
      const sessionDur = totalSessionMin(day.template, wu, cd)
      totalDurationMin += sessionDur
      qualityDurationMin += day.template.vol
      numQualitySessions++
      estimatedLoad += _estimateQualityLoad(day.template, wu, cd)
    } else if (day.type === "easy") {
      const dur = easyInputs?.[day.day] ?? 40
      totalDurationMin += dur
      estimatedLoad += _estimateEasyLoad(dur)
    } else if (day.type === "long") {
      const dur = longMin ?? 75
      totalDurationMin += dur
      estimatedLoad += _estimateEasyLoad(dur)
    }
  }

  const qualityPercentage =
    totalDurationMin > 0
      ? Math.round((qualityDurationMin / totalDurationMin) * 100)
      : 0

  return {
    totalDurationMin: Math.round(totalDurationMin),
    qualityDurationMin,
    qualityPercentage,
    numQualitySessions,
    estimatedLoad,
  }
}

/** Add days to a YYYY-MM-DD date string. */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Flatten WeekPlan[] into BlockEvent[] with computed dates and workout docs. */
export function buildEvents(
  weeks: (WeekPlan | null)[],
  blockStartDate: string,
): Omit<BlockEvent, "id" | "blockId">[] {
  const events: Omit<BlockEvent, "id" | "blockId">[] = []

  for (let weekIdx = 0; weekIdx < weeks.length; weekIdx++) {
    const week = weeks[weekIdx]
    if (!week) continue

    const wu = week.defaultWu
    const cd = week.defaultCd
    let qIndex = 0

    for (let dayIdx = 0; dayIdx < week.days.length; dayIdx++) {
      const slot = week.days[dayIdx]
      if (!slot.type || slot.type === "rest") continue

      const dateStr = addDays(blockStartDate, weekIdx * 7 + dayIdx)
      const workoutType = getWorkoutType(slot)
      const templateName = slot.template?.name ?? ""

      if (slot.type === "quality" && slot.template) {
        const durationMin = Math.round(totalSessionMin(slot.template, wu, cd))
        const workoutDoc = _toIntervalsWorkout(slot.template, wu, cd)
        const name = generateEventName(workoutType, templateName, qIndex, durationMin)

        events.push({
          date: dateStr,
          weekNumber: week.weekNumber,
          workoutType,
          name,
          durationMinutes: durationMin,
          workoutDoc,
        })
        qIndex++
      } else if (slot.type === "easy") {
        const dur = week.easyInputs?.[slot.day] ?? 40
        const workoutDoc = _toEasyRunWorkout(dur, false)
        const name = generateEventName(workoutType, templateName, qIndex, dur)

        events.push({
          date: dateStr,
          weekNumber: week.weekNumber,
          workoutType,
          name,
          durationMinutes: dur,
          workoutDoc,
        })
      } else if (slot.type === "long") {
        const dur = week.longMin ?? 75
        const workoutDoc = _toEasyRunWorkout(dur, true)
        const name = generateEventName("long_run", templateName, qIndex, dur)

        events.push({
          date: dateStr,
          weekNumber: week.weekNumber,
          workoutType: "long_run",
          name,
          durationMinutes: dur,
          workoutDoc,
        })
      }
    }
  }

  return events
}
