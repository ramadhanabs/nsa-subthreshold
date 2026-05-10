import { Effect, Ref, HashMap } from "effect"
import { RateLimitExceeded } from "./Errors"

type Tier = "auth" | "write" | "read"

interface Entry {
  count: number
  start: number
}

const TIER_CONFIG: Record<Tier, { limit: number; windowMs: number }> = {
  auth:  { limit: 10,  windowMs: 15 * 60 * 1000 },
  write: { limit: 60,  windowMs: 60 * 1000 },
  read:  { limit: 120, windowMs: 60 * 1000 },
}

export class RateLimitService extends Effect.Service<RateLimitService>()("RateLimitService", {
  effect: Effect.gen(function* () {
    const ref = yield* Ref.make(HashMap.empty<string, Entry>())

    return {
      check: (ip: string, tier: Tier) =>
        Effect.gen(function* () {
          const key = `${ip}:${tier}`
          const config = TIER_CONFIG[tier]
          const now = Date.now()

          yield* Ref.update(ref, (map) => {
            const existing = HashMap.get(map, key)

            if (existing._tag === "None") {
              return HashMap.set(map, key, { count: 1, start: now })
            }

            const entry = existing.value
            // Window expired — reset
            if (now - entry.start >= config.windowMs) {
              return HashMap.set(map, key, { count: 1, start: now })
            }

            // Within window — increment
            return HashMap.set(map, key, { count: entry.count + 1, start: entry.start })
          })

          // Check after increment
          const map = yield* Ref.get(ref)
          const entry = HashMap.get(map, key)
          if (entry._tag === "Some" && entry.value.count > config.limit) {
            return yield* new RateLimitExceeded()
          }
        }),

      prune: () =>
        Ref.update(ref, (map) => {
          const now = Date.now()
          let result = map
          for (const [key, entry] of map) {
            const tier = key.split(":").pop() as Tier
            const config = TIER_CONFIG[tier]
            if (now - entry.start >= config.windowMs) {
              result = HashMap.remove(result, key)
            }
          }
          return result
        }),
    }
  }),
}) {}
