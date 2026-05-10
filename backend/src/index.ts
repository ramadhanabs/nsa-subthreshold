import { Effect, Layer, Schedule } from "effect"
import { BunRuntime } from "@effect/platform-bun"
import { BunHttpServer } from "@effect/platform-bun"
import { HttpServer } from "@effect/platform"
import { DatabaseService } from "./services/Database"
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
import { runMigrations } from "./migrations"
import { app } from "./server"

const port = Number(process.env.PORT) || 3002

const AppServicesLive = Layer.mergeAll(
  DatabaseService.Default,
  AuthService.Default,
  TestResultsService.Default,
  PlannerService.Default,
  IntervalsService.Default,
  WellnessService.Default,
  ActivitiesService.Default,
  WorkoutExportService.Default,
  BlockService.Default,
  AssessmentService.Default,
  EmailService.Default,
  RateLimitService.Default,
)

const ServerLive = HttpServer.serve(app).pipe(
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layer({ port })),
  Layer.provide(AppServicesLive),
)

const main = Effect.gen(function* () {
  yield* runMigrations
  const rl = yield* RateLimitService
  yield* rl.prune().pipe(
    Effect.schedule(Schedule.fixed("5 minutes")),
    Effect.fork,
  )
}).pipe(Effect.provide(AppServicesLive))

BunRuntime.runMain(
  main.pipe(
    Effect.andThen(Layer.launch(ServerLive))
  )
)
