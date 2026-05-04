import { Effect, Layer } from "effect"
import { DatabaseServiceLive } from "./services/Database"
import { AuthServiceLive } from "./services/Auth"
import { runMigrations } from "./migrations"
import { startServer } from "./server"

const main = Effect.gen(function* () {
  yield* runMigrations
  yield* startServer
})

// AuthServiceLive depends on DatabaseService, so merge both into a single layer
const MainLive = Layer.merge(
  DatabaseServiceLive,
  AuthServiceLive.pipe(Layer.provide(DatabaseServiceLive))
)

Effect.runPromise(main.pipe(Effect.provide(MainLive)))
