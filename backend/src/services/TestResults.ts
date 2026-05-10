import { Effect } from "effect"
import { DatabaseService } from "./Database"
import { NotFoundError } from "./Errors"

export interface TestResult {
  id: string
  user_id: string
  test_type: string
  test_date: string
  value_a: number
  value_b: number
  max_hr: number | null
  notes: string | null
  created_at: string
}

export class TestResultsService extends Effect.Service<TestResultsService>()("TestResultsService", {
  effect: Effect.gen(function* () {
    const db = yield* DatabaseService

    return {
      save: (userId: string, data: { test_type: string; test_date: string; value_a: number; value_b: number; max_hr?: number; notes?: string }) =>
        Effect.gen(function* () {
          const id = crypto.randomUUID()
          yield* db.run(
            "INSERT INTO test_results (id, user_id, test_type, test_date, value_a, value_b, max_hr, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [id, userId, data.test_type, data.test_date, data.value_a, data.value_b, data.max_hr ?? null, data.notes ?? null]
          )
          const row = yield* db.get<TestResult>(
            "SELECT * FROM test_results WHERE id = ?",
            [id]
          )
          if (!row) {
            return yield* new NotFoundError({ entity: "TestResult", id })
          }
          return row
        }),

      list: (userId: string) =>
        db.all<TestResult>(
          "SELECT * FROM test_results WHERE user_id = ? ORDER BY test_date DESC",
          [userId]
        ),

      remove: (userId: string, id: string) =>
        Effect.gen(function* () {
          const existing = yield* db.get<TestResult>(
            "SELECT * FROM test_results WHERE user_id = ? AND id = ?",
            [userId, id]
          )
          if (!existing) return false
          yield* db.run(
            "DELETE FROM test_results WHERE user_id = ? AND id = ?",
            [userId, id]
          )
          return true
        }),
    }
  }),
  dependencies: [DatabaseService.Default],
}) {}
