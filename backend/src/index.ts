import { Effect, Layer } from "effect"
import { DatabaseServiceLive } from "./services/Database"
import { runMigrations } from "./migrations"

const main = Effect.gen(function* () {
  yield* runMigrations
  console.log("NSA Backend starting on port 3002...")
})

const MainLive = DatabaseServiceLive

Effect.runPromise(main.pipe(Effect.provide(MainLive)))
