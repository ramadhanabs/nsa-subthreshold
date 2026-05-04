import { Effect, Context, Layer } from "effect"
import { DatabaseService } from "./Database"
import { SignJWT, jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nsa-dev-secret-change-in-production"
)

export interface User {
  id: string
  email: string
  password_hash: string
  intervals_icu_athlete_id: string | null
  intervals_icu_api_key: string | null
  created_at: string
  updated_at: string
}

export class AuthService extends Context.Tag("AuthService")<
  AuthService,
  {
    readonly register: (email: string, password: string) => Effect.Effect<{ id: string; email: string; token: string }, Error>
    readonly login: (email: string, password: string) => Effect.Effect<{ id: string; email: string; token: string }, Error>
    readonly verify: (token: string) => Effect.Effect<{ id: string; email: string }, Error>
  }
>() {}

const createToken = (id: string, email: string) =>
  Effect.tryPromise({
    try: () =>
      new SignJWT({ id, email })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30d")
        .sign(JWT_SECRET),
    catch: (e) => new Error(`Failed to create token: ${e}`),
  })

export const AuthServiceLive = Layer.effect(
  AuthService,
  Effect.gen(function* () {
    const db = yield* DatabaseService

    return {
      register: (email: string, password: string) =>
        Effect.gen(function* () {
          const existing = yield* db.get<User>(
            "SELECT * FROM users WHERE email = ?",
            [email]
          )
          if (existing) {
            return yield* Effect.fail(new Error("Email already registered"))
          }

          const id = crypto.randomUUID()
          const password_hash = yield* Effect.tryPromise({
            try: () => Bun.password.hash(password),
            catch: (e) => new Error(`Failed to hash password: ${e}`),
          })

          yield* db.run(
            "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
            [id, email, password_hash]
          )

          const token = yield* createToken(id, email)
          return { id, email, token }
        }),

      login: (email: string, password: string) =>
        Effect.gen(function* () {
          const user = yield* db.get<User>(
            "SELECT * FROM users WHERE email = ?",
            [email]
          )
          if (!user) {
            return yield* Effect.fail(new Error("Invalid email or password"))
          }

          const valid = yield* Effect.tryPromise({
            try: () => Bun.password.verify(password, user.password_hash),
            catch: (e) => new Error(`Failed to verify password: ${e}`),
          })
          if (!valid) {
            return yield* Effect.fail(new Error("Invalid email or password"))
          }

          const token = yield* createToken(user.id, user.email)
          return { id: user.id, email: user.email, token }
        }),

      verify: (token: string) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () => jwtVerify(token, JWT_SECRET),
            catch: (e) => new Error(`Invalid token: ${e}`),
          })
          const payload = result.payload as { id: string; email: string }
          return { id: payload.id, email: payload.email }
        }),
    }
  })
)
