import { Effect, Context, Layer } from "effect"
import { Database as BunSQLite } from "bun:sqlite"

export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  {
    readonly db: BunSQLite
    readonly run: (sql: string, params?: any[]) => Effect.Effect<void>
    readonly get: <T>(sql: string, params?: any[]) => Effect.Effect<T | undefined>
    readonly all: <T>(sql: string, params?: any[]) => Effect.Effect<T[]>
  }
>() {}

export const DatabaseServiceLive = Layer.sync(DatabaseService, () => {
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
})
