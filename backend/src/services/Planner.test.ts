import { describe, it, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Database as BunSQLite } from "bun:sqlite"
import { DatabaseService } from "./Database"
import { PlannerService, PlannerServiceLive } from "./Planner"
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

const TestLayer = PlannerServiceLive.pipe(Layer.provide(TestDatabaseLayer))

const runTest = <A>(effect: Effect.Effect<A, Error, PlannerService>) =>
  Effect.runPromise(effect.pipe(Effect.provide(TestLayer)))

const sampleData = { week_data: '{"weeks":[]}', default_wu: 10, default_cd: 10 }

describe("PlannerService", () => {
  it("save returns a PlannerResult with correct fields", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const planner = yield* PlannerService
        return yield* planner.save("user-1", sampleData)
      })
    )

    expect(result.id).toBeDefined()
    expect(result.user_id).toBe("user-1")
    expect(result.week_data).toBe('{"weeks":[]}')
    expect(result.default_wu).toBe(10)
    expect(result.default_cd).toBe(10)
    expect(result.name).toBeNull()
    expect(result.created_at).toBeDefined()
  })

  it("save with optional name stores it", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const planner = yield* PlannerService
        return yield* planner.save("user-1", { ...sampleData, name: "My Plan" })
      })
    )

    expect(result.name).toBe("My Plan")
  })

  it("save without name stores null", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const planner = yield* PlannerService
        return yield* planner.save("user-1", sampleData)
      })
    )

    expect(result.name).toBeNull()
  })

  it("list returns all plans for a user, ordered by created_at DESC", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const planner = yield* PlannerService
        yield* planner.save("user-1", { ...sampleData, name: "Plan 1" })
        yield* planner.save("user-1", { ...sampleData, name: "Plan 2" })
        yield* planner.save("user-1", { ...sampleData, name: "Plan 3" })
        return yield* planner.list("user-1")
      })
    )

    expect(result.length).toBeGreaterThanOrEqual(3)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at >= result[i + 1].created_at).toBe(true)
    }
  })

  it("list does NOT return other users' plans", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const planner = yield* PlannerService
        yield* planner.save("user-1", sampleData)
        yield* planner.save("user-2", sampleData)
        return yield* planner.list("user-2")
      })
    )

    expect(result.length).toBe(1)
    expect(result[0].user_id).toBe("user-2")
  })

  it("getById returns the correct plan", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const planner = yield* PlannerService
        const saved = yield* planner.save("user-1", { ...sampleData, name: "Find Me" })
        return yield* planner.getById("user-1", saved.id)
      })
    )

    expect(result).toBeDefined()
    expect(result!.name).toBe("Find Me")
  })

  it("getById returns undefined for non-existent id", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const planner = yield* PlannerService
        return yield* planner.getById("user-1", "non-existent-id")
      })
    )

    expect(result).toBeFalsy()
  })
})
