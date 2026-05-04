import { describe, it, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Database as BunSQLite } from "bun:sqlite"
import { DatabaseService } from "./Database"
import { CalculatorService, CalculatorServiceLive } from "./Calculator"
import { up as migration001 } from "../migrations/001_initial"

const TestDatabaseLayer = Layer.sync(DatabaseService, () => {
  const db = new BunSQLite(":memory:")
  db.exec("PRAGMA foreign_keys = ON")
  migration001(db)
  db.run("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", "user-1", "user1@test.com", "hash")
  db.run("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", "user-2", "user2@test.com", "hash")
  return {
    db,
    run: (sql: string, params: any[] = []) =>
      Effect.sync(() => { db.run(sql, ...params) }),
    get: <T>(sql: string, params: any[] = []) =>
      Effect.sync(() => db.query(sql).get(...params) as T | undefined),
    all: <T>(sql: string, params: any[] = []) =>
      Effect.sync(() => db.query(sql).all(...params) as T[]),
  }
})

const TestLayer = CalculatorServiceLive.pipe(Layer.provide(TestDatabaseLayer))

const runTest = <A>(effect: Effect.Effect<A, Error, CalculatorService>) =>
  Effect.runPromise(effect.pipe(Effect.provide(TestLayer)))

const sampleData = { input_mode: "5k", input_a: 5, input_b: 1200, max_hr: 190 }

describe("CalculatorService", () => {
  it("save returns a CalculatorResult with correct fields", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const calc = yield* CalculatorService
        return yield* calc.save("user-1", sampleData)
      })
    )

    expect(result.id).toBeDefined()
    expect(result.user_id).toBe("user-1")
    expect(result.input_mode).toBe("5k")
    expect(result.input_a).toBe(5)
    expect(result.input_b).toBe(1200)
    expect(result.max_hr).toBe(190)
    expect(result.created_at).toBeDefined()
  })

  it("save generates a unique id", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const calc = yield* CalculatorService
        const r1 = yield* calc.save("user-1", sampleData)
        const r2 = yield* calc.save("user-1", sampleData)
        return { r1, r2 }
      })
    )

    expect(result.r1.id).not.toBe(result.r2.id)
  })

  it("list returns all results for a user, ordered by created_at DESC", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const calc = yield* CalculatorService
        yield* calc.save("user-1", { ...sampleData, input_a: 1 })
        yield* calc.save("user-1", { ...sampleData, input_a: 2 })
        yield* calc.save("user-1", { ...sampleData, input_a: 3 })
        return yield* calc.list("user-1")
      })
    )

    expect(result.length).toBeGreaterThanOrEqual(3)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at >= result[i + 1].created_at).toBe(true)
    }
  })

  it("list returns empty array for user with no results", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const calc = yield* CalculatorService
        return yield* calc.list("user-2")
      })
    )

    expect(result).toEqual([])
  })

  it("list does NOT return other users' results", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const calc = yield* CalculatorService
        yield* calc.save("user-1", sampleData)
        yield* calc.save("user-2", sampleData)
        return yield* calc.list("user-2")
      })
    )

    expect(result.length).toBe(1)
    expect(result[0].user_id).toBe("user-2")
  })

  it("getById returns the correct result", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const calc = yield* CalculatorService
        const saved = yield* calc.save("user-1", sampleData)
        return yield* calc.getById("user-1", saved.id)
      })
    )

    expect(result).toBeDefined()
    expect(result!.input_mode).toBe("5k")
  })

  it("getById returns undefined for non-existent id", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const calc = yield* CalculatorService
        return yield* calc.getById("user-1", "non-existent-id")
      })
    )

    expect(result).toBeFalsy()
  })

  it("getById returns undefined for another user's result", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const calc = yield* CalculatorService
        const saved = yield* calc.save("user-1", sampleData)
        return yield* calc.getById("user-2", saved.id)
      })
    )

    expect(result).toBeFalsy()
  })
})
