import { Effect, Data, Schema } from "effect"
import {
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform"
import { AuthService } from "./services/Auth"
import { TestResultsService } from "./services/TestResults"
import { PlannerService } from "./services/Planner"
import { IntervalsService } from "./services/Intervals"
import { WellnessService } from "./services/Wellness"
import { ActivitiesService } from "./services/Activities"
import { WorkoutExportService } from "./services/WorkoutExport"
import { BlockService } from "./services/Block"
import { AssessmentService } from "./services/Assessment"
import { EmailService } from "./services/Email"
import { RateLimitService } from "./services/RateLimit"
import * as S from "./Schemas"

// ── HTTP Error ────────────────────────────────────────────────────────

class HttpError extends Data.TaggedError("HttpError")<{
  status: number
  message: string
}> {}

const badRequest = (message: string) => new HttpError({ status: 400, message })
const unauthorized = (message: string) => new HttpError({ status: 401, message })
const notFound = () => new HttpError({ status: 404, message: "Not found" })

// ── CORS ──────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  "https://subthreshold.bagus.icu",
  "http://localhost:5173",
]

const corsHeaders = (origin: string | null): Record<string, string> => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin
  }
  return headers
}

// ── Auth middleware ───────────────────────────────────────────────────

const extractUser = Effect.gen(function* () {
  const req = yield* HttpServerRequest.HttpServerRequest
  const authHeader = req.headers["authorization"]
  if (!authHeader?.startsWith("Bearer ")) {
    return yield* unauthorized("Missing or invalid Authorization header")
  }
  const token = authHeader.slice(7)
  const auth = yield* AuthService
  return yield* auth.verify(token)
})

const extractAdmin = Effect.gen(function* () {
  const user = yield* extractUser
  const auth = yield* AuthService
  const admin = yield* auth.isAdmin(user.id)
  if (!admin) return yield* new HttpError({ status: 403, message: "Admin access required" })
  return user
})

const readBody = <A, I>(schema: Schema.Schema<A, I>) =>
  Effect.gen(function* () {
    const req = yield* HttpServerRequest.HttpServerRequest
    const raw = yield* req.json
    return yield* Schema.decodeUnknown(schema)(raw).pipe(
      Effect.mapError((e) => new HttpError({ status: 400, message: `Invalid request body: ${e.message}` }))
    )
  })

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

// ── Response helpers ─────────────────────────────────────────────────

const json = (body: unknown, status = 200) =>
  HttpServerResponse.json(body, { status })

const jsonError = (message: string, status: number) =>
  HttpServerResponse.json({ error: message }, { status })

// ── Routes ───────────────────────────────────────────────────────────

// Auth (public)
const authRoutes = HttpRouter.empty.pipe(
  HttpRouter.post("/api/auth/register", Effect.gen(function* () {
    yield* rateLimit("auth")
    const body = yield* readBody(S.RegisterBody)
    const auth = yield* AuthService
    const result = yield* auth.register(body.token, body.password)
    // Send welcome email (fire and forget)
    const emailSvc = yield* EmailService
    yield* emailSvc.sendWelcome(result.email).pipe(Effect.catchAll(() => Effect.void))
    return yield* json(result)
  })),

  HttpRouter.post("/api/auth/login", Effect.gen(function* () {
    yield* rateLimit("auth")
    const body = yield* readBody(S.LoginBody)
    const auth = yield* AuthService
    const result = yield* auth.login(body.email, body.password)
    return yield* json(result)
  })),

  HttpRouter.get("/api/auth/me", Effect.gen(function* () {
    const user = yield* extractUser
    return yield* json(user)
  })),

  HttpRouter.post("/api/auth/change-password", Effect.gen(function* () {
    yield* rateLimit("write")
    const user = yield* extractUser
    const body = yield* readBody(S.ChangePasswordBody)
    const auth = yield* AuthService
    const result = yield* auth.changePassword(user.id, body.currentPassword, body.newPassword)
    return yield* json(result)
  })),

  HttpRouter.post("/api/auth/forgot-password", Effect.gen(function* () {
    yield* rateLimit("auth")
    const body = yield* readBody(S.ForgotPasswordBody)
    const auth = yield* AuthService
    const token = yield* auth.createResetToken(body.email)
    if (token) {
      const emailSvc = yield* EmailService
      yield* emailSvc.sendResetPassword(body.email, token).pipe(Effect.catchAll(() => Effect.void))
    }
    // Always return success to not reveal if email exists
    return yield* json({ ok: true })
  })),

  HttpRouter.post("/api/auth/reset-password", Effect.gen(function* () {
    yield* rateLimit("auth")
    const body = yield* readBody(S.ResetPasswordBody)
    const auth = yield* AuthService
    const result = yield* auth.resetPassword(body.token, body.password)
    return yield* json(result)
  })),
)

// Tests
const testRoutes = HttpRouter.empty.pipe(
  HttpRouter.post("/api/tests", Effect.gen(function* () {
    yield* rateLimit("write")
    const user = yield* extractUser
    const body = yield* readBody(S.SaveTestBody)
    const tests = yield* TestResultsService
    const result = yield* tests.save(user.id, body as any)
    return yield* json(result)
  })),

  HttpRouter.get("/api/tests", Effect.gen(function* () {
    const user = yield* extractUser
    const tests = yield* TestResultsService
    const result = yield* tests.list(user.id)
    return yield* json(result)
  })),
)

// Planner
const plannerRoutes = HttpRouter.empty.pipe(
  HttpRouter.post("/api/planner", Effect.gen(function* () {
    yield* rateLimit("write")
    const user = yield* extractUser
    const body = yield* readBody(S.SavePlannerBody)
    const planner = yield* PlannerService
    const result = yield* planner.save(user.id, body as any)
    return yield* json(result)
  })),
)

// Intervals.icu
const intervalsRoutes = HttpRouter.empty.pipe(
  HttpRouter.post("/api/intervals/connect", Effect.gen(function* () {
    yield* rateLimit("write")
    const user = yield* extractUser
    const body = yield* readBody(S.ConnectBody)
    const intervals = yield* IntervalsService
    yield* intervals.connect(user.id, body.athlete_id, body.api_key)
    return yield* json({ ok: true })
  })),

  HttpRouter.post("/api/intervals/sync", Effect.gen(function* () {
    yield* rateLimit("write")
    const user = yield* extractUser
    const intervals = yield* IntervalsService
    const synced = yield* intervals.syncWellness(user.id)
    return yield* json({ synced })
  })),

  HttpRouter.post("/api/intervals/export", Effect.gen(function* () {
    yield* rateLimit("write")
    const user = yield* extractUser
    const body = yield* readBody(S.ExportBody)
    const workoutExport = yield* WorkoutExportService
    const exported = yield* workoutExport.exportWeek(user.id, body as any)
    return yield* json({ exported })
  })),
)

// Wellness
const wellnessRoutes = HttpRouter.empty.pipe(
  HttpRouter.get("/api/wellness", Effect.gen(function* () {
    const user = yield* extractUser
    const req = yield* HttpServerRequest.HttpServerRequest
    const url = new URL(req.url, "http://localhost")
    const from = url.searchParams.get("from") ?? undefined
    const to = url.searchParams.get("to") ?? undefined
    const wellness = yield* WellnessService
    const result = yield* wellness.list(user.id, from, to)
    return yield* json(result)
  })),
)

// Activities
const activityRoutes = HttpRouter.empty.pipe(
  HttpRouter.post("/api/activities/sync", Effect.gen(function* () {
    yield* rateLimit("write")
    const user = yield* extractUser
    const body = yield* readBody(S.SyncBody)
    const activities = yield* ActivitiesService
    const synced = yield* activities.sync(user.id, body.from, body.to)
    return yield* json({ synced })
  })),

  HttpRouter.get("/api/activities", Effect.gen(function* () {
    const user = yield* extractUser
    const req = yield* HttpServerRequest.HttpServerRequest
    const url = new URL(req.url, "http://localhost")
    const from = url.searchParams.get("from") ?? undefined
    const to = url.searchParams.get("to") ?? undefined
    const activities = yield* ActivitiesService
    const result = yield* activities.list(user.id, from, to)
    return yield* json(result)
  })),
)

// Block generator
const blockRoutes = HttpRouter.empty.pipe(
  HttpRouter.post("/api/block/assess", Effect.gen(function* () {
    yield* rateLimit("write")
    const user = yield* extractUser
    const assess = yield* AssessmentService
    const result = yield* assess.assess(user.id)
    return yield* json(result)
  })),

  HttpRouter.post("/api/block", Effect.gen(function* () {
    yield* rateLimit("write")
    const user = yield* extractUser
    const body = yield* readBody(S.CreateBlockBody)
    const blocks = yield* BlockService
    const result = yield* blocks.save(user.id, body as any)
    return yield* json(result, 201)
  })),
)

// Admin
const adminRoutes = HttpRouter.empty.pipe(
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
)

// ── Combined router ──────────────────────────────────────────────────

const router = HttpRouter.empty.pipe(
  HttpRouter.concat(authRoutes),
  HttpRouter.concat(testRoutes),
  HttpRouter.concat(plannerRoutes),
  HttpRouter.concat(intervalsRoutes),
  HttpRouter.concat(wellnessRoutes),
  HttpRouter.concat(activityRoutes),
  HttpRouter.concat(blockRoutes),
  HttpRouter.concat(adminRoutes),

  // Routes that need path parsing (can't use static router)
  HttpRouter.all("*", Effect.gen(function* () {
    const req = yield* HttpServerRequest.HttpServerRequest
    const url = new URL(req.url, "http://localhost")
    const { pathname } = url
    const method = req.method

    // DELETE /api/tests/:id
    if (method === "DELETE" && pathname.startsWith("/api/tests/")) {
      yield* rateLimit("write")
      const user = yield* extractUser
      const id = pathname.slice("/api/tests/".length)
      const tests = yield* TestResultsService
      const deleted = yield* tests.remove(user.id, id)
      if (!deleted) return yield* notFound()
      return yield* json({ ok: true })
    }

    // GET /api/planner/:id or list
    if (method === "GET" && pathname.startsWith("/api/planner")) {
      yield* rateLimit("read")
      const user = yield* extractUser
      const planner = yield* PlannerService
      const idSegment = pathname.slice("/api/planner".length)
      if (idSegment && idSegment !== "/") {
        const id = idSegment.startsWith("/") ? idSegment.slice(1) : idSegment
        const result = yield* planner.getById(user.id, id)
        if (!result) return yield* notFound()
        return yield* json(result)
      }
      return yield* json(yield* planner.list(user.id))
    }

    // POST /api/block/:id/push
    if (method === "POST" && pathname.match(/^\/api\/block\/[^/]+\/push$/)) {
      yield* rateLimit("write")
      const user = yield* extractUser
      const id = pathname.split("/")[3]
      const body = yield* readBody(S.PushBlockBody)
      const blocks = yield* BlockService
      const blockData = yield* blocks.getById(user.id, id)
      if (!blockData) return yield* notFound()
      const workoutExport = yield* WorkoutExportService
      const exported = yield* workoutExport.exportWeek(user.id, {
        week_data: JSON.parse(blockData.weeks),
        start_date: blockData.start_date,
        default_wu: 10,
        default_cd: 5,
      })
      yield* blocks.setSyncData(user.id, id, {
        pushedAt: new Date().toISOString(),
        pushMode: body.mode,
        eventCount: exported,
      })
      return yield* json({ ok: true, exported })
    }

    // GET /api/block or /api/block/:id
    if (method === "GET" && pathname.startsWith("/api/block")) {
      yield* rateLimit("read")
      const user = yield* extractUser
      const blocks = yield* BlockService
      const idSegment = pathname.slice("/api/block".length)
      if (idSegment && idSegment !== "/") {
        const id = idSegment.startsWith("/") ? idSegment.slice(1) : idSegment
        const result = yield* blocks.getById(user.id, id)
        if (!result) return yield* notFound()
        return yield* json(result)
      }
      return yield* json(yield* blocks.list(user.id))
    }

    // DELETE /api/block/:id
    if (method === "DELETE" && pathname.startsWith("/api/block/")) {
      yield* rateLimit("write")
      const user = yield* extractUser
      const id = pathname.slice("/api/block/".length)
      const blocks = yield* BlockService
      yield* blocks.delete(user.id, id)
      return yield* json({ ok: true })
    }

    return yield* notFound()
  })),
)

// ── CORS + Error handling middleware ──────────────────────────────────

const withCors = HttpRouter.use(router, (handler) =>
  Effect.gen(function* () {
    const req = yield* HttpServerRequest.HttpServerRequest
    const origin = req.headers["origin"] ?? null

    // CORS preflight
    if (req.method === "OPTIONS") {
      return HttpServerResponse.empty({ status: 204, headers: corsHeaders(origin) })
    }

    const start = performance.now()

    const response = yield* handler.pipe(
      // Handle all errors
      Effect.catchAll((err) => {
        if (err instanceof HttpError) return jsonError(err.message, err.status)
        if ("_tag" in (err as any)) {
          const tagged = err as { _tag: string; message?: string }
          switch (tagged._tag) {
            case "EmailAlreadyRegistered": return jsonError("Email already registered", 400)
            case "InvalidCredentials": return jsonError("Invalid email or password", 401)
            case "InvalidToken": return jsonError(`Invalid token: ${(err as any).reason}`, 401)
            case "NotFoundError": return jsonError("Not found", 404)
            case "ValidationError": return jsonError((err as any).message, 400)
            case "IntervalsNotConnected": return jsonError("Intervals.icu not connected", 400)
            case "IntervalsApiError": return jsonError((err as any).message, 502)
            case "InvitationRequired": return jsonError("Valid invitation required", 400)
            case "InvitationExpired": return jsonError("Invitation expired or invalid", 400)
            case "NotAdmin": return jsonError("Admin access required", 403)
            case "PasswordMismatch": return jsonError("Current password is incorrect", 400)
            case "ResetTokenExpired": return jsonError("Reset link expired or invalid", 400)
            case "RateLimitExceeded": return jsonError("Too many requests, try again later", 429)
          }
        }
        const detail = err instanceof Error ? err.message : String(err)
        return Effect.gen(function* () {
          yield* Effect.logError("Unhandled error").pipe(Effect.annotateLogs("error", detail))
          return yield* jsonError("Internal server error", 500)
        })
      }),
    )

    const url = new URL(req.url, "http://localhost")
    yield* Effect.logInfo("request").pipe(
      Effect.annotateLogs("method", req.method),
      Effect.annotateLogs("path", url.pathname),
      Effect.annotateLogs("status", String(response.status)),
      Effect.annotateLogs("duration_ms", String(Math.round(performance.now() - start))),
    )

    // Add CORS headers to response
    return HttpServerResponse.setHeaders(response, corsHeaders(origin))
  })
)

// ── Server layer ─────────────────────────────────────────────────────

export { withCors as app }
