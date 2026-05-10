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
        const svc = yield* RateLimitService
        // auth tier allows 10 requests
        for (let i = 0; i < 10; i++) {
          yield* svc.check("1.2.3.4", "auth")
        }
      })
    )
  })

  it("blocks requests over the auth limit (10)", async () => {
    const result = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const svc = yield* RateLimitService
        for (let i = 0; i < 11; i++) {
          yield* svc.check("1.2.3.4", "auth")
        }
      }).pipe(Effect.provide(RateLimitService.Default))
    )

    expect(result._tag).toBe("Failure")
  })

  it("tracks different IPs independently", async () => {
    await runTest(
      Effect.gen(function* () {
        const svc = yield* RateLimitService
        // Fill up IP A to its auth limit
        for (let i = 0; i < 10; i++) {
          yield* svc.check("10.0.0.1", "auth")
        }
        // IP B should still be allowed
        yield* svc.check("10.0.0.2", "auth")
      })
    )
  })

  it("tracks different tiers independently", async () => {
    await runTest(
      Effect.gen(function* () {
        const svc = yield* RateLimitService
        // Fill up auth tier for this IP
        for (let i = 0; i < 10; i++) {
          yield* svc.check("1.2.3.4", "auth")
        }
        // write tier should still be allowed (separate counter)
        yield* svc.check("1.2.3.4", "write")
        // read tier should still be allowed
        yield* svc.check("1.2.3.4", "read")
      })
    )
  })
})
