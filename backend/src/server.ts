import { Effect } from "effect"
import { AuthService } from "./services/Auth"
import { CalculatorService } from "./services/Calculator"
import { PlannerService } from "./services/Planner"
import { IntervalsService } from "./services/Intervals"
import { WellnessService } from "./services/Wellness"

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

const jsonResponse = (body: unknown, origin: string | null, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  })

const errorResponse = (message: string, status: number, origin: string | null) =>
  jsonResponse({ error: message }, origin, status)

const requireAuth = async (req: Request, auth: Effect.Effect.Success<typeof AuthService>, origin: string | null): Promise<{ error: Response } | { user: { id: string; email: string } }> => {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: errorResponse("Missing or invalid Authorization header", 401, origin) }
  }
  const token = authHeader.slice(7)
  const user = await Effect.runPromise(auth.verify(token))
  return { user }
}

export const startServer = Effect.gen(function* () {
  const auth = yield* AuthService
  const calculator = yield* CalculatorService
  const planner = yield* PlannerService
  const intervals = yield* IntervalsService
  const wellness = yield* WellnessService

  const port = Number(process.env.PORT) || 3002

  const server = Bun.serve({
    port,
    fetch: async (req): Promise<Response> => {
      const url = new URL(req.url)
      const { pathname } = url
      const origin = req.headers.get("Origin")

      // Handle CORS preflight
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(origin) })
      }

      try {
        // POST /api/auth/register
        if (req.method === "POST" && pathname === "/api/auth/register") {
          const { email, password } = (await req.json()) as { email: string; password: string }
          if (!email || !password) {
            return errorResponse("email and password are required", 400, origin)
          }
          const result = await Effect.runPromise(
            auth.register(email, password).pipe(
              Effect.catchAll((e) => Effect.fail(e))
            )
          ).catch((e) => { throw e })
          return jsonResponse(result, origin)
        }

        // POST /api/auth/login
        if (req.method === "POST" && pathname === "/api/auth/login") {
          const { email, password } = (await req.json()) as { email: string; password: string }
          if (!email || !password) {
            return errorResponse("email and password are required", 400, origin)
          }
          const result = await Effect.runPromise(
            auth.login(email, password)
          ).catch((e) => { throw e })
          return jsonResponse(result, origin)
        }

        // GET /api/auth/me
        if (req.method === "GET" && pathname === "/api/auth/me") {
          const authHeader = req.headers.get("Authorization")
          if (!authHeader?.startsWith("Bearer ")) {
            return errorResponse("Missing or invalid Authorization header", 401, origin)
          }
          const token = authHeader.slice(7)
          const result = await Effect.runPromise(
            auth.verify(token)
          ).catch((e) => { throw e })
          return jsonResponse(result, origin)
        }

        // POST /api/calculator
        if (req.method === "POST" && pathname === "/api/calculator") {
          const authResult = await requireAuth(req, auth, origin)
          if ("error" in authResult) return authResult.error
          const { input_mode, input_a, input_b, max_hr } = (await req.json()) as any
          const result = await Effect.runPromise(
            calculator.save(authResult.user.id, { input_mode, input_a, input_b, max_hr })
          )
          return jsonResponse(result, origin)
        }

        // GET /api/calculator or /api/calculator/:id
        if (req.method === "GET" && pathname.startsWith("/api/calculator")) {
          const authResult = await requireAuth(req, auth, origin)
          if ("error" in authResult) return authResult.error
          const idSegment = pathname.slice("/api/calculator".length)
          if (idSegment && idSegment !== "/") {
            const id = idSegment.startsWith("/") ? idSegment.slice(1) : idSegment
            const result = await Effect.runPromise(
              calculator.getById(authResult.user.id, id)
            )
            if (!result) return errorResponse("Not found", 404, origin)
            return jsonResponse(result, origin)
          }
          const results = await Effect.runPromise(
            calculator.list(authResult.user.id)
          )
          return jsonResponse(results, origin)
        }

        // POST /api/planner
        if (req.method === "POST" && pathname === "/api/planner") {
          const authResult = await requireAuth(req, auth, origin)
          if ("error" in authResult) return authResult.error
          const { week_data, default_wu, default_cd, name } = (await req.json()) as any
          const result = await Effect.runPromise(
            planner.save(authResult.user.id, { week_data, default_wu, default_cd, name })
          )
          return jsonResponse(result, origin)
        }

        // GET /api/planner or /api/planner/:id
        if (req.method === "GET" && pathname.startsWith("/api/planner")) {
          const authResult = await requireAuth(req, auth, origin)
          if ("error" in authResult) return authResult.error
          const idSegment = pathname.slice("/api/planner".length)
          if (idSegment && idSegment !== "/") {
            const id = idSegment.startsWith("/") ? idSegment.slice(1) : idSegment
            const result = await Effect.runPromise(
              planner.getById(authResult.user.id, id)
            )
            if (!result) return errorResponse("Not found", 404, origin)
            return jsonResponse(result, origin)
          }
          const results = await Effect.runPromise(
            planner.list(authResult.user.id)
          )
          return jsonResponse(results, origin)
        }

        // POST /api/intervals/connect
        if (req.method === "POST" && pathname === "/api/intervals/connect") {
          const authResult = await requireAuth(req, auth, origin)
          if ("error" in authResult) return authResult.error
          const { athlete_id, api_key } = (await req.json()) as { athlete_id: string; api_key: string }
          if (!athlete_id || !api_key) {
            return errorResponse("athlete_id and api_key are required", 400, origin)
          }
          await Effect.runPromise(
            intervals.connect(authResult.user.id, athlete_id, api_key)
          )
          return jsonResponse({ ok: true }, origin)
        }

        // POST /api/intervals/sync
        if (req.method === "POST" && pathname === "/api/intervals/sync") {
          const authResult = await requireAuth(req, auth, origin)
          if ("error" in authResult) return authResult.error
          const synced = await Effect.runPromise(
            intervals.syncWellness(authResult.user.id)
          ).catch((e) => { throw e })
          return jsonResponse({ synced }, origin)
        }

        // GET /api/wellness
        if (req.method === "GET" && pathname === "/api/wellness") {
          const authResult = await requireAuth(req, auth, origin)
          if ("error" in authResult) return authResult.error
          const from = url.searchParams.get("from") ?? undefined
          const to = url.searchParams.get("to") ?? undefined
          const records = await Effect.runPromise(
            wellness.list(authResult.user.id, from, to)
          )
          return jsonResponse(records, origin)
        }

        return errorResponse("Not found", 404, origin)
      } catch (e) {
        const message = e instanceof Error ? e.message : "Internal server error"
        // Classify errors
        if (message.includes("already registered") || message.includes("required")) {
          return errorResponse(message, 400, origin)
        }
        if (message.includes("Invalid") || message.includes("token")) {
          return errorResponse(message, 401, origin)
        }
        console.error("Unhandled error:", e)
        return errorResponse(message, 500, origin)
      }
    },
  })

  console.log(`HTTP server listening on http://localhost:${server.port}`)
  // Keep the effect alive
  yield* Effect.never
})
