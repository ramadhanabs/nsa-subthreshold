import { Effect } from "effect"
import { DatabaseService } from "../services/Database"
import { up as migration001 } from "./001_initial"
import { up as migration002 } from "./002_test_results"
import { up as migration003 } from "./003_activities"
import { up as migration004 } from "./004_blocks"

const migrations = [
  { name: "001_initial", up: migration001 },
  { name: "002_test_results", up: migration002 },
  { name: "003_activities", up: migration003 },
  { name: "004_blocks", up: migration004 },
]

export const runMigrations = Effect.gen(function* () {
  const { db, all } = yield* DatabaseService

  db.exec(`CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`)

  const applied = yield* all<{ name: string }>("SELECT name FROM migrations")
  const appliedNames = new Set(applied.map((m) => m.name))

  for (const m of migrations) {
    if (!appliedNames.has(m.name)) {
      m.up(db)
      db.run("INSERT INTO migrations (name) VALUES (?)", [m.name])
      console.log(`Migration applied: ${m.name}`)
    }
  }
})
