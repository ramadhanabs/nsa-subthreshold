import { Effect, Layer } from "effect"
import { DatabaseServiceLive } from "./services/Database"
import { AuthServiceLive } from "./services/Auth"
import { CalculatorServiceLive } from "./services/Calculator"
import { PlannerServiceLive } from "./services/Planner"
import { runMigrations } from "./migrations"
import { startServer } from "./server"

const main = Effect.gen(function* () {
  yield* runMigrations
  yield* startServer
})

// All service layers depend on DatabaseService
const MainLive = Layer.mergeAll(
  DatabaseServiceLive,
  AuthServiceLive.pipe(Layer.provide(DatabaseServiceLive)),
  CalculatorServiceLive.pipe(Layer.provide(DatabaseServiceLive)),
  PlannerServiceLive.pipe(Layer.provide(DatabaseServiceLive))
)

Effect.runPromise(main.pipe(Effect.provide(MainLive)))
