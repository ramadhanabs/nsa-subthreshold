# Backend Design — Bun + Effect-TS + SQLite

## Overview

Backend API for the NSA Calculator app. Stores user data, calculator results, planner results, and wellness data from Intervals.icu. Email/password auth with JWT. Deployed on the same VPS behind Caddy reverse proxy.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Effect-TS with `@effect/platform` HttpServer
- **Database**: SQLite (Bun built-in or better-sqlite3)
- **Auth**: JWT + bcrypt
- **Location**: `backend/` directory in the monorepo

## Data Model

### users
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| email | TEXT | unique |
| password_hash | TEXT | bcrypt |
| intervals_icu_athlete_id | TEXT | nullable |
| intervals_icu_api_key | TEXT | nullable, encrypted |
| created_at | TEXT (ISO) | |
| updated_at | TEXT (ISO) | |

### calculator_results
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| user_id | TEXT | FK → users |
| input_mode | TEXT | 5k/10k/half/full/20min |
| input_a | INTEGER | |
| input_b | INTEGER | |
| max_hr | INTEGER | |
| created_at | TEXT (ISO) | |

### planner_results
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| user_id | TEXT | FK → users |
| week_data | TEXT (JSON) | full week grid state |
| default_wu | INTEGER | |
| default_cd | INTEGER | |
| name | TEXT | optional label |
| created_at | TEXT (ISO) | |

### wellness_data
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| user_id | TEXT | FK → users |
| date | TEXT | YYYY-MM-DD |
| resting_hr | REAL | nullable |
| hrv | REAL | nullable |
| sleep_hours | REAL | nullable |
| weight | REAL | nullable |
| atl | REAL | nullable |
| ctl | REAL | nullable |
| tsb | REAL | nullable |
| source | TEXT | "intervals_icu" or "manual" |
| synced_at | TEXT (ISO) | |

## API Endpoints

### Auth
- `POST /api/auth/register` — create account { email, password }
- `POST /api/auth/login` — authenticate { email, password } → { token }
- `GET /api/auth/me` — get current user profile (requires auth)

### Calculator
- `POST /api/calculator` — save calculator result
- `GET /api/calculator` — list user's saved results
- `GET /api/calculator/:id` — get specific result

### Planner
- `POST /api/planner` — save planner result
- `GET /api/planner` — list user's saved plans
- `GET /api/planner/:id` — get specific plan

### Intervals.icu
- `POST /api/intervals/connect` — link Intervals.icu account { athlete_id, api_key }
- `POST /api/intervals/sync` — pull wellness data from Intervals.icu

### Wellness
- `GET /api/wellness` — list wellness data for user

## Effect-TS Service Layers

- **DatabaseService** — SQLite connection, migrations, query helpers
- **AuthService** — register, login, verify JWT, hash passwords
- **CalculatorService** — CRUD for calculator results
- **PlannerService** — CRUD for planner results
- **IntervalsService** — connect account, fetch wellness from Intervals.icu API
- **WellnessService** — CRUD for wellness data

## Deployment

Same VPS, Bun process on port 3002. Caddy reverse proxies `/api/*` to it. Static frontend served directly by Caddy.

```
subthreshold.bagus.icu {
    handle /api/* {
        reverse_proxy localhost:3002
    }
    handle {
        root * /home/dev/nsa-subthreshold
        file_server
        try_files {path} /index.html
    }
    encode gzip
}
```
