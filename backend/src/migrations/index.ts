import { Effect } from "effect"
import { DatabaseService } from "../services/Database"
import { up as migration001 } from "./001_initial"

const migrations = [
  { name: "001_initial", up: migration001 },
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
      db.run("INSERT INTO migrations (name) VALUES (?)", m.name)
      console.log(`Migration applied: ${m.name}`)
    }
  }
})
