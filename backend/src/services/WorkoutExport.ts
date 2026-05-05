import { Effect, Context, Layer } from "effect"
import { DatabaseService } from "./Database"

interface User {
  id: string
  intervals_icu_athlete_id: string | null
  intervals_icu_api_key: string | null
}

interface DayData {
  day: string
  type: "quality" | "easy" | "long" | "rest" | null
  template: { name: string; reps: number; dur: number; rest: number; vol: number } | null
}

export interface ExportRequest {
  week_data: DayData[]
  start_date: string // YYYY-MM-DD (Monday)
  default_wu: number
  default_cd: number
}

export class WorkoutExportService extends Context.Tag("WorkoutExportService")<
  WorkoutExportService,
  {
    readonly exportWeek: (userId: string, request: ExportRequest) => Effect.Effect<number, Error>
  }
>() {}

export const WorkoutExportServiceLive = Layer.effect(
  WorkoutExportService,
  Effect.gen(function* () {
    const db = yield* DatabaseService

    return {
      exportWeek: (userId: string, request: ExportRequest) =>
        Effect.gen(function* () {
          const user = yield* db.get<User>(
            "SELECT id, intervals_icu_athlete_id, intervals_icu_api_key FROM users WHERE id = ?",
            [userId]
          )
          if (!user || !user.intervals_icu_athlete_id || !user.intervals_icu_api_key) {
            return yield* Effect.fail(new Error("Intervals.icu not connected. Call /api/intervals/connect first."))
          }

          const athleteId = user.intervals_icu_athlete_id
          const apiKey = user.intervals_icu_api_key
          const basicAuth = Buffer.from(`API_KEY:${apiKey}`).toString("base64")

          const { week_data, start_date, default_wu, default_cd } = request
          let exported = 0

          for (let i = 0; i < week_data.length; i++) {
            const day = week_data[i]
            if (!day.type || day.type === "rest") continue

            // Calculate date: start_date + i days
            const date = new Date(start_date)
            date.setDate(date.getDate() + i)
            const dateStr = date.toISOString().slice(0, 10)

            let name: string
            let description: string

            if (day.type === "quality" && day.template) {
              const t = day.template
              const totalMin = Math.round(
                default_wu + default_cd + t.vol + (t.reps - 1) * (t.rest / 60)
              )
              name = `NSA: ${t.name} sub-T`
              description = [
                `WU ${default_wu}min easy pace`,
                `${t.reps}\u00d7${t.dur}min @ sub-threshold (${t.rest}s rest)`,
                `CD ${default_cd}min easy pace`,
                `Total: ~${totalMin}min`,
              ].join("\n")
            } else if (day.type === "easy") {
              name = "Easy run"
              description = "Easy run ~40min\nBelow 70% max HR"
            } else {
              // long
              name = "Long run"
              description = "Long run ~75min\nEasy pace throughout"
            }

            const url = `https://intervals.icu/api/v1/athlete/${athleteId}/events`

            yield* Effect.tryPromise({
              try: async () => {
                const resp = await fetch(url, {
                  method: "POST",
                  headers: {
                    Authorization: `Basic ${basicAuth}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    start_date_local: dateStr,
                    category: "WORKOUT",
                    name,
                    description,
                    type: "Run",
                  }),
                })
                if (!resp.ok) {
                  throw new Error(`Intervals.icu API error: ${resp.status} ${resp.statusText}`)
                }
                return resp.json()
              },
              catch: (e) => new Error(`Failed to export workout: ${e}`),
            })

            exported++
          }

          return exported
        }),
    }
  })
)
