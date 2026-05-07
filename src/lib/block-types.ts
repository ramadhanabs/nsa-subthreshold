import type { DaySlotData } from "./planner-data"
import type { EligibilityTier } from "./budget"

export interface AssessmentResult {
  weeklyAvgVolumeHours: number
  weeklyAvgDistanceKm: number
  weeklyAvgFrequency: number
  ctl: number
  ctlTrend: "rising" | "stable" | "declining"
  tsb: number
  volumeCV: number
  readiness: "ready" | "not_ready"
  flags: string[]
  recommendedQSessions: number
  maxQVolumeMin: number
  tier: EligibilityTier
  tierLabel: string
}

export interface WeekSummary {
  totalDurationMin: number
  qualityDurationMin: number
  qualityPercentage: number
  numQualitySessions: number
  estimatedLoad: number
}

export interface WeekPlan {
  weekNumber: 1 | 2 | 3 | 4
  weekType: "build" | "deload"
  startDate: string
  days: DaySlotData[]
  summary: WeekSummary
  defaultWu: number
  defaultCd: number
  easyInputs?: Record<string, number>
  longMin?: number
}

export type BlockStatus = "draft" | "confirmed" | "pushed" | "completed"

export interface BlockPlan {
  id: string
  createdAt: string
  updatedAt: string
  status: BlockStatus
  startDate: string
  endDate: string
  assessment: AssessmentResult
  weeks: [WeekPlan | null, WeekPlan | null, WeekPlan | null, WeekPlan | null]
  icuSync?: {
    pushedAt: string
    pushMode: "override" | "add_alongside"
    eventIds: string[]
  }
}

export interface BlockEvent {
  id: string
  blockId: string
  date: string
  weekNumber: number
  workoutType: string
  name: string
  durationMinutes?: number
  distanceMeters?: number
  workoutDoc?: object
  icuEventId?: string
  notes?: string
}
