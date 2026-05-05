import { Effect, Context, Layer } from "effect"
import { DatabaseService } from "./Database"

interface User {
  id: string
  intervals_icu_athlete_id: string | null
  intervals_icu_api_key: string | null
}

interface IntervalsActivity {
  id: string
  start_date_local: string
  type?: string
  name?: string
  distance?: number | null
  elapsed_time?: number | null
  average_speed?: number | null
  average_heartrate?: number | null
  moving_time?: number | null
}

export interface ActivityRecord {
  id: string
  user_id: string
  intervals_id: string
  date: string
  type: string
  name: string | null
  distance_m: number | null
  duration_secs: number | null
  avg_pace: number | null
  avg_hr: number | null
  moving_time: number | null
  synced_at: string
}

export class ActivitiesService extends Context.Tag("ActivitiesService")<
  ActivitiesService,
  {
    readonly sync: (userId: string, from: string, to: string) => Effect.Effect<number, Error>
    readonly list: (userId: string, from?: string, to?: string) => Effect.Effect<ActivityRecord[]>
  }
>() {}

export const ActivitiesServiceLive = Layer.effect(
  ActivitiesService,
  Effect.gen(function* () {
    const db = yield* DatabaseService

    return {
      sync: (userId: string, from: string, to: string) =>
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

          const url = `https://intervals.icu/api/v1/athlete/${athleteId}/activities?oldest=${from}&newest=${to}`
          const basicAuth = Buffer.from(`API_KEY:${apiKey}`).toString("base64")

          const entries = yield* Effect.tryPromise({
            try: async () => {
              const resp = await fetch(url, {
                headers: { Authorization: `Basic ${basicAuth}` },
              })
              if (!resp.ok) {
                throw new Error(`Intervals.icu API error: ${resp.status} ${resp.statusText}`)
              }
              return resp.json() as Promise<IntervalsActivity[]>
            },
            catch: (e) => new Error(`Failed to fetch activities: ${e}`),
          })

          let count = 0
          for (const entry of entries) {
            const intervalsId = entry.id
            const date = entry.start_date_local
            const type = entry.type ?? "Run"
            const name = entry.name ?? null
            const distanceM = entry.distance ?? null
            const durationSecs = entry.elapsed_time ?? null
            const avgPace = entry.average_speed != null && entry.average_speed > 0
              ? 1000 / entry.average_speed
              : null
            const avgHr = entry.average_heartrate ?? null
            const movingTime = entry.moving_time ?? null

            yield* db.run(
              `INSERT OR REPLACE INTO activities (id, user_id, intervals_id, date, type, name, distance_m, duration_secs, avg_pace, avg_hr, moving_time, synced_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
              [crypto.randomUUID(), userId, intervalsId, date, type, name, distanceM, durationSecs, avgPace, avgHr, movingTime]
            )
            count++
          }

          return count
        }),

      list: (userId: string, from?: string, to?: string) => {
        let sql = "SELECT * FROM activities WHERE user_id = ?"
        const params: any[] = [userId]

        if (from) {
          sql += " AND date >= ?"
          params.push(from)
        }
        if (to) {
          sql += " AND date <= ?"
          params.push(to)
        }

        sql += " ORDER BY date DESC"

        return db.all<ActivityRecord>(sql, params)
      },
    }
  })
)
