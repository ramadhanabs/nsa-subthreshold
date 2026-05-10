import { Effect } from "effect"
import { DatabaseService } from "./Database"
import { EmailAlreadyRegistered, InvalidCredentials, InvalidToken, InvitationExpired, NotFoundError, PasswordMismatch, ResetTokenExpired } from "./Errors"
import { SignJWT, jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nsa-dev-secret-change-in-production"
)

export interface User {
  id: string
  email: string
  password_hash: string
  is_admin: number
  intervals_icu_athlete_id: string | null
  intervals_icu_api_key: string | null
  created_at: string
  updated_at: string
}

const createToken = (id: string, email: string) =>
  Effect.tryPromise({
    try: () =>
      new SignJWT({ id, email })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30d")
        .sign(JWT_SECRET),
    catch: (e) => new Error(`Failed to create token: ${e}`),
  })

const createInvitationToken = (email: string) =>
  Effect.tryPromise({
    try: () =>
      new SignJWT({ email, type: "invite" })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(JWT_SECRET),
    catch: (e) => new Error(`Failed to create invitation token: ${e}`),
  })

const verifyInvitationToken = (token: string) =>
  Effect.tryPromise({
    try: async () => {
      const result = await jwtVerify(token, JWT_SECRET)
      const payload = result.payload as { email: string; type: string }
      if (payload.type !== "invite") throw new Error("Not an invitation token")
      return payload.email
    },
    catch: () => new InvitationExpired(),
  })

const createResetToken = (email: string) =>
  Effect.tryPromise({
    try: () =>
      new SignJWT({ email, type: "reset" })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(JWT_SECRET),
    catch: (e) => new Error(`Failed to create reset token: ${e}`),
  })

const verifyResetToken = (token: string) =>
  Effect.tryPromise({
    try: async () => {
      const result = await jwtVerify(token, JWT_SECRET)
      const payload = result.payload as { email: string; type: string }
      if (payload.type !== "reset") throw new Error("Not a reset token")
      return payload.email
    },
    catch: () => new ResetTokenExpired(),
  })

export class AuthService extends Effect.Service<AuthService>()("AuthService", {
  effect: Effect.gen(function* () {
    const db = yield* DatabaseService
    return {
      register: (token: string, password: string) =>
        Effect.gen(function* () {
          const email = yield* verifyInvitationToken(token)
          const existing = yield* db.get<User>(
            "SELECT * FROM users WHERE email = ?",
            [email]
          )
          if (existing) {
            return yield* new EmailAlreadyRegistered({ email })
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

          const authToken = yield* createToken(id, email)
          return { id, email, token: authToken }
        }),

      login: (email: string, password: string) =>
        Effect.gen(function* () {
          const user = yield* db.get<User>(
            "SELECT * FROM users WHERE email = ?",
            [email]
          )
          if (!user) {
            return yield* new InvalidCredentials()
          }

          const valid = yield* Effect.tryPromise({
            try: () => Bun.password.verify(password, user.password_hash),
            catch: (e) => new Error(`Failed to verify password: ${e}`),
          })
          if (!valid) {
            return yield* new InvalidCredentials()
          }

          const token = yield* createToken(user.id, user.email)
          return { id: user.id, email: user.email, token }
        }),

      verify: (token: string) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () => jwtVerify(token, JWT_SECRET),
            catch: (e) => new InvalidToken({ reason: String(e) }),
          })
          const payload = result.payload as { id: string; email: string }
          const user = yield* db.get<User>(
            "SELECT is_admin FROM users WHERE id = ?",
            [payload.id]
          )
          return { id: payload.id, email: payload.email, is_admin: user?.is_admin === 1 }
        }),

      invite: (email: string) => createInvitationToken(email),

      isAdmin: (userId: string) =>
        Effect.gen(function* () {
          const user = yield* db.get<User>(
            "SELECT is_admin FROM users WHERE id = ?",
            [userId]
          )
          return user?.is_admin === 1
        }),

      changePassword: (userId: string, currentPassword: string, newPassword: string) =>
        Effect.gen(function* () {
          const user = yield* db.get<User>(
            "SELECT * FROM users WHERE id = ?",
            [userId]
          )
          if (!user) return yield* new NotFoundError({ entity: "user", id: userId })
          const valid = yield* Effect.tryPromise({
            try: () => Bun.password.verify(currentPassword, user.password_hash),
            catch: (e) => new Error(`Failed to verify password: ${e}`),
          })
          if (!valid) return yield* new PasswordMismatch()
          const hash = yield* Effect.tryPromise({
            try: () => Bun.password.hash(newPassword),
            catch: (e) => new Error(`Failed to hash password: ${e}`),
          })
          yield* db.run(
            "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
            [hash, userId]
          )
          return { ok: true }
        }),

      createResetToken: (email: string) =>
        Effect.gen(function* () {
          const user = yield* db.get<User>(
            "SELECT * FROM users WHERE email = ?",
            [email]
          )
          if (!user) return null // Don't reveal if email exists
          const token = yield* createResetToken(email)
          return token
        }),

      resetPassword: (token: string, newPassword: string) =>
        Effect.gen(function* () {
          const email = yield* verifyResetToken(token)
          const hash = yield* Effect.tryPromise({
            try: () => Bun.password.hash(newPassword),
            catch: (e) => new Error(`Failed to hash password: ${e}`),
          })
          yield* db.run(
            "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE email = ?",
            [hash, email]
          )
          return { ok: true }
        }),
    }
  }),
  dependencies: [DatabaseService.Default],
}) {}
