import { Effect } from "effect"

const main = Effect.gen(function* () {
  console.log("NSA Backend starting on port 3002...")
})

Effect.runPromise(main)
