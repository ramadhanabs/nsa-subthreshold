import { Effect, Context, Layer } from "effect"
import { DatabaseService } from "./Database"

export interface BlockRow {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  status: string
  start_date: string
  end_date: string
  block_type: string
  assessment: string
  weeks: string
  icu_sync: string | null
  results: string | null
}

export interface BlockEventRow {
  id: string
  block_id: string
  date: string
  week_number: number
  workout_type: string
  name: string
  duration_minutes: number | null
  distance_meters: number | null
  workout_doc: string | null
  icu_event_id: string | null
  notes: string | null
}

export interface SaveBlockRequest {
  start_date: string
  end_date: string
  block_type: string
  status: string
  assessment: object
  weeks: object
  events: Array<{
    date: string
    week_number: number
    workout_type: string
    name: string
    duration_minutes?: number
    distance_meters?: number
    workout_doc?: object
    notes?: string
  }>
}

export interface BlockWithEvents extends BlockRow {
  events: BlockEventRow[]
}

export class BlockService extends Context.Tag("BlockService")<
  BlockService,
  {
    readonly save: (userId: string, data: SaveBlockRequest) => Effect.Effect<BlockRow>
    readonly list: (userId: string) => Effect.Effect<BlockRow[]>
    readonly getById: (userId: string, id: string) => Effect.Effect<BlockWithEvents | undefined>
    readonly updateStatus: (userId: string, id: string, status: string) => Effect.Effect<void>
    readonly setSyncData: (userId: string, id: string, syncData: object) => Effect.Effect<void>
    readonly delete: (userId: string, id: string) => Effect.Effect<void>
  }
>() {}

export const BlockServiceLive = Layer.effect(
  BlockService,
  Effect.gen(function* () {
    const db = yield* DatabaseService

    return {
      save: (userId: string, data: SaveBlockRequest) =>
        Effect.gen(function* () {
          const id = crypto.randomUUID()
          const now = new Date().toISOString()
          yield* db.run(
            `INSERT INTO nsa_blocks (id, user_id, created_at, updated_at, status, start_date, end_date, block_type, assessment, weeks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, userId, now, now, data.status, data.start_date, data.end_date, data.block_type, JSON.stringify(data.assessment), JSON.stringify(data.weeks)]
          )

          for (const event of data.events) {
            const eventId = crypto.randomUUID()
            yield* db.run(
              `INSERT INTO nsa_block_events (id, block_id, date, week_number, workout_type, name, duration_minutes, distance_meters, workout_doc, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [eventId, id, event.date, event.week_number, event.workout_type, event.name, event.duration_minutes ?? null, event.distance_meters ?? null, event.workout_doc ? JSON.stringify(event.workout_doc) : null, event.notes ?? null]
            )
          }

          const row = yield* db.get<BlockRow>(
            "SELECT * FROM nsa_blocks WHERE id = ?",
            [id]
          )
          return row!
        }),

      list: (userId: string) =>
        db.all<BlockRow>(
          "SELECT * FROM nsa_blocks WHERE user_id = ? ORDER BY created_at DESC",
          [userId]
        ),

      getById: (userId: string, id: string) =>
        Effect.gen(function* () {
          const block = yield* db.get<BlockRow>(
            "SELECT * FROM nsa_blocks WHERE user_id = ? AND id = ?",
            [userId, id]
          )
          if (!block) return undefined

          const events = yield* db.all<BlockEventRow>(
            "SELECT * FROM nsa_block_events WHERE block_id = ? ORDER BY date ASC, week_number ASC",
            [id]
          )
          return { ...block, events }
        }),

      updateStatus: (userId: string, id: string, status: string) =>
        db.run(
          "UPDATE nsa_blocks SET status = ?, updated_at = ? WHERE user_id = ? AND id = ?",
          [status, new Date().toISOString(), userId, id]
        ),

      setSyncData: (userId: string, id: string, syncData: object) =>
        db.run(
          "UPDATE nsa_blocks SET icu_sync = ?, status = 'pushed', updated_at = ? WHERE user_id = ? AND id = ?",
          [JSON.stringify(syncData), new Date().toISOString(), userId, id]
        ),

      delete: (userId: string, id: string) =>
        db.run(
          "DELETE FROM nsa_blocks WHERE user_id = ? AND id = ?",
          [userId, id]
        ),
    }
  })
)
