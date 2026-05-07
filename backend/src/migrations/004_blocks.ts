import type { Database } from "bun:sqlite"

export function up(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nsa_blocks (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id),
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
      status        TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'confirmed', 'pushed', 'completed')),
      start_date    TEXT NOT NULL,
      end_date      TEXT NOT NULL,
      block_type    TEXT NOT NULL DEFAULT 'nsa_4week',
      assessment    TEXT NOT NULL,
      weeks         TEXT NOT NULL,
      icu_sync      TEXT,
      results       TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_nsa_blocks_user   ON nsa_blocks(user_id);
    CREATE INDEX IF NOT EXISTS idx_nsa_blocks_status ON nsa_blocks(status);
    CREATE INDEX IF NOT EXISTS idx_nsa_blocks_start  ON nsa_blocks(start_date);

    CREATE TABLE IF NOT EXISTS nsa_block_events (
      id                TEXT PRIMARY KEY,
      block_id          TEXT NOT NULL REFERENCES nsa_blocks(id) ON DELETE CASCADE,
      date              TEXT NOT NULL,
      week_number       INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 4),
      workout_type      TEXT NOT NULL,
      name              TEXT NOT NULL,
      duration_minutes  INTEGER,
      distance_meters   INTEGER,
      workout_doc       TEXT,
      icu_event_id      TEXT,
      notes             TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_block_events_block ON nsa_block_events(block_id);
    CREATE INDEX IF NOT EXISTS idx_block_events_date  ON nsa_block_events(date);
  `)
}
