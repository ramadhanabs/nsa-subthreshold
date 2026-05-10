# Security Hardening Design

**Goal:** Fix critical and high-severity security issues identified in the codebase assessment. Pragmatic hardening for a single-VPS fitness app — no over-engineering.

**Tech Stack:** Bun + Effect-TS (v3.21.2), Effect Schema for validation, Effect Ref for rate limiting, Node crypto for encryption.

## Scope

7 changes covering critical + high severity issues:

| # | Change | Severity | Effort |
|---|--------|----------|--------|
| 1 | Remove JWT secret fallback, crash if missing | Critical | Tiny |
| 2 | Commit SMTP credential redaction | Critical | Tiny |
| 3 | Rate limiting with Effect Ref+HashMap | High | Medium |
| 4 | Input validation with Effect Schema | High | Medium |
| 5 | Encrypt Intervals.icu API keys at rest | High | Medium |
| 6 | Sanitize error responses | High | Small |
| 7 | Shorten JWT expiry to 7 days | High | Tiny |

## 1. Remove JWT Secret Fallback

**File:** `Auth.ts:5-7`

Remove hardcoded `"nsa-dev-secret-change-in-production"` fallback. Crash on startup if `JWT_SECRET` env var is not set. Prevents token forgery if env is misconfigured.

## 2. SMTP Credential Redaction

**Files:** `docs/plans/2026-05-10-invitation-system-plan.md`, `docs/plans/2026-05-10-invitation-system-design.md`

Already redacted — needs commit + push. Credentials are in git history so the SMTP password must be rotated in Sumopod.

## 3. Rate Limiting with Effect Ref

### Architecture

`RateLimitService` using `Ref<HashMap<string, SlidingWindow>>` keyed by `${ip}:${tier}`.

```
HTTP Request → Extract IP → Check Ref → Over limit? → 429
                                       → Under limit? → Continue to router
```

### Tiers

| Tier | Routes | Limit | Window |
|------|--------|-------|--------|
| Auth | `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password` | 10 req | 15 min |
| Write | All POST/PUT/DELETE (non-auth) | 60 req | 1 min |
| Read | All GET | 120 req | 1 min |

### Cleanup

Background fiber prunes stale entries every 5 minutes via `Effect.Schedule.fixed("5 minutes")`.

### New error

`RateLimitExceeded` tagged error → maps to HTTP 429.

### Files

- New: `backend/src/services/RateLimit.ts`
- Modified: `server.ts` (middleware), `Errors.ts` (new error type)

## 4. Input Validation with Effect Schema

### Helper

`readBody(schema)` replaces `readJson` + `as any`:

```typescript
const readBody = <A>(schema: Schema.Schema<A>) =>
  Effect.gen(function* () {
    const req = yield* HttpServerRequest.HttpServerRequest
    const raw = yield* req.json
    return yield* Schema.decodeUnknown(schema)(raw)
  }).pipe(
    Effect.mapError(() => new ValidationError({ message: "Invalid request body" }))
  )
```

### Schemas

| Endpoint | Schema | Key validations |
|----------|--------|-----------------|
| POST /api/auth/register | RegisterBody | token: NonEmptyString, password: min 8 chars |
| POST /api/auth/login | LoginBody | email: NonEmptyString, password: NonEmptyString |
| POST /api/auth/forgot-password | ForgotPasswordBody | email: NonEmptyString |
| POST /api/auth/reset-password | ResetPasswordBody | token: NonEmptyString, password: min 8 chars |
| POST /api/auth/change-password | ChangePasswordBody | current_password, new_password: min 8 chars |
| POST /api/tests | SaveTestBody | test_type: enum, test_date: string, value_a/b: number |
| POST /api/planner | SavePlannerBody | week_data: Schema.Unknown, default_wu/cd: number |
| POST /api/intervals/connect | ConnectBody | athlete_id: NonEmptyString, api_key: NonEmptyString |
| POST /api/activities/sync | SyncBody | from: DateString, to: DateString |
| POST /api/intervals/export | ExportBody | week_data: Schema.Unknown, start_date: string |
| POST /api/block | CreateBlockBody | start_date, end_date, block_type, assessment, weeks |
| POST /api/block/:id/push | PushBlockBody | mode: Literal("override", "add_alongside") |
| POST /api/admin/invite | InviteBody | email: NonEmptyString |

### What goes away

- All `as any` casts on request bodies
- All manual `if (!body.field)` checks
- The `readJson` helper

### Files

- New: `backend/src/Schemas.ts`
- Modified: `server.ts` (replace readJson with readBody)

## 5. API Key Encryption at Rest

Encrypt `intervals_icu_api_key` before storing in SQLite, decrypt on use.

- AES-256-GCM via Node/Bun `crypto.createCipheriv`
- New env var: `ENCRYPTION_KEY` (32-byte hex string, required in production)
- Store format: `iv:authTag:ciphertext` in existing column (no migration)
- Decrypt only in `Intervals.ts` when making API calls
- Existing stored plaintext keys will be re-encrypted on next connect

### Files

- New: `backend/src/services/Crypto.ts`
- Modified: `Intervals.ts`

## 6. Error Response Sanitization

- Known `TaggedError` types → keep returning specific messages (already good)
- Unknown/unhandled errors → always return `"Internal server error"`
- Log full error server-side via `Effect.logError`
- Never expose stack traces to clients

### Files

- Modified: `server.ts` (error handler)

## 7. Shorten JWT Expiry

- Auth tokens: 30 days → 7 days
- No refresh token mechanism (complexity not warranted for this app)
- Invite tokens stay at 7 days, reset tokens stay at 1 hour

### Files

- Modified: `Auth.ts`

## Out of Scope

- Refresh tokens / token revocation (too complex for app size)
- Security headers CSP/HSTS (handled by Caddy)
- Open redirect fix (medium severity, can do later)
- Request body size limits (medium severity, can do later)
- Frontend localStorage → HttpOnly cookies (large refactor)
