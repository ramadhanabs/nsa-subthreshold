# Backend Implementation Plan — Bun + Effect-TS + SQLite

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a REST API backend with email/password auth, calculator/planner persistence, and Intervals.icu wellness sync.

**Architecture:** Bun runtime with Effect-TS service layers. SQLite database with migration system. JWT auth middleware. All code in `backend/` directory of the existing monorepo. Deployed behind Caddy reverse proxy on port 3002.

**Tech Stack:** Bun, Effect-TS (`effect`, `@effect/platform`, `@effect/schema`), SQLite (bun:sqlite), bcrypt (bun built-in), JWT (jose)

---

### Task 1: Scaffold backend project

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/index.ts`

**Step 1: Initialize the backend directory**

```bash
mkdir -p backend/src
cd backend
```

**Step 2: Create package.json**

```json
{
  "name": "nsa-backend",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts",
    "test": "bun test"
  },
  "dependencies": {
    "effect": "^3.14.0",
    "@effect/platform": "^0.78.0",
    "@effect/platform-bun": "^0.52.0",
    "@effect/schema": "^0.78.0",
    "jose": "^6.0.0"
  }
}
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "declaration": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "types": ["bun-types"]
  },
  "include": ["src"]
}
```

**Step 4: Create minimal entry point**

`backend/src/index.ts`:
```ts
import { Effect, Layer } from "effect"

const main = Effect.gen(function* () {
  console.log("NSA Backend starting on port 3002...")
})

Effect.runPromise(main)
```

**Step 5: Install dependencies and verify**

```bash
cd backend && bun install && bun run dev
```
Expected: "NSA Backend starting on port 3002..."

**Step 6: Commit**

```bash
git add backend/
git commit -m "feat: scaffold backend with Bun + Effect-TS"
```

---

### Task 2: Database service with migrations

**Files:**
- Create: `backend/src/services/Database.ts`
- Create: `backend/src/migrations/001_initial.ts`
- Create: `backend/src/migrations/index.ts`

**Step 1: Create the DatabaseService**

`backend/src/services/Database.ts`:
```ts
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
```

**Step 2: Create initial migration**

`backend/src/migrations/001_initial.ts`:
```ts
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

    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}
```

**Step 3: Create migration runner**

`backend/src/migrations/index.ts`:
```ts
import { Effect } from "effect"
import { DatabaseService } from "../services/Database"
import { up as migration001 } from "./001_initial"

const migrations = [
  { name: "001_initial", up: migration001 },
]

export const runMigrations = Effect.gen(function* () {
  const { db, all } = yield* DatabaseService

  // Ensure migrations table exists
  db.exec(`CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY,
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
```

**Step 4: Verify migrations run**

Update `backend/src/index.ts` to run migrations:
```ts
import { Effect, Layer } from "effect"
import { DatabaseService, DatabaseServiceLive } from "./services/Database"
import { runMigrations } from "./migrations"

const main = Effect.gen(function* () {
  yield* runMigrations
  console.log("NSA Backend starting on port 3002...")
})

const MainLive = Layer.merge(DatabaseServiceLive)

Effect.runPromise(main.pipe(Effect.provide(MainLive)))
```

Run: `cd backend && bun run dev`
Expected: "Migration applied: 001_initial" then "NSA Backend starting on port 3002..."

**Step 5: Commit**

```bash
git add backend/
git commit -m "feat: add database service with SQLite migrations"
```

---

### Task 3: Auth service (register + login + JWT)

**Files:**
- Create: `backend/src/services/Auth.ts`
- Create: `backend/src/middleware/auth.ts`
- Test: `backend/src/services/Auth.test.ts`

**Step 1: Create AuthService**

`backend/src/services/Auth.ts`:
```ts
import { Effect, Context, Layer } from "effect"
import { DatabaseService } from "./Database"
import { SignJWT, jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nsa-dev-secret-change-in-production"
)

export interface User {
  id: string
  email: string
  password_hash: string
  intervals_icu_athlete_id: string | null
  intervals_icu_api_key: string | null
  created_at: string
  updated_at: string
}

export class AuthService extends Context.Tag("AuthService")<
  AuthService,
  {
    readonly register: (email: string, password: string) => Effect.Effect<{ id: string; email: string; token: string }, Error>
    readonly login: (email: string, password: string) => Effect.Effect<{ id: string; email: string; token: string }, Error>
    readonly verify: (token: string) => Effect.Effect<{ id: string; email: string }, Error>
  }
>() {}

export const AuthServiceLive = Layer.effect(
  AuthService,
  Effect.gen(function* () {
    const { run, get } = yield* DatabaseService

    const createToken = (id: string, email: string) =>
      Effect.promise(() =>
        new SignJWT({ id, email })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("30d")
          .sign(JWT_SECRET)
      )

    return {
      register: (email: string, password: string) =>
        Effect.gen(function* () {
          const existing = yield* get<User>("SELECT * FROM users WHERE email = ?", [email])
          if (existing) return yield* Effect.fail(new Error("Email already registered"))

          const id = crypto.randomUUID()
          const password_hash = yield* Effect.promise(() => Bun.password.hash(password))
          yield* run(
            "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
            [id, email, password_hash]
          )
          const token = yield* createToken(id, email)
          return { id, email, token }
        }),

      login: (email: string, password: string) =>
        Effect.gen(function* () {
          const user = yield* get<User>("SELECT * FROM users WHERE email = ?", [email])
          if (!user) return yield* Effect.fail(new Error("Invalid credentials"))

          const valid = yield* Effect.promise(() => Bun.password.verify(password, user.password_hash))
          if (!valid) return yield* Effect.fail(new Error("Invalid credentials"))

          const token = yield* createToken(user.id, user.email)
          return { id: user.id, email: user.email, token }
        }),

      verify: (token: string) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () => jwtVerify(token, JWT_SECRET),
            catch: () => new Error("Invalid token"),
          })
          const { id, email } = result.payload as { id: string; email: string }
          return { id, email }
        }),
    }
  })
)
```

**Step 2: Write test**

`backend/src/services/Auth.test.ts`:
```ts
import { describe, it, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { DatabaseServiceLive } from "./Database"
import { AuthService, AuthServiceLive } from "./Auth"
import { runMigrations } from "../migrations"

const TestLayer = AuthServiceLive.pipe(Layer.provide(DatabaseServiceLive))
const FullLayer = Layer.merge(TestLayer, DatabaseServiceLive)

const setup = Effect.gen(function* () {
  yield* runMigrations
})

describe("AuthService", () => {
  it("registers and logs in a user", async () => {
    const program = Effect.gen(function* () {
      yield* setup
      const auth = yield* AuthService

      const reg = yield* auth.register("test@example.com", "password123")
      expect(reg.email).toBe("test@example.com")
      expect(reg.token).toBeTruthy()

      const login = yield* auth.login("test@example.com", "password123")
      expect(login.email).toBe("test@example.com")

      const verified = yield* auth.verify(login.token)
      expect(verified.email).toBe("test@example.com")
    })

    await Effect.runPromise(program.pipe(Effect.provide(FullLayer)))
  })
})
```

**Step 3: Run tests**

```bash
cd backend && bun test
```
Expected: PASS

**Step 4: Commit**

```bash
git add backend/
git commit -m "feat: add auth service with register, login, JWT"
```

---

### Task 4: HTTP server with auth routes

**Files:**
- Create: `backend/src/routes/auth.ts`
- Create: `backend/src/server.ts`
- Modify: `backend/src/index.ts`

**Step 1: Create the HTTP server**

`backend/src/server.ts` — set up the Effect-TS HTTP server using `@effect/platform-bun`. Create routes for auth endpoints.

The server should:
- Listen on port 3002
- Parse JSON bodies
- Return JSON responses
- Handle CORS (allow frontend origin)
- Wire up auth routes: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me

`backend/src/routes/auth.ts` — define auth route handlers:
- `register`: parse email + password from body, call AuthService.register, return token
- `login`: parse email + password from body, call AuthService.login, return token
- `me`: extract token from Authorization header, call AuthService.verify, return user info

Use `@effect/platform` `HttpServer` and `HttpRouter` for routing.

**Step 2: Update index.ts to start server**

Wire up all layers: DatabaseServiceLive → AuthServiceLive → HttpServer on port 3002.

**Step 3: Test manually**

```bash
cd backend && bun run dev &
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```
Expected: `{"id":"...","email":"test@test.com","token":"..."}`

**Step 4: Commit**

```bash
git add backend/
git commit -m "feat: add HTTP server with auth routes"
```

---

### Task 5: Calculator and Planner CRUD routes

**Files:**
- Create: `backend/src/services/Calculator.ts`
- Create: `backend/src/services/Planner.ts`
- Create: `backend/src/routes/calculator.ts`
- Create: `backend/src/routes/planner.ts`

**Step 1: Create CalculatorService**

CRUD operations:
- `save(userId, data)` — insert a calculator result
- `list(userId)` — get all results for user
- `getById(userId, id)` — get specific result

**Step 2: Create PlannerService**

CRUD operations:
- `save(userId, data)` — insert a planner result (week_data as JSON string)
- `list(userId)` — get all plans for user
- `getById(userId, id)` — get specific plan

**Step 3: Create route handlers**

All routes require auth (extract user from JWT). Wire into the HTTP server.

- `POST /api/calculator` — save { input_mode, input_a, input_b, max_hr }
- `GET /api/calculator` — list user's results
- `GET /api/calculator/:id` — get by id
- `POST /api/planner` — save { week_data, default_wu, default_cd, name? }
- `GET /api/planner` — list user's plans
- `GET /api/planner/:id` — get by id

**Step 4: Test manually**

```bash
TOKEN=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' | jq -r .token)

curl -X POST http://localhost:3002/api/calculator \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"input_mode":"5k","input_a":24,"input_b":30,"max_hr":208}'

curl http://localhost:3002/api/calculator \
  -H "Authorization: Bearer $TOKEN"
```

**Step 5: Commit**

```bash
git add backend/
git commit -m "feat: add calculator and planner CRUD routes"
```

---

### Task 6: Intervals.icu integration

**Files:**
- Create: `backend/src/services/Intervals.ts`
- Create: `backend/src/services/Wellness.ts`
- Create: `backend/src/routes/intervals.ts`
- Create: `backend/src/routes/wellness.ts`

**Step 1: Create IntervalsService**

- `connect(userId, athleteId, apiKey)` — save Intervals.icu credentials to user record
- `syncWellness(userId)` — fetch wellness data from Intervals.icu API and store in wellness_data table

Intervals.icu API: `GET https://intervals.icu/api/v1/athlete/{id}/wellness?oldest=YYYY-MM-DD&newest=YYYY-MM-DD`
Auth: Basic auth with athlete ID as username, API key as password.

Wellness response fields to map: `restingHR`, `hrv`, `sleepSecs` (convert to hours), `weight`, `atl`, `ctl`, `tsb`.

**Step 2: Create WellnessService**

- `list(userId)` — get all wellness data, ordered by date desc
- `getByDateRange(userId, from, to)` — filter by date range

**Step 3: Create route handlers**

- `POST /api/intervals/connect` — { athlete_id, api_key } (requires auth)
- `POST /api/intervals/sync` — trigger wellness sync (requires auth)
- `GET /api/wellness` — list wellness data (requires auth, optional ?from=&to= query params)

**Step 4: Commit**

```bash
git add backend/
git commit -m "feat: add Intervals.icu integration and wellness routes"
```

---

### Task 7: Polish and deploy

**Files:**
- Modify: various

**Step 1: Add CORS middleware**

Allow requests from `https://subthreshold.bagus.icu` and `http://localhost:5173` (dev).

**Step 2: Add error handling**

Catch all unhandled errors, return proper JSON error responses with status codes.

**Step 3: Add .env support**

Create `backend/.env.example`:
```
JWT_SECRET=change-me-to-a-random-string
PORT=3002
```

**Step 4: Type check and test**

```bash
cd backend && bun tsc --noEmit && bun test
```

**Step 5: Deploy to VPS**

```bash
rsync -avz --exclude node_modules --exclude nsa.db backend/ dev@lab:~/nsa-backend/
ssh dev@lab "cd ~/nsa-backend && bun install"
```

Update Caddy config to reverse proxy `/api/*` to port 3002.

Set up as a systemd service or use pm2/bun's built-in process management.

**Step 6: Commit**

```bash
git add backend/ 
git commit -m "chore: polish backend — CORS, error handling, deploy config"
```
