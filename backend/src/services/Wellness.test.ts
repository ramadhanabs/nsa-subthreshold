import { describe, it, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Database as BunSQLite } from "bun:sqlite"
import { DatabaseService } from "./Database"
import { WellnessService, WellnessServiceLive, WellnessRecord } from "./Wellness"
import { up as migration001 } from "../migrations/001_initial"

const TestDatabaseLayer = Layer.sync(DatabaseService, () => {
  const db = new BunSQLite(":memory:")
  db.exec("PRAGMA foreign_keys = ON")
  migration001(db)

  // Seed test data
  db.run("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", "user-1", "user1@test.com", "hash")
  db.run("INSERT INTO wellness_data (id, user_id, date, resting_hr, hrv, sleep_hours, weight, atl, ctl, tsb, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    "w1", "user-1", "2026-05-01", 52, 65, 7.5, 70, 45, 60, 15, "intervals_icu")
  db.run("INSERT INTO wellness_data (id, user_id, date, resting_hr, hrv, sleep_hours, weight, atl, ctl, tsb, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    "w2", "user-1", "2026-05-02", 50, 70, 8.0, 70, 48, 62, 14, "intervals_icu")
  db.run("INSERT INTO wellness_data (id, user_id, date, resting_hr, hrv, sleep_hours, weight, atl, ctl, tsb, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    "w3", "user-1", "2026-05-03", 48, 72, 7.0, 69.5, 50, 63, 13, "intervals_icu")

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

const TestLayer = WellnessServiceLive.pipe(Layer.provide(TestDatabaseLayer))

const runTest = <A>(effect: Effect.Effect<A, Error, WellnessService>) =>
  Effect.runPromise(effect.pipe(Effect.provide(TestLayer)))

describe("WellnessService", () => {
  it("list returns all wellness records for user, ordered by date DESC", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const wellness = yield* WellnessService
        return yield* wellness.list("user-1")
      })
    )

    expect(result).toHaveLength(3)
    expect(result[0].date).toBe("2026-05-03")
    expect(result[1].date).toBe("2026-05-02")
    expect(result[2].date).toBe("2026-05-01")
  })

  it("list with from filter only returns records on or after that date", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const wellness = yield* WellnessService
        return yield* wellness.list("user-1", "2026-05-02")
      })
    )

    expect(result).toHaveLength(2)
    expect(result[0].date).toBe("2026-05-03")
    expect(result[1].date).toBe("2026-05-02")
  })

  it("list with to filter only returns records on or before that date", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const wellness = yield* WellnessService
        return yield* wellness.list("user-1", undefined, "2026-05-02")
      })
    )

    expect(result).toHaveLength(2)
    expect(result[0].date).toBe("2026-05-02")
    expect(result[1].date).toBe("2026-05-01")
  })

  it("list with both from and to returns records in range", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const wellness = yield* WellnessService
        return yield* wellness.list("user-1", "2026-05-02", "2026-05-02")
      })
    )

    expect(result).toHaveLength(1)
    expect(result[0].date).toBe("2026-05-02")
    expect(result[0].resting_hr).toBe(50)
  })

  it("list returns empty array for user with no data", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const wellness = yield* WellnessService
        return yield* wellness.list("nonexistent-user")
      })
    )

    expect(result).toHaveLength(0)
    expect(result).toEqual([])
  })
})
