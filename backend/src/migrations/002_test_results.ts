import type { Database } from "bun:sqlite"

export function up(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_results (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      test_type TEXT NOT NULL,
      test_date TEXT NOT NULL,
      value_a INTEGER NOT NULL,
      value_b INTEGER NOT NULL,
      max_hr INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    DROP TABLE IF EXISTS calculator_results;
  `)
}
