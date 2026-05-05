import { Effect, Layer } from "effect"
import { DatabaseServiceLive } from "./services/Database"
import { AuthServiceLive } from "./services/Auth"
import { TestResultsServiceLive } from "./services/TestResults"
import { PlannerServiceLive } from "./services/Planner"
import { IntervalsServiceLive } from "./services/Intervals"
import { WellnessServiceLive } from "./services/Wellness"
import { ActivitiesServiceLive } from "./services/Activities"
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
  TestResultsServiceLive.pipe(Layer.provide(DatabaseServiceLive)),
  PlannerServiceLive.pipe(Layer.provide(DatabaseServiceLive)),
  IntervalsServiceLive.pipe(Layer.provide(DatabaseServiceLive)),
  WellnessServiceLive.pipe(Layer.provide(DatabaseServiceLive)),
  ActivitiesServiceLive.pipe(Layer.provide(DatabaseServiceLive))
)

Effect.runPromise(main.pipe(Effect.provide(MainLive)))
