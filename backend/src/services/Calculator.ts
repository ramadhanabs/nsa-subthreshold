import { Effect, Context, Layer } from "effect"
import { DatabaseService } from "./Database"

export interface CalculatorResult {
  id: string
  user_id: string
  input_mode: string
  input_a: number
  input_b: number
  max_hr: number
  created_at: string
}

export class CalculatorService extends Context.Tag("CalculatorService")<
  CalculatorService,
  {
    readonly save: (userId: string, data: { input_mode: string; input_a: number; input_b: number; max_hr: number }) => Effect.Effect<CalculatorResult>
    readonly list: (userId: string) => Effect.Effect<CalculatorResult[]>
    readonly getById: (userId: string, id: string) => Effect.Effect<CalculatorResult | undefined>
  }
>() {}

export const CalculatorServiceLive = Layer.effect(
  CalculatorService,
  Effect.gen(function* () {
    const db = yield* DatabaseService

    return {
      save: (userId: string, data: { input_mode: string; input_a: number; input_b: number; max_hr: number }) =>
        Effect.gen(function* () {
          const id = crypto.randomUUID()
          yield* db.run(
            "INSERT INTO calculator_results (id, user_id, input_mode, input_a, input_b, max_hr) VALUES (?, ?, ?, ?, ?, ?)",
            [id, userId, data.input_mode, data.input_a, data.input_b, data.max_hr]
          )
          const row = yield* db.get<CalculatorResult>(
            "SELECT * FROM calculator_results WHERE id = ?",
            [id]
          )
          return row!
        }),

      list: (userId: string) =>
        db.all<CalculatorResult>(
          "SELECT * FROM calculator_results WHERE user_id = ? ORDER BY created_at DESC",
          [userId]
        ),

      getById: (userId: string, id: string) =>
        db.get<CalculatorResult>(
          "SELECT * FROM calculator_results WHERE user_id = ? AND id = ?",
          [userId, id]
        ),
    }
  })
)
