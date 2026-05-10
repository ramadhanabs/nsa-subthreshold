import { Effect } from "effect"
import { DatabaseService } from "./Database"
import { NotFoundError } from "./Errors"

export interface PlannerResult {
  id: string
  user_id: string
  week_data: string
  default_wu: number
  default_cd: number
  name: string | null
  created_at: string
}

export class PlannerService extends Effect.Service<PlannerService>()("PlannerService", {
  effect: Effect.gen(function* () {
    const db = yield* DatabaseService

    return {
      save: (userId: string, data: { week_data: string; default_wu: number; default_cd: number; name?: string }) =>
        Effect.gen(function* () {
          const id = crypto.randomUUID()
          yield* db.run(
            "INSERT INTO planner_results (id, user_id, week_data, default_wu, default_cd, name) VALUES (?, ?, ?, ?, ?, ?)",
            [id, userId, data.week_data, data.default_wu, data.default_cd, data.name ?? null]
          )
          const row = yield* db.get<PlannerResult>(
            "SELECT * FROM planner_results WHERE id = ?",
            [id]
          )
          if (!row) {
            return yield* new NotFoundError({ entity: "PlannerResult", id })
          }
          return row
        }),

      list: (userId: string) =>
        db.all<PlannerResult>(
          "SELECT * FROM planner_results WHERE user_id = ? ORDER BY created_at DESC",
          [userId]
        ),

      getById: (userId: string, id: string) =>
        db.get<PlannerResult>(
          "SELECT * FROM planner_results WHERE user_id = ? AND id = ?",
          [userId, id]
        ),
    }
  }),
  dependencies: [DatabaseService.Default],
}) {}
