import type { Database } from "bun:sqlite"

export function up(db: Database) {
  db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`)
}
