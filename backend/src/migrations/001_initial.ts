import type { Database } from "bun:sqlite"

export function up(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      intervals_icu_athlete_id TEXT,
      intervals_icu_api_key TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS calculator_results (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      input_mode TEXT NOT NULL,
      input_a INTEGER NOT NULL,
      input_b INTEGER NOT NULL,
      max_hr INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS planner_results (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      week_data TEXT NOT NULL,
      default_wu INTEGER NOT NULL DEFAULT 10,
      default_cd INTEGER NOT NULL DEFAULT 10,
      name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wellness_data (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      resting_hr REAL,
      hrv REAL,
      sleep_hours REAL,
      weight REAL,
      atl REAL,
      ctl REAL,
      tsb REAL,
      source TEXT NOT NULL DEFAULT 'manual',
      synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, date, source)
    );
  `)
}
