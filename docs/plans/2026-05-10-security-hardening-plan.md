# Security Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical and high-severity security vulnerabilities: JWT secret fallback, rate limiting, input validation, API key encryption, error sanitization, and JWT expiry.

**Architecture:** Seven incremental changes to the existing Bun + Effect-TS backend. Rate limiting uses `Effect.Ref<HashMap>` as in-memory sliding window. Input validation uses `Schema` from `effect`. API key encryption uses Node `crypto` AES-256-GCM. Each task is independently testable and committable.

**Tech Stack:** Bun, Effect-TS v3.21.2 (`Schema`, `Ref`, `HashMap`, `Data.TaggedError`), `jose` JWT, Node `crypto`

---

### Task 1: Remove JWT Secret Fallback

**Files:**
- Modify: `backend/src/services/Auth.ts:6-8`

**Step 1: Modify Auth.ts to crash if JWT_SECRET is missing**

Replace lines 6-8 in `backend/src/services/Auth.ts`:

```typescript
// OLD:
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nsa-dev-secret-change-in-production"
)

// NEW:
const jwtSecretRaw = process.env.JWT_SECRET
if (!jwtSecretRaw) {
  throw new Error("JWT_SECRET environment variable is required")
}
const JWT_SECRET = new TextEncoder().encode(jwtSecretRaw)
```

**Step 2: Verify tests still pass**

Run: `cd backend && JWT_SECRET=test-secret bun test src/services/Auth.test.ts`
Expected: All auth tests pass (JWT_SECRET is now set via env).

**Step 3: Commit**

```bash
git add backend/src/services/Auth.ts
git commit -m "security: require JWT_SECRET env var, remove hardcoded fallback"
```

---

### Task 2: Shorten JWT Expiry to 7 Days

**Files:**
- Modify: `backend/src/services/Auth.ts:26`

**Step 1: Change token expiry**

In `backend/src/services/Auth.ts`, line 26, change:
```typescript
// OLD:
.setExpirationTime("30d")

// NEW:
.setExpirationTime("7d")
```

**Step 2: Run tests**

Run: `cd backend && JWT_SECRET=test-secret bun test src/services/Auth.test.ts`
Expected: PASS (tests don't check expiry duration)

**Step 3: Commit**

```bash
git add backend/src/services/Auth.ts
git commit -m "security: shorten JWT auth token expiry from 30d to 7d"
```

---

### Task 3: Sanitize Error Responses

**Files:**
- Modify: `backend/src/server.ts:401-406`

**Step 1: Replace the unhandled error handler**

In `backend/src/server.ts`, replace the fallback error handler (lines 401-406):

```typescript
// OLD (lines 401-406):
        const message = err instanceof Error ? err.message : String(err)
        return Effect.gen(function* () {
          yield* Effect.logError("Unhandled error").pipe(Effect.annotateLogs("error", message))
          return yield* jsonError(message, 500)
        })

// NEW:
        const detail = err instanceof Error ? err.message : String(err)
        return Effect.gen(function* () {
          yield* Effect.logError("Unhandled error").pipe(Effect.annotateLogs("error", detail))
          return yield* jsonError("Internal server error", 500)
        })
```

The key change: `jsonError(message, 500)` → `jsonError("Internal server error", 500)`. Internal details are logged but never sent to the client.

**Step 2: Run all tests**

Run: `cd backend && JWT_SECRET=test-secret bun test`
Expected: All existing passing tests still pass.

**Step 3: Commit**

```bash
git add backend/src/server.ts
git commit -m "security: sanitize unhandled error responses, never leak internals"
```

---

### Task 4: Add RateLimitExceeded Error

**Files:**
- Modify: `backend/src/services/Errors.ts`

**Step 1: Add the new tagged error**

Append to `backend/src/services/Errors.ts` after line 41:

```typescript
export class RateLimitExceeded extends Data.TaggedError("RateLimitExceeded")<{}> {}
```

**Step 2: Add error mapping in server.ts**

In `backend/src/server.ts`, in the `Effect.catchAll` switch block (after line 399, the `ResetTokenExpired` case), add:

```typescript
            case "RateLimitExceeded": return jsonError("Too many requests, try again later", 429)
```

**Step 3: Commit**

```bash
git add backend/src/services/Errors.ts backend/src/server.ts
git commit -m "security: add RateLimitExceeded error type"
```

---

### Task 5: Implement Rate Limiting Service

**Files:**
- Create: `backend/src/services/RateLimit.ts`
- Create: `backend/src/services/RateLimit.test.ts`

**Step 1: Write the failing test**

Create `backend/src/services/RateLimit.test.ts`:

```typescript
import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import { RateLimitService } from "./RateLimit"
import { RateLimitExceeded } from "./Errors"

const runTest = <A, E>(effect: Effect.Effect<A, E, RateLimitService>) =>
  Effect.runPromise(effect.pipe(Effect.provide(RateLimitService.Default)))

describe("RateLimitService", () => {
  it("allows requests under the limit", async () => {
    await runTest(
      Effect.gen(function* () {
        const rl = yield* RateLimitService
        // 5 requests should be fine for auth tier (limit 10)
        for (let i = 0; i < 5; i++) {
          yield* rl.check("127.0.0.1", "auth")
        }
      })
    )
  })

  it("blocks requests over the auth limit", async () => {
    const promise = runTest(
      Effect.gen(function* () {
        const rl = yield* RateLimitService
        // Exceed the auth limit (10)
        for (let i = 0; i < 11; i++) {
          yield* rl.check("10.0.0.1", "auth")
        }
      })
    )
    await expect(promise).rejects.toThrow()
  })

  it("tracks different IPs independently", async () => {
    await runTest(
      Effect.gen(function* () {
        const rl = yield* RateLimitService
        // Fill up one IP
        for (let i = 0; i < 10; i++) {
          yield* rl.check("10.0.0.2", "auth")
        }
        // Different IP should still work
        yield* rl.check("10.0.0.3", "auth")
      })
    )
  })

  it("tracks different tiers independently", async () => {
    await runTest(
      Effect.gen(function* () {
        const rl = yield* RateLimitService
        // Fill up auth tier
        for (let i = 0; i < 10; i++) {
          yield* rl.check("10.0.0.4", "auth")
        }
        // Write tier should still work for same IP
        yield* rl.check("10.0.0.4", "write")
      })
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd backend && JWT_SECRET=test-secret bun test src/services/RateLimit.test.ts`
Expected: FAIL — module `./RateLimit` not found.

**Step 3: Implement RateLimitService**

Create `backend/src/services/RateLimit.ts`:

```typescript
import { Effect, Ref, HashMap } from "effect"
import { RateLimitExceeded } from "./Errors"

interface Window {
  count: number
  start: number
}

type Tier = "auth" | "write" | "read"

const LIMITS: Record<Tier, { max: number; windowMs: number }> = {
  auth:  { max: 10,  windowMs: 15 * 60 * 1000 }, // 10 per 15 min
  write: { max: 60,  windowMs: 60 * 1000 },       // 60 per min
  read:  { max: 120, windowMs: 60 * 1000 },        // 120 per min
}

export class RateLimitService extends Effect.Service<RateLimitService>()("RateLimitService", {
  effect: Effect.gen(function* () {
    const state = yield* Ref.make(HashMap.empty<string, Window>())

    return {
      check: (ip: string, tier: Tier) =>
        Effect.gen(function* () {
          const now = Date.now()
          const key = `${ip}:${tier}`
          const limit = LIMITS[tier]

          yield* Ref.update(state, (map) => {
            const existing = HashMap.get(map, key)
            if (existing._tag === "None") {
              return HashMap.set(map, key, { count: 1, start: now })
            }
            const w = existing.value
            if (now - w.start > limit.windowMs) {
              // Window expired, reset
              return HashMap.set(map, key, { count: 1, start: now })
            }
            return HashMap.set(map, key, { count: w.count + 1, start: w.start })
          })

          const map = yield* Ref.get(state)
          const entry = HashMap.get(map, key)
          if (entry._tag === "Some" && entry.value.count > limit.max) {
            return yield* new RateLimitExceeded()
          }
        }),

      /** Remove expired entries — call periodically */
      prune: () =>
        Ref.update(state, (map) => {
          const now = Date.now()
          let result = map
          for (const [key, window] of map) {
            const tier = key.split(":")[1] as Tier
            const limit = LIMITS[tier]
            if (limit && now - window.start > limit.windowMs) {
              result = HashMap.remove(result, key)
            }
          }
          return result
        }),
    }
  }),
}) {}
```

**Step 4: Run tests to verify they pass**

Run: `cd backend && JWT_SECRET=test-secret bun test src/services/RateLimit.test.ts`
Expected: 4 tests PASS.

**Step 5: Commit**

```bash
git add backend/src/services/RateLimit.ts backend/src/services/RateLimit.test.ts
git commit -m "security: add RateLimitService with Effect Ref+HashMap sliding window"
```

---

### Task 6: Wire Rate Limiting into Server

**Files:**
- Modify: `backend/src/server.ts` (add rate limit checks to routes)
- Modify: `backend/src/index.ts` (add RateLimitService to layer, start prune fiber)

**Step 1: Import and use RateLimitService in server.ts**

Add import at top of `backend/src/server.ts` (after line 17):

```typescript
import { RateLimitService } from "./services/RateLimit"
```

**Step 2: Create helper to extract client IP**

Add after the `readJson` helper (after line 73 in `backend/src/server.ts`):

```typescript
const getClientIp = Effect.gen(function* () {
  const req = yield* HttpServerRequest.HttpServerRequest
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    ?? req.headers["x-real-ip"]
    ?? "unknown"
})

const rateLimit = (tier: "auth" | "write" | "read") =>
  Effect.gen(function* () {
    const ip = yield* getClientIp
    const rl = yield* RateLimitService
    yield* rl.check(ip, tier)
  })
```

**Step 3: Add rate limit checks to auth routes**

In `backend/src/server.ts`, add `yield* rateLimit("auth")` as the first line inside each auth route's `Effect.gen`:

- `POST /api/auth/register` (line 87): add `yield* rateLimit("auth")` after `Effect.gen(function* () {`
- `POST /api/auth/login` (line 98): add `yield* rateLimit("auth")` after `Effect.gen(function* () {`
- `POST /api/auth/forgot-password` (line 121): add `yield* rateLimit("auth")` after `Effect.gen(function* () {`
- `POST /api/auth/reset-password` (line 134): add `yield* rateLimit("auth")` after `Effect.gen(function* () {`

**Step 4: Add rate limit checks to write routes**

Add `yield* rateLimit("write")` as the first line in:
- `POST /api/auth/change-password` (line 111)
- `POST /api/tests` (line 146)
- `POST /api/planner` (line 164)
- `POST /api/intervals/connect` (line 175)
- `POST /api/intervals/sync` (line 184)
- `POST /api/intervals/export` (line 191)
- `POST /api/activities/sync` (line 217)
- `POST /api/block/assess` (line 240)
- `POST /api/block` (line 247)
- `POST /api/admin/invite` (line 258)

And in the catch-all `*` handler (line 287), add rate limit checks:
- Before DELETE handlers: `yield* rateLimit("write")`
- Before POST block push: `yield* rateLimit("write")`

For GET handlers in the catch-all, add `yield* rateLimit("read")`.

**Step 5: Add RateLimitService to index.ts**

In `backend/src/index.ts`, add import (after line 15):

```typescript
import { RateLimitService } from "./services/RateLimit"
```

Add to `AppServicesLive` layer (after line 32):

```typescript
  RateLimitService.Default,
```

Add background prune fiber in the `main` effect (after line 42, `yield* runMigrations`):

```typescript
  // Start rate limit cleanup fiber
  const rl = yield* RateLimitService
  yield* rl.prune().pipe(
    Effect.schedule(Schedule.fixed("5 minutes")),
    Effect.fork,
  )
```

And add `Schedule` to the imports on line 1:

```typescript
import { Effect, Layer, Schedule } from "effect"
```

**Step 6: Run all tests**

Run: `cd backend && JWT_SECRET=test-secret bun test`
Expected: All passing tests still pass. Rate limit tests pass.

**Step 7: Commit**

```bash
git add backend/src/server.ts backend/src/index.ts
git commit -m "security: wire rate limiting into all routes with auth/write/read tiers"
```

---

### Task 7: Add Request Body Schemas

**Files:**
- Create: `backend/src/Schemas.ts`

**Step 1: Create Schemas.ts with all request body schemas**

Create `backend/src/Schemas.ts`:

```typescript
import { Schema } from "effect"

// ── Shared types ─────────────────────────────────────────────────────

const NonEmptyString = Schema.String.pipe(Schema.minLength(1))
const Password = Schema.String.pipe(Schema.minLength(8))

// ── Auth ─────────────────────────────────────────────────────────────

export const RegisterBody = Schema.Struct({
  token: NonEmptyString,
  password: Password,
})

export const LoginBody = Schema.Struct({
  email: NonEmptyString,
  password: NonEmptyString,
})

export const ChangePasswordBody = Schema.Struct({
  currentPassword: NonEmptyString,
  newPassword: Password,
})

export const ForgotPasswordBody = Schema.Struct({
  email: NonEmptyString,
})

export const ResetPasswordBody = Schema.Struct({
  token: NonEmptyString,
  password: Password,
})

// ── Tests ────────────────────────────────────────────────────────────

export const SaveTestBody = Schema.Struct({
  test_type: Schema.String,
  test_date: Schema.String,
  value_a: Schema.Number,
  value_b: Schema.Number,
  max_hr: Schema.optional(Schema.Number),
  notes: Schema.optional(Schema.String),
})

// ── Planner ──────────────────────────────────────────────────────────

export const SavePlannerBody = Schema.Struct({
  week_data: Schema.Unknown,
  default_wu: Schema.Number,
  default_cd: Schema.Number,
  name: Schema.optional(Schema.String),
})

// ── Intervals.icu ────────────────────────────────────────────────────

export const ConnectBody = Schema.Struct({
  athlete_id: NonEmptyString,
  api_key: NonEmptyString,
})

export const SyncBody = Schema.Struct({
  from: NonEmptyString,
  to: NonEmptyString,
})

export const ExportBody = Schema.Struct({
  week_data: Schema.Unknown,
  start_date: Schema.String,
  default_wu: Schema.optional(Schema.Number),
  default_cd: Schema.optional(Schema.Number),
})

// ── Block ────────────────────────────────────────────────────────────

export const CreateBlockBody = Schema.Struct({
  start_date: Schema.String,
  end_date: Schema.String,
  block_type: Schema.String,
  status: Schema.String,
  assessment: Schema.Unknown,
  weeks: Schema.Unknown,
  events: Schema.Array(Schema.Struct({
    date: Schema.String,
    week_number: Schema.Number,
    workout_type: Schema.String,
    name: Schema.String,
    duration_minutes: Schema.optional(Schema.Number),
    distance_meters: Schema.optional(Schema.Number),
    workout_doc: Schema.optional(Schema.Unknown),
    notes: Schema.optional(Schema.String),
  })),
})

export const PushBlockBody = Schema.Struct({
  mode: Schema.Literal("override", "add_alongside"),
})

// ── Admin ────────────────────────────────────────────────────────────

export const InviteBody = Schema.Struct({
  email: NonEmptyString,
})
```

**Step 2: Commit**

```bash
git add backend/src/Schemas.ts
git commit -m "security: add Effect Schema definitions for all request bodies"
```

---

### Task 8: Wire Schemas into Server Routes

**Files:**
- Modify: `backend/src/server.ts`

**Step 1: Replace readJson with readBody helper**

In `backend/src/server.ts`, replace the `readJson` helper (lines 69-73) with:

```typescript
import { Schema } from "effect"
import * as S from "./Schemas"

const readBody = <A, I>(schema: Schema.Schema<A, I>) =>
  Effect.gen(function* () {
    const req = yield* HttpServerRequest.HttpServerRequest
    const raw = yield* req.json
    return yield* Schema.decodeUnknown(schema)(raw).pipe(
      Effect.mapError((e) => new HttpError({ status: 400, message: `Invalid request body: ${e.message}` }))
    )
  })
```

**Step 2: Replace all route bodies**

Replace each route's `readJson` + manual validation with `readBody(S.SchemaName)`. The manual `if` checks are no longer needed since the schema handles them.

**POST /api/auth/register** (lines 87-96):
```typescript
  HttpRouter.post("/api/auth/register", Effect.gen(function* () {
    yield* rateLimit("auth")
    const body = yield* readBody(S.RegisterBody)
    const auth = yield* AuthService
    const result = yield* auth.register(body.token, body.password)
    const emailSvc = yield* EmailService
    yield* emailSvc.sendWelcome(result.email).pipe(Effect.catchAll(() => Effect.void))
    return yield* json(result)
  })),
```

**POST /api/auth/login** (lines 98-104):
```typescript
  HttpRouter.post("/api/auth/login", Effect.gen(function* () {
    yield* rateLimit("auth")
    const body = yield* readBody(S.LoginBody)
    const auth = yield* AuthService
    const result = yield* auth.login(body.email, body.password)
    return yield* json(result)
  })),
```

**POST /api/auth/change-password** (lines 111-119):
```typescript
  HttpRouter.post("/api/auth/change-password", Effect.gen(function* () {
    yield* rateLimit("write")
    const user = yield* extractUser
    const body = yield* readBody(S.ChangePasswordBody)
    const auth = yield* AuthService
    const result = yield* auth.changePassword(user.id, body.currentPassword, body.newPassword)
    return yield* json(result)
  })),
```

**POST /api/auth/forgot-password** (lines 121-132):
```typescript
  HttpRouter.post("/api/auth/forgot-password", Effect.gen(function* () {
    yield* rateLimit("auth")
    const body = yield* readBody(S.ForgotPasswordBody)
    const auth = yield* AuthService
    const token = yield* auth.createResetToken(body.email)
    if (token) {
      const emailSvc = yield* EmailService
      yield* emailSvc.sendResetPassword(body.email, token).pipe(Effect.catchAll(() => Effect.void))
    }
    return yield* json({ ok: true })
  })),
```

**POST /api/auth/reset-password** (lines 134-141):
```typescript
  HttpRouter.post("/api/auth/reset-password", Effect.gen(function* () {
    yield* rateLimit("auth")
    const body = yield* readBody(S.ResetPasswordBody)
    const auth = yield* AuthService
    const result = yield* auth.resetPassword(body.token, body.password)
    return yield* json(result)
  })),
```

**POST /api/tests** (lines 146-152):
```typescript
  HttpRouter.post("/api/tests", Effect.gen(function* () {
    yield* rateLimit("write")
    const user = yield* extractUser
    const body = yield* readBody(S.SaveTestBody)
    const tests = yield* TestResultsService
    const result = yield* tests.save(user.id, body)
    return yield* json(result)
  })),
```

**POST /api/planner** (lines 164-170):
```typescript
  HttpRouter.post("/api/planner", Effect.gen(function* () {
    yield* rateLimit("write")
    const user = yield* extractUser
    const body = yield* readBody(S.SavePlannerBody)
    const planner = yield* PlannerService
    const result = yield* planner.save(user.id, body as any)
    return yield* json(result)
  })),
```

Note: `body as any` needed here because `PlannerService.save` expects `{ week_data: string }` but schema decodes to `{ week_data: unknown }`. The schema validates presence; the service handles serialization.

**POST /api/intervals/connect** (lines 175-182):
```typescript
  HttpRouter.post("/api/intervals/connect", Effect.gen(function* () {
    yield* rateLimit("write")
    const user = yield* extractUser
    const body = yield* readBody(S.ConnectBody)
    const intervals = yield* IntervalsService
    yield* intervals.connect(user.id, body.athlete_id, body.api_key)
    return yield* json({ ok: true })
  })),
```

**POST /api/intervals/export** (lines 191-198):
```typescript
  HttpRouter.post("/api/intervals/export", Effect.gen(function* () {
    yield* rateLimit("write")
    const user = yield* extractUser
    const body = yield* readBody(S.ExportBody)
    const workoutExport = yield* WorkoutExportService
    const exported = yield* workoutExport.exportWeek(user.id, body as any)
    return yield* json({ exported })
  })),
```

**POST /api/activities/sync** (lines 217-224):
```typescript
  HttpRouter.post("/api/activities/sync", Effect.gen(function* () {
    yield* rateLimit("write")
    const user = yield* extractUser
    const body = yield* readBody(S.SyncBody)
    const activities = yield* ActivitiesService
    const synced = yield* activities.sync(user.id, body.from, body.to)
    return yield* json({ synced })
  })),
```

**POST /api/block** (lines 247-253):
```typescript
  HttpRouter.post("/api/block", Effect.gen(function* () {
    yield* rateLimit("write")
    const user = yield* extractUser
    const body = yield* readBody(S.CreateBlockBody)
    const blocks = yield* BlockService
    const result = yield* blocks.save(user.id, body as any)
    return yield* json(result, 201)
  })),
```

**POST /api/admin/invite** (lines 258-271):
```typescript
  HttpRouter.post("/api/admin/invite", Effect.gen(function* () {
    yield* rateLimit("write")
    const admin = yield* extractAdmin
    const body = yield* readBody(S.InviteBody)
    const auth = yield* AuthService
    const token = yield* auth.invite(body.email)
    const emailSvc = yield* EmailService
    yield* emailSvc.sendInvitation(body.email, token)
    yield* Effect.logInfo("invitation sent").pipe(
      Effect.annotateLogs("admin", admin.email),
      Effect.annotateLogs("invited", body.email),
    )
    return yield* json({ ok: true, email: body.email })
  })),
```

**POST /api/block/:id/push** (in catch-all, line 321):
Replace `const body = yield* readJson as Effect.Effect<{ mode: "override" | "add_alongside" }>` with:
```typescript
      const body = yield* readBody(S.PushBlockBody)
```

**Other write routes in catch-all (POST /api/intervals/sync, POST /api/block/assess):**
These don't have request bodies — just add `yield* rateLimit("write")`.

**Read routes in catch-all (GET /api/planner/:id, GET /api/block/:id):**
Add `yield* rateLimit("read")` at the start.

**Step 3: Remove the old readJson helper**

Delete lines 69-73 (the `readJson` Effect.gen block). It's fully replaced by `readBody`.

**Step 4: Run all tests**

Run: `cd backend && JWT_SECRET=test-secret bun test`
Expected: All passing tests still pass.

**Step 5: Commit**

```bash
git add backend/src/server.ts
git commit -m "security: replace readJson/as-any with Schema-validated readBody on all routes"
```

---

### Task 9: Add Crypto Utility for API Key Encryption

**Files:**
- Create: `backend/src/services/Crypto.ts`
- Create: `backend/src/services/Crypto.test.ts`

**Step 1: Write the failing test**

Create `backend/src/services/Crypto.test.ts`:

```typescript
import { describe, it, expect } from "bun:test"
import { encrypt, decrypt } from "./Crypto"

// Set test encryption key (32 bytes = 64 hex chars)
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

describe("Crypto", () => {
  it("encrypts and decrypts a string", () => {
    const plaintext = "my-secret-api-key"
    const encrypted = encrypt(plaintext)
    expect(encrypted).not.toBe(plaintext)
    expect(encrypted).toContain(":") // iv:tag:ciphertext format
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it("produces different ciphertexts for same input (random IV)", () => {
    const plaintext = "same-input"
    const a = encrypt(plaintext)
    const b = encrypt(plaintext)
    expect(a).not.toBe(b)
  })

  it("decrypt fails on tampered data", () => {
    const encrypted = encrypt("test")
    const parts = encrypted.split(":")
    parts[2] = "ff" + parts[2].slice(2) // tamper ciphertext
    expect(() => decrypt(parts.join(":"))).toThrow()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd backend && bun test src/services/Crypto.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement Crypto.ts**

Create `backend/src/services/Crypto.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"

const getKey = (): Buffer => {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)")
  }
  return Buffer.from(hex, "hex")
}

export const encrypt = (plaintext: string): string => {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`
}

export const decrypt = (stored: string): string => {
  const key = getKey()
  const [ivHex, tagHex, dataHex] = stored.split(":")
  const iv = Buffer.from(ivHex, "hex")
  const tag = Buffer.from(tagHex, "hex")
  const data = Buffer.from(dataHex, "hex")
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(data) + decipher.final("utf8")
}

/** Check if a value is already encrypted (has iv:tag:ciphertext format) */
export const isEncrypted = (value: string): boolean => {
  const parts = value.split(":")
  return parts.length === 3 && parts.every(p => /^[0-9a-f]+$/.test(p))
}
```

**Step 4: Run tests**

Run: `cd backend && bun test src/services/Crypto.test.ts`
Expected: 3 tests PASS.

**Step 5: Commit**

```bash
git add backend/src/services/Crypto.ts backend/src/services/Crypto.test.ts
git commit -m "security: add AES-256-GCM crypto utility for API key encryption"
```

---

### Task 10: Encrypt API Keys in Intervals Service

**Files:**
- Modify: `backend/src/services/Intervals.ts:27-31, 44`

**Step 1: Import crypto and encrypt on connect**

In `backend/src/services/Intervals.ts`, add import at top:

```typescript
import { encrypt, decrypt, isEncrypted } from "./Crypto"
```

**Step 2: Encrypt on store**

Replace the `connect` method (lines 27-31):

```typescript
// OLD:
      connect: (userId: string, athleteId: string, apiKey: string) =>
        db.run(
          "UPDATE users SET intervals_icu_athlete_id = ?, intervals_icu_api_key = ?, updated_at = datetime('now') WHERE id = ?",
          [athleteId, apiKey, userId]
        ),

// NEW:
      connect: (userId: string, athleteId: string, apiKey: string) =>
        db.run(
          "UPDATE users SET intervals_icu_athlete_id = ?, intervals_icu_api_key = ?, updated_at = datetime('now') WHERE id = ?",
          [athleteId, encrypt(apiKey), userId]
        ),
```

**Step 3: Decrypt on use**

In `syncWellness`, after line 44 where `apiKey` is read from the user record, add decryption:

```typescript
// OLD (line 44):
          const apiKey = user.intervals_icu_api_key

// NEW:
          const rawKey = user.intervals_icu_api_key!
          const apiKey = isEncrypted(rawKey) ? decrypt(rawKey) : rawKey
```

The `isEncrypted` check provides backwards compatibility with any existing plaintext keys already in the database. They will be encrypted on the next `connect` call.

**Step 4: Apply the same decrypt pattern in WorkoutExport.ts and Activities.ts**

Check if these services also read `intervals_icu_api_key` — they do. Apply the same `isEncrypted` check + `decrypt` in each place where the API key is read from the database.

In `backend/src/services/WorkoutExport.ts`, where the API key is read from the user:
```typescript
import { encrypt, decrypt, isEncrypted } from "./Crypto"
// ... where apiKey is read:
const rawKey = user.intervals_icu_api_key!
const apiKey = isEncrypted(rawKey) ? decrypt(rawKey) : rawKey
```

In `backend/src/services/Activities.ts`, same pattern:
```typescript
import { encrypt, decrypt, isEncrypted } from "./Crypto"
// ... where apiKey is read:
const rawKey = user.intervals_icu_api_key!
const apiKey = isEncrypted(rawKey) ? decrypt(rawKey) : rawKey
```

In `backend/src/services/Assessment.ts`, same pattern (if it reads the API key directly):
```typescript
import { encrypt, decrypt, isEncrypted } from "./Crypto"
// ... where apiKey is read:
const rawKey = user.intervals_icu_api_key!
const apiKey = isEncrypted(rawKey) ? decrypt(rawKey) : rawKey
```

**Step 5: Run all tests**

Run: `cd backend && JWT_SECRET=test-secret ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef bun test`
Expected: All passing tests still pass.

**Step 6: Commit**

```bash
git add backend/src/services/Intervals.ts backend/src/services/WorkoutExport.ts backend/src/services/Activities.ts backend/src/services/Assessment.ts
git commit -m "security: encrypt Intervals.icu API keys at rest with AES-256-GCM"
```

---

### Task 11: Update .env.example and CLAUDE.md

**Files:**
- Modify: `backend/.env.example`
- Modify: `CLAUDE.md`

**Step 1: Update .env.example**

Add the new required env vars to `backend/.env.example`:

```
JWT_SECRET=<required: random string for JWT signing>
ENCRYPTION_KEY=<required: 64-char hex string for API key encryption>
PORT=3002
SMTP_HOST=smtp.sumopod.com
SMTP_PORT=465
SMTP_USER=<your_smtp_user>
SMTP_PASS=<your_smtp_pass>
SMTP_FROM=noreply@bagus.icu
```

**Step 2: Update CLAUDE.md env section**

In `CLAUDE.md`, update the environment variables section to mention:
- `JWT_SECRET` — required, server crashes without it
- `ENCRYPTION_KEY` — required, 64-char hex string for encrypting API keys at rest

**Step 3: Commit**

```bash
git add backend/.env.example CLAUDE.md
git commit -m "docs: update env vars for security hardening (JWT_SECRET, ENCRYPTION_KEY required)"
```

---

## Task Dependency Order

```
Task 1 (JWT fallback) ─┐
Task 2 (JWT expiry)  ───┤
Task 3 (error sanitize) ┤── independent, can run in any order
Task 4 (error type)  ───┘
                         │
Task 5 (rate limit svc) ─┤── depends on Task 4 (RateLimitExceeded error)
Task 7 (schemas) ────────┤── independent
Task 9 (crypto) ─────────┘── independent
                         │
Task 6 (wire rate limit) ┤── depends on Task 5
Task 8 (wire schemas) ───┤── depends on Task 7
Task 10 (encrypt keys) ──┘── depends on Task 9
                         │
Task 11 (docs) ──────────┘── depends on all above
```
