import { Effect, Data } from "effect"
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

const readJson = Effect.gen(function* () {
  const req = yield* HttpServerRequest.HttpServerRequest
  const raw = yield* req.json
  return raw as any
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
    const body = yield* readJson
    if (!body.token || !body.password) return yield* badRequest("token and password are required")
    const auth = yield* AuthService
    const result = yield* auth.register(body.token, body.password)
    // Send welcome email (fire and forget)
    const emailSvc = yield* EmailService
    yield* emailSvc.sendWelcome(result.email).pipe(Effect.catchAll(() => Effect.void))
    return yield* json(result)
  })),

  HttpRouter.post("/api/auth/login", Effect.gen(function* () {
    const body = yield* readJson as Effect.Effect<{ email: string; password: string }>
    if (!body.email || !body.password) return yield* badRequest("email and password are required")
    const auth = yield* AuthService
    const result = yield* auth.login(body.email, body.password)
    return yield* json(result)
  })),

  HttpRouter.get("/api/auth/me", Effect.gen(function* () {
    const user = yield* extractUser
    return yield* json(user)
  })),

  HttpRouter.post("/api/auth/change-password", Effect.gen(function* () {
    const user = yield* extractUser
    const body = yield* readJson
    if (!body.currentPassword || !body.newPassword) return yield* badRequest("currentPassword and newPassword are required")
    if (body.newPassword.length < 8) return yield* badRequest("Password must be at least 8 characters")
    const auth = yield* AuthService
    const result = yield* auth.changePassword(user.id, body.currentPassword, body.newPassword)
    return yield* json(result)
  })),

  HttpRouter.post("/api/auth/forgot-password", Effect.gen(function* () {
    const body = yield* readJson
    if (!body.email) return yield* badRequest("email is required")
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
    const body = yield* readJson
    if (!body.token || !body.password) return yield* badRequest("token and password are required")
    if (body.password.length < 8) return yield* badRequest("Password must be at least 8 characters")
    const auth = yield* AuthService
    const result = yield* auth.resetPassword(body.token, body.password)
    return yield* json(result)
  })),
)

// Tests
const testRoutes = HttpRouter.empty.pipe(
  HttpRouter.post("/api/tests", Effect.gen(function* () {
    const user = yield* extractUser
    const body = yield* readJson
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
    const user = yield* extractUser
    const body = yield* readJson as Effect.Effect<any>
    const planner = yield* PlannerService
    const result = yield* planner.save(user.id, body)
    return yield* json(result)
  })),
)

// Intervals.icu
const intervalsRoutes = HttpRouter.empty.pipe(
  HttpRouter.post("/api/intervals/connect", Effect.gen(function* () {
    const user = yield* extractUser
    const body = yield* readJson as Effect.Effect<{ athlete_id: string; api_key: string }>
    if (!body.athlete_id || !body.api_key) return yield* badRequest("athlete_id and api_key are required")
    const intervals = yield* IntervalsService
    yield* intervals.connect(user.id, body.athlete_id, body.api_key)
    return yield* json({ ok: true })
  })),

  HttpRouter.post("/api/intervals/sync", Effect.gen(function* () {
    const user = yield* extractUser
    const intervals = yield* IntervalsService
    const synced = yield* intervals.syncWellness(user.id)
    return yield* json({ synced })
  })),

  HttpRouter.post("/api/intervals/export", Effect.gen(function* () {
    const user = yield* extractUser
    const body = yield* readJson as Effect.Effect<any>
    if (!body.week_data || !body.start_date) return yield* badRequest("week_data and start_date are required")
    const workoutExport = yield* WorkoutExportService
    const exported = yield* workoutExport.exportWeek(user.id, body)
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
    const user = yield* extractUser
    const body = yield* readJson as Effect.Effect<{ from: string; to: string }>
    if (!body.from || !body.to) return yield* badRequest("from and to are required")
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
    const user = yield* extractUser
    const assess = yield* AssessmentService
    const result = yield* assess.assess(user.id)
    return yield* json(result)
  })),

  HttpRouter.post("/api/block", Effect.gen(function* () {
    const user = yield* extractUser
    const body = yield* readJson as Effect.Effect<any>
    const blocks = yield* BlockService
    const result = yield* blocks.save(user.id, body)
    return yield* json(result, 201)
  })),
)

// Admin
const adminRoutes = HttpRouter.empty.pipe(
  HttpRouter.post("/api/admin/invite", Effect.gen(function* () {
    const admin = yield* extractAdmin
    const body = yield* readJson
    if (!body.email) return yield* badRequest("email is required")
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
      const user = yield* extractUser
      const id = pathname.slice("/api/tests/".length)
      const tests = yield* TestResultsService
      const deleted = yield* tests.remove(user.id, id)
      if (!deleted) return yield* notFound()
      return yield* json({ ok: true })
    }

    // GET /api/planner/:id or list
    if (method === "GET" && pathname.startsWith("/api/planner")) {
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
      const user = yield* extractUser
      const id = pathname.split("/")[3]
      const body = yield* readJson as Effect.Effect<{ mode: "override" | "add_alongside" }>
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
          }
        }
        const message = err instanceof Error ? err.message : String(err)
        return Effect.gen(function* () {
          yield* Effect.logError("Unhandled error").pipe(Effect.annotateLogs("error", message))
          return yield* jsonError(message, 500)
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
