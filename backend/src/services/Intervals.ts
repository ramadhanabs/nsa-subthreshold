import { Effect } from "effect"
import { DatabaseService } from "./Database"
import { IntervalsNotConnected, IntervalsApiError } from "./Errors"
import { encrypt, decrypt, isEncrypted } from "./Crypto"

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

export class IntervalsService extends Effect.Service<IntervalsService>()("IntervalsService", {
  effect: Effect.gen(function* () {
    const db = yield* DatabaseService

    return {
      connect: (userId: string, athleteId: string, apiKey: string) =>
        db.run(
          "UPDATE users SET intervals_icu_athlete_id = ?, intervals_icu_api_key = ?, updated_at = datetime('now') WHERE id = ?",
          [athleteId, encrypt(apiKey), userId]
        ),

      syncWellness: (userId: string) =>
        Effect.gen(function* () {
          const user = yield* db.get<User>(
            "SELECT id, intervals_icu_athlete_id, intervals_icu_api_key FROM users WHERE id = ?",
            [userId]
          )
          if (!user || !user.intervals_icu_athlete_id || !user.intervals_icu_api_key) {
            return yield* new IntervalsNotConnected()
          }

          const athleteId = user.intervals_icu_athlete_id
          const rawKey = user.intervals_icu_api_key!
          const apiKey = isEncrypted(rawKey) ? decrypt(rawKey) : rawKey

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
                throw { status: resp.status, message: `${resp.status} ${resp.statusText}` }
              }
              return resp.json() as Promise<IntervalsWellnessEntry[]>
            },
            catch: (e: any) =>
              e?.status
                ? new IntervalsApiError({ status: e.status, message: e.message })
                : new IntervalsApiError({ status: 0, message: `Failed to fetch wellness data: ${e}` }),
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

      getSportSettings: (userId: string) =>
        Effect.gen(function* () {
          const user = yield* db.get<User>(
            "SELECT id, intervals_icu_athlete_id, intervals_icu_api_key FROM users WHERE id = ?",
            [userId]
          )
          if (!user || !user.intervals_icu_athlete_id || !user.intervals_icu_api_key) {
            return yield* new IntervalsNotConnected()
          }

          const athleteId = user.intervals_icu_athlete_id
          const rawKey = user.intervals_icu_api_key!
          const apiKey = isEncrypted(rawKey) ? decrypt(rawKey) : rawKey
          const basicAuth = Buffer.from(`API_KEY:${apiKey}`).toString("base64")

          const url = `https://intervals.icu/api/v1/athlete/${athleteId}`
          const data = yield* Effect.tryPromise({
            try: async () => {
              const resp = await fetch(url, {
                headers: { Authorization: `Basic ${basicAuth}` },
              })
              if (!resp.ok) {
                throw { status: resp.status, message: `${resp.status} ${resp.statusText}` }
              }
              return resp.json() as Promise<{ sportSettings: any[]; icu_weight: number | null }>
            },
            catch: (e: any) =>
              e?.status
                ? new IntervalsApiError({ status: e.status, message: e.message })
                : new IntervalsApiError({ status: 0, message: `Failed to fetch athlete data: ${e}` }),
          })

          // Find running sport settings
          const runSettings = data.sportSettings?.find((s: any) =>
            s.types?.includes("Run")
          )

          return {
            weight: data.icu_weight,
            run: runSettings ? {
              ftp: runSettings.ftp as number | null,
              criticalPower: runSettings.mmp_model?.criticalPower as number | null,
              wPrime: runSettings.mmp_model?.wPrime as number | null,
              pMax: runSettings.mmp_model?.pMax as number | null,
              eFtp: runSettings.mmp_model?.ftp as number | null,
              lthr: runSettings.lthr as number | null,
              maxHr: runSettings.max_hr as number | null,
              thresholdPace: runSettings.threshold_pace as number | null,
              powerZones: runSettings.power_zones as number[] | null,
              powerZoneNames: runSettings.power_zone_names as string[] | null,
              hrZones: runSettings.hr_zones as number[] | null,
              hrZoneNames: runSettings.hr_zone_names as string[] | null,
              paceZones: runSettings.pace_zones as number[] | null,
              paceZoneNames: runSettings.pace_zone_names as string[] | null,
            } : null,
          }
        }),
    }
  }),
  dependencies: [DatabaseService.Default],
}) {}
