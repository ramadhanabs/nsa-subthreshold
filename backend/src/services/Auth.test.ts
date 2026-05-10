import { describe, it, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Database as BunSQLite } from "bun:sqlite"
import { DatabaseService } from "./Database"
import { AuthService } from "./Auth"
import { up as migration001 } from "../migrations/001_initial"
import { up as migration005 } from "../migrations/005_admin"

const makeTestEnv = () => {
  const db = new BunSQLite(":memory:")
  db.exec("PRAGMA foreign_keys = ON")
  migration001(db)
  migration005(db)

  const dbLayer = Layer.sync(DatabaseService, () => ({
    db,
    run: (sql: string, params: any[] = []) =>
      Effect.sync(() => { db.run(sql, ...params) }),
    get: <T>(sql: string, params: any[] = []) =>
      Effect.sync(() => db.query(sql).get(...params) as T | undefined),
    all: <T>(sql: string, params: any[] = []) =>
      Effect.sync(() => db.query(sql).all(...params) as T[]),
  }))

  // Provide our test DB to AuthService instead of letting it use DatabaseService.Default
  const layer = Layer.provide(AuthService.Default, dbLayer)

  return { db, layer }
}

describe("AuthService", () => {
  it("login with correct password returns token", async () => {
    const { db, layer } = makeTestEnv()
    const hash = await Bun.password.hash("password123")
    db.run("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", "u1", "test-login@example.com", hash)

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const auth = yield* AuthService
        return yield* auth.login("test-login@example.com", "password123")
      }).pipe(Effect.provide(layer))
    )
    expect(result.id).toBe("u1")
    expect(result.email).toBe("test-login@example.com")
    expect(result.token).toBeDefined()
  })

  it("login with wrong password fails", async () => {
    const { db, layer } = makeTestEnv()
    const hash = await Bun.password.hash("password123")
    db.run("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", "u2", "test@example.com", hash)

    const promise = Effect.runPromise(
      Effect.gen(function* () {
        const auth = yield* AuthService
        return yield* auth.login("test@example.com", "wrongpassword")
      }).pipe(Effect.provide(layer))
    )
    await expect(promise).rejects.toThrow()
  })

  it("login with nonexistent email fails", async () => {
    const { layer } = makeTestEnv()
    const promise = Effect.runPromise(
      Effect.gen(function* () {
        const auth = yield* AuthService
        return yield* auth.login("nobody@example.com", "password123")
      }).pipe(Effect.provide(layer))
    )
    await expect(promise).rejects.toThrow()
  })

  it("verify valid token returns id and email", async () => {
    const { db, layer } = makeTestEnv()
    const hash = await Bun.password.hash("password123")
    db.run("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", "u3", "test-verify@example.com", hash)

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const auth = yield* AuthService
        const { token } = yield* auth.login("test-verify@example.com", "password123")
        return yield* auth.verify(token)
      }).pipe(Effect.provide(layer))
    )
    expect(result.id).toBe("u3")
    expect(result.email).toBe("test-verify@example.com")
  })

  it("verify invalid token fails", async () => {
    const { layer } = makeTestEnv()
    const promise = Effect.runPromise(
      Effect.gen(function* () {
        const auth = yield* AuthService
        return yield* auth.verify("invalid-token")
      }).pipe(Effect.provide(layer))
    )
    await expect(promise).rejects.toThrow()
  })

  it("changePassword works with correct current password", async () => {
    const { db, layer } = makeTestEnv()
    const hash = await Bun.password.hash("oldpass123")
    db.run("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", "u4", "test-cp@example.com", hash)

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const auth = yield* AuthService
        return yield* auth.changePassword("u4", "oldpass123", "newpass456")
      }).pipe(Effect.provide(layer))
    )
    expect(result.ok).toBe(true)
  })

  it("changePassword fails with wrong current password", async () => {
    const { db, layer } = makeTestEnv()
    const hash = await Bun.password.hash("oldpass123")
    db.run("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", "u5", "test-cp2@example.com", hash)

    const promise = Effect.runPromise(
      Effect.gen(function* () {
        const auth = yield* AuthService
        return yield* auth.changePassword("u5", "wrongpass", "newpass456")
      }).pipe(Effect.provide(layer))
    )
    await expect(promise).rejects.toThrow()
  })
})
