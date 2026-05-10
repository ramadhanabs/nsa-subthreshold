import { Effect } from "effect"
import { Database as BunSQLite } from "bun:sqlite"

export class DatabaseService extends Effect.Service<DatabaseService>()("DatabaseService", {
  sync: () => {
    const db = new BunSQLite("nsa.db")
    db.exec("PRAGMA journal_mode = WAL")
    db.exec("PRAGMA foreign_keys = ON")

    return {
      db,
      run: (sql: string, params: any[] = []) =>
        Effect.sync(() => { db.run(sql, ...params) }),
      get: <T>(sql: string, params: any[] = []) =>
        Effect.sync(() => db.query(sql).get(...params) as T | undefined),
      all: <T>(sql: string, params: any[] = []) =>
        Effect.sync(() => db.query(sql).all(...params) as T[]),
    }
  },
}) {}
