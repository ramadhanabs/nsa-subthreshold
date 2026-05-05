import { describe, it, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Database as BunSQLite } from "bun:sqlite"
import { DatabaseService } from "./Database"
import { TestResultsService, TestResultsServiceLive } from "./TestResults"
import { up as migration001 } from "../migrations/001_initial"
import { up as migration002 } from "../migrations/002_test_results"

const TestDatabaseLayer = Layer.sync(DatabaseService, () => {
  const db = new BunSQLite(":memory:")
  db.exec("PRAGMA foreign_keys = ON")
  migration001(db)
  migration002(db)
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

const TestLayer = TestResultsServiceLive.pipe(Layer.provide(TestDatabaseLayer))

const runTest = <A>(effect: Effect.Effect<A, Error, TestResultsService>) =>
  Effect.runPromise(effect.pipe(Effect.provide(TestLayer)))

const sampleData = { test_type: "5k", test_date: "2026-05-01", value_a: 5, value_b: 1200 }

describe("TestResultsService", () => {
  it("save returns a TestResult with correct fields", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const svc = yield* TestResultsService
        return yield* svc.save("user-1", { ...sampleData, max_hr: 190, notes: "felt good" })
      })
    )

    expect(result.id).toBeDefined()
    expect(result.user_id).toBe("user-1")
    expect(result.test_type).toBe("5k")
    expect(result.test_date).toBe("2026-05-01")
    expect(result.value_a).toBe(5)
    expect(result.value_b).toBe(1200)
    expect(result.max_hr).toBe(190)
    expect(result.notes).toBe("felt good")
    expect(result.created_at).toBeDefined()
  })

  it("list returns results ordered by test_date DESC", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const svc = yield* TestResultsService
        yield* svc.save("user-1", { ...sampleData, test_date: "2026-01-01" })
        yield* svc.save("user-1", { ...sampleData, test_date: "2026-03-01" })
        yield* svc.save("user-1", { ...sampleData, test_date: "2026-02-01" })
        return yield* svc.list("user-1")
      })
    )

    expect(result.length).toBeGreaterThanOrEqual(3)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].test_date >= result[i + 1].test_date).toBe(true)
    }
  })

  it("list only returns the user's own results", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const svc = yield* TestResultsService
        yield* svc.save("user-1", sampleData)
        yield* svc.save("user-2", sampleData)
        return yield* svc.list("user-2")
      })
    )

    expect(result.length).toBe(1)
    expect(result[0].user_id).toBe("user-2")
  })

  it("remove deletes the correct result", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const svc = yield* TestResultsService
        const saved = yield* svc.save("user-1", sampleData)
        const deleted = yield* svc.remove("user-1", saved.id)
        const remaining = yield* svc.list("user-1")
        return { deleted, remaining }
      })
    )

    expect(result.deleted).toBe(true)
    expect(result.remaining.find((r) => r.id === result.deleted)).toBeUndefined()
  })

  it("remove returns false for non-existent id", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const svc = yield* TestResultsService
        return yield* svc.remove("user-1", "non-existent-id")
      })
    )

    expect(result).toBe(false)
  })
})
