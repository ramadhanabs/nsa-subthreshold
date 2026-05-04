import { describe, it, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Database as BunSQLite } from "bun:sqlite"
import { DatabaseService } from "./Database"
import { IntervalsService, IntervalsServiceLive } from "./Intervals"
import { up as migration001 } from "../migrations/001_initial"

const TestDatabaseLayer = Layer.sync(DatabaseService, () => {
  const db = new BunSQLite(":memory:")
  db.exec("PRAGMA foreign_keys = ON")
  migration001(db)

  // Seed test user
  db.run("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", "user-1", "user1@test.com", "hash")

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

const TestLayer = Layer.merge(
  TestDatabaseLayer,
  IntervalsServiceLive.pipe(Layer.provide(TestDatabaseLayer))
)

const runTest = <A>(effect: Effect.Effect<A, Error, IntervalsService | DatabaseService>) =>
  Effect.runPromise(effect.pipe(Effect.provide(TestLayer)))

describe("IntervalsService", () => {
  it("connect saves athlete_id and api_key to user record", async () => {
    await runTest(
      Effect.gen(function* () {
        const intervals = yield* IntervalsService
        yield* intervals.connect("user-1", "i12345", "key-abc")

        const db = yield* DatabaseService
        const user = yield* db.get<{ intervals_icu_athlete_id: string; intervals_icu_api_key: string }>(
          "SELECT intervals_icu_athlete_id, intervals_icu_api_key FROM users WHERE id = ?",
          ["user-1"]
        )

        expect(user).toBeDefined()
        expect(user!.intervals_icu_athlete_id).toBe("i12345")
        expect(user!.intervals_icu_api_key).toBe("key-abc")
      })
    )
  })

  it("syncWellness fails with error if user hasn't connected Intervals.icu", async () => {
    const promise = runTest(
      Effect.gen(function* () {
        const intervals = yield* IntervalsService
        return yield* intervals.syncWellness("user-1")
      })
    )

    await expect(promise).rejects.toThrow("Intervals.icu not connected")
  })

  it("syncWellness fails with error for non-existent user", async () => {
    const promise = runTest(
      Effect.gen(function* () {
        const intervals = yield* IntervalsService
        return yield* intervals.syncWellness("nonexistent-user")
      })
    )

    await expect(promise).rejects.toThrow("Intervals.icu not connected")
  })
})
