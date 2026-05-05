import { describe, it, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Database as BunSQLite } from "bun:sqlite"
import { DatabaseService } from "./Database"
import { ActivitiesService, ActivitiesServiceLive } from "./Activities"
import { up as migration001 } from "../migrations/001_initial"
import { up as migration002 } from "../migrations/002_test_results"
import { up as migration003 } from "../migrations/003_activities"

const makeTestLayer = () => {
  const db = new BunSQLite(":memory:")
  db.exec("PRAGMA foreign_keys = ON")
  migration001(db)
  migration002(db)
  migration003(db)

  // Seed two users
  db.run(
    "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
    "user-1", "user1@test.com", "hash1"
  )
  db.run(
    "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
    "user-2", "user2@test.com", "hash2"
  )

  const TestDatabaseLayer = Layer.sync(DatabaseService, () => ({
    db,
    run: (sql: string, params: any[] = []) =>
      Effect.sync(() => { db.run(sql, ...params) }),
    get: <T>(sql: string, params: any[] = []) =>
      Effect.sync(() => db.query(sql).get(...params) as T | undefined),
    all: <T>(sql: string, params: any[] = []) =>
      Effect.sync(() => db.query(sql).all(...params) as T[]),
  }))

  return { db, layer: ActivitiesServiceLive.pipe(Layer.provide(TestDatabaseLayer)) }
}

const seedActivity = (db: BunSQLite, overrides: Partial<{
  id: string; user_id: string; intervals_id: string; date: string;
  type: string; name: string; distance_m: number; duration_secs: number;
  avg_pace: number; avg_hr: number; moving_time: number;
}> = {}) => {
  const id = overrides.id ?? crypto.randomUUID()
  const user_id = overrides.user_id ?? "user-1"
  const intervals_id = overrides.intervals_id ?? `i-${id}`
  const date = overrides.date ?? "2025-01-15"
  const type = overrides.type ?? "Run"
  const name = overrides.name ?? "Morning Run"
  db.run(
    `INSERT INTO activities (id, user_id, intervals_id, date, type, name, distance_m, duration_secs, avg_pace, avg_hr, moving_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, user_id, intervals_id, date, type, name,
    overrides.distance_m ?? null,
    overrides.duration_secs ?? null,
    overrides.avg_pace ?? null,
    overrides.avg_hr ?? null,
    overrides.moving_time ?? null
  )
}

describe("ActivitiesService", () => {
  it("list returns empty for user with no activities", async () => {
    const { layer } = makeTestLayer()
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const svc = yield* ActivitiesService
        return yield* svc.list("user-1")
      }).pipe(Effect.provide(layer))
    )
    expect(result).toEqual([])
  })

  it("list returns activities ordered by date DESC", async () => {
    const { db, layer } = makeTestLayer()
    seedActivity(db, { id: "a1", date: "2025-01-10" })
    seedActivity(db, { id: "a2", date: "2025-01-20" })
    seedActivity(db, { id: "a3", date: "2025-01-15" })

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const svc = yield* ActivitiesService
        return yield* svc.list("user-1")
      }).pipe(Effect.provide(layer))
    )
    expect(result.map((r) => r.date)).toEqual(["2025-01-20", "2025-01-15", "2025-01-10"])
  })

  it("list with from filter returns only activities on or after that date", async () => {
    const { db, layer } = makeTestLayer()
    seedActivity(db, { id: "a1", date: "2025-01-05" })
    seedActivity(db, { id: "a2", date: "2025-01-10" })
    seedActivity(db, { id: "a3", date: "2025-01-15" })

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const svc = yield* ActivitiesService
        return yield* svc.list("user-1", "2025-01-10")
      }).pipe(Effect.provide(layer))
    )
    expect(result.map((r) => r.date)).toEqual(["2025-01-15", "2025-01-10"])
  })

  it("list with from and to returns activities in range", async () => {
    const { db, layer } = makeTestLayer()
    seedActivity(db, { id: "a1", date: "2025-01-05" })
    seedActivity(db, { id: "a2", date: "2025-01-10" })
    seedActivity(db, { id: "a3", date: "2025-01-15" })
    seedActivity(db, { id: "a4", date: "2025-01-20" })

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const svc = yield* ActivitiesService
        return yield* svc.list("user-1", "2025-01-10", "2025-01-15")
      }).pipe(Effect.provide(layer))
    )
    expect(result.map((r) => r.date)).toEqual(["2025-01-15", "2025-01-10"])
  })

  it("list only returns user's own activities", async () => {
    const { db, layer } = makeTestLayer()
    seedActivity(db, { id: "a1", user_id: "user-1", date: "2025-01-10" })
    seedActivity(db, { id: "a2", user_id: "user-2", date: "2025-01-10", intervals_id: "i-other" })

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const svc = yield* ActivitiesService
        return yield* svc.list("user-1")
      }).pipe(Effect.provide(layer))
    )
    expect(result).toHaveLength(1)
    expect(result[0].user_id).toBe("user-1")
  })
})
