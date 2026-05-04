import { Effect, Context, Layer } from "effect"
import { DatabaseService } from "./Database"

interface User {
  id: string
  intervals_icu_athlete_id: string | null
  intervals_icu_api_key: string | null
}

interface IntervalsWellnessEntry {
  id: string
  restingHR?: number | null
  hrv?: number | null
  sleepSecs?: number | null
  weight?: number | null
  atl?: number | null
  ctl?: number | null
  tsb?: number | null
}

export class IntervalsService extends Context.Tag("IntervalsService")<
  IntervalsService,
  {
    readonly connect: (userId: string, athleteId: string, apiKey: string) => Effect.Effect<void, Error>
    readonly syncWellness: (userId: string) => Effect.Effect<number, Error>
  }
>() {}

export const IntervalsServiceLive = Layer.effect(
  IntervalsService,
  Effect.gen(function* () {
    const db = yield* DatabaseService

    return {
      connect: (userId: string, athleteId: string, apiKey: string) =>
        db.run(
          "UPDATE users SET intervals_icu_athlete_id = ?, intervals_icu_api_key = ?, updated_at = datetime('now') WHERE id = ?",
          [athleteId, apiKey, userId]
        ),

      syncWellness: (userId: string) =>
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

          const today = new Date()
          const oldest = new Date(today)
          oldest.setDate(oldest.getDate() - 30)
          const fmt = (d: Date) => d.toISOString().slice(0, 10)

          const url = `https://intervals.icu/api/v1/athlete/${athleteId}/wellness?oldest=${fmt(oldest)}&newest=${fmt(today)}`
          const basicAuth = Buffer.from(`API_KEY:${apiKey}`).toString("base64")

          const entries = yield* Effect.tryPromise({
            try: async () => {
              const resp = await fetch(url, {
                headers: { Authorization: `Basic ${basicAuth}` },
              })
              if (!resp.ok) {
                throw new Error(`Intervals.icu API error: ${resp.status} ${resp.statusText}`)
              }
              return resp.json() as Promise<IntervalsWellnessEntry[]>
            },
            catch: (e) => new Error(`Failed to fetch wellness data: ${e}`),
          })

          let count = 0
          for (const entry of entries) {
            const date = entry.id // Intervals.icu uses date as the id (YYYY-MM-DD)
            const restingHr = entry.restingHR ?? null
            const hrv = entry.hrv ?? null
            const sleepHours = entry.sleepSecs != null ? entry.sleepSecs / 3600 : null
            const weight = entry.weight ?? null
            const atl = entry.atl ?? null
            const ctl = entry.ctl ?? null
            const tsb = entry.tsb ?? null

            yield* db.run(
              `INSERT OR REPLACE INTO wellness_data (id, user_id, date, resting_hr, hrv, sleep_hours, weight, atl, ctl, tsb, source, synced_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'intervals.icu', datetime('now'))`,
              [crypto.randomUUID(), userId, date, restingHr, hrv, sleepHours, weight, atl, ctl, tsb]
            )
            count++
          }

          return count
        }),
    }
  })
)
