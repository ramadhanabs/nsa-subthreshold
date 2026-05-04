import { Effect } from "effect"
import { AuthService } from "./services/Auth"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  })

const errorResponse = (message: string, status: number) =>
  jsonResponse({ error: message }, status)

export const startServer = Effect.gen(function* () {
  const auth = yield* AuthService

  const server = Bun.serve({
    port: 3002,
    fetch: async (req) => {
      const url = new URL(req.url)
      const { pathname } = url

      // Handle CORS preflight
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders })
      }

      try {
        // POST /api/auth/register
        if (req.method === "POST" && pathname === "/api/auth/register") {
          const { email, password } = (await req.json()) as { email: string; password: string }
          if (!email || !password) {
            return errorResponse("email and password are required", 400)
          }
          const result = await Effect.runPromise(
            auth.register(email, password).pipe(
              Effect.catchAll((e) => Effect.fail(e))
            )
          ).catch((e) => { throw e })
          return jsonResponse(result)
        }

        // POST /api/auth/login
        if (req.method === "POST" && pathname === "/api/auth/login") {
          const { email, password } = (await req.json()) as { email: string; password: string }
          if (!email || !password) {
            return errorResponse("email and password are required", 400)
          }
          const result = await Effect.runPromise(
            auth.login(email, password)
          ).catch((e) => { throw e })
          return jsonResponse(result)
        }

        // GET /api/auth/me
        if (req.method === "GET" && pathname === "/api/auth/me") {
          const authHeader = req.headers.get("Authorization")
          if (!authHeader?.startsWith("Bearer ")) {
            return errorResponse("Missing or invalid Authorization header", 401)
          }
          const token = authHeader.slice(7)
          const result = await Effect.runPromise(
            auth.verify(token)
          ).catch((e) => { throw e })
          return jsonResponse(result)
        }

        return errorResponse("Not found", 404)
      } catch (e) {
        const message = e instanceof Error ? e.message : "Internal server error"
        // Classify errors
        if (message.includes("already registered") || message.includes("required")) {
          return errorResponse(message, 400)
        }
        if (message.includes("Invalid") || message.includes("token")) {
          return errorResponse(message, 401)
        }
        console.error("Unhandled error:", e)
        return errorResponse(message, 500)
      }
    },
  })

  console.log(`HTTP server listening on http://localhost:${server.port}`)
  // Keep the effect alive
  yield* Effect.never
})
