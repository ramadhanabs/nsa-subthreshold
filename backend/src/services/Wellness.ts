import { Effect, Context, Layer } from "effect"
import { DatabaseService } from "./Database"

export interface WellnessRecord {
  id: string
  user_id: string
  date: string
  resting_hr: number | null
  hrv: number | null
  sleep_hours: number | null
  weight: number | null
  atl: number | null
  ctl: number | null
  tsb: number | null
  source: string
  synced_at: string
}

export class WellnessService extends Context.Tag("WellnessService")<
  WellnessService,
  {
    readonly list: (userId: string, from?: string, to?: string) => Effect.Effect<WellnessRecord[]>
  }
>() {}

export const WellnessServiceLive = Layer.effect(
  WellnessService,
  Effect.gen(function* () {
    const db = yield* DatabaseService

    return {
      list: (userId: string, from?: string, to?: string) => {
        let sql = "SELECT * FROM wellness_data WHERE user_id = ?"
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

        return db.all<WellnessRecord>(sql, params)
      },
    }
  })
)
