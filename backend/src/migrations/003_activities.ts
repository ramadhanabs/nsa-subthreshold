import type { Database } from "bun:sqlite"

export function up(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      intervals_id TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'Run',
      name TEXT,
      distance_m REAL,
      duration_secs REAL,
      avg_pace REAL,
      avg_hr REAL,
      moving_time REAL,
      synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, intervals_id)
    );
  `)
}
