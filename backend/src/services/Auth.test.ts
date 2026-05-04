import { describe, it, expect, beforeEach } from "bun:test"
import { Effect, Layer } from "effect"
import { Database as BunSQLite } from "bun:sqlite"
import { DatabaseService, DatabaseServiceLive } from "./Database"
import { AuthService, AuthServiceLive } from "./Auth"
import { up as migration001 } from "../migrations/001_initial"

const TestDatabaseLayer = Layer.sync(DatabaseService, () => {
  const db = new BunSQLite(":memory:")
  db.exec("PRAGMA foreign_keys = ON")
  migration001(db)
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

const TestLayer = AuthServiceLive.pipe(Layer.provide(TestDatabaseLayer))

const runTest = <A>(effect: Effect.Effect<A, Error, AuthService>) =>
  Effect.runPromise(effect.pipe(Effect.provide(TestLayer)))

describe("AuthService", () => {
  it("register returns id, email, and token", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const auth = yield* AuthService
        return yield* auth.register("test-register@example.com", "password123")
      })
    )

    expect(result.id).toBeDefined()
    expect(result.email).toBe("test-register@example.com")
    expect(result.token).toBeDefined()
    expect(typeof result.token).toBe("string")
  })

  it("login with correct password returns token", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const auth = yield* AuthService
        yield* auth.register("test-login@example.com", "password123")
        return yield* auth.login("test-login@example.com", "password123")
      })
    )

    expect(result.id).toBeDefined()
    expect(result.email).toBe("test-login@example.com")
    expect(result.token).toBeDefined()
  })

  it("login with wrong password fails", async () => {
    const promise = runTest(
      Effect.gen(function* () {
        const auth = yield* AuthService
        yield* auth.register("test-wrongpw@example.com", "password123")
        return yield* auth.login("test-wrongpw@example.com", "wrongpassword")
      })
    )

    await expect(promise).rejects.toThrow("Invalid email or password")
  })

  it("register duplicate email fails", async () => {
    const promise = runTest(
      Effect.gen(function* () {
        const auth = yield* AuthService
        yield* auth.register("test-dup@example.com", "password123")
        return yield* auth.register("test-dup@example.com", "password456")
      })
    )

    await expect(promise).rejects.toThrow("Email already registered")
  })

  it("verify valid token returns id and email", async () => {
    const result = await runTest(
      Effect.gen(function* () {
        const auth = yield* AuthService
        const { token } = yield* auth.register("test-verify@example.com", "password123")
        return yield* auth.verify(token)
      })
    )

    expect(result.id).toBeDefined()
    expect(result.email).toBe("test-verify@example.com")
  })

  it("verify invalid token fails", async () => {
    const promise = runTest(
      Effect.gen(function* () {
        const auth = yield* AuthService
        return yield* auth.verify("invalid-token")
      })
    )

    await expect(promise).rejects.toThrow("Invalid token")
  })
})
