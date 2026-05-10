# NSA Sub-threshold Calculator

A web app for planning Norwegian Singles Approach (NSA) sub-threshold running training blocks, with Intervals.icu integration for data sync and workout export.

## Project Structure

```
src/                          # Vite + React + TypeScript frontend
├── components/
│   ├── block/                # Block generator wizard (steps 1-5)
│   ├── planner/              # Weekly planner (drag-and-drop)
│   ├── ui/                   # shadcn/ui components
│   ├── admin-invite.tsx      # Admin user invitation form
│   ├── change-password.tsx   # Password change form
│   ├── ftp-input.tsx         # FTP power input slider
│   ├── pace-card.tsx         # Pace zone display
│   ├── race-input.tsx        # Race time input
│   ├── test-tracker.tsx      # Test result tracker
│   ├── training-summary.tsx  # Training summary card
│   └── activities-list.tsx   # Activities list
├── lib/
│   ├── calculator.ts         # Pace/HR/power calculations (threshold, zones)
│   ├── planner-data.ts       # Workout templates, training load estimation
│   ├── block-types.ts        # Block generator types
│   ├── block-utils.ts        # Event naming, week summaries
│   ├── block-wizard-context.tsx  # Block generator state management
│   ├── budget.ts             # Training budget/eligibility
│   ├── auth-context.tsx      # Auth state (React Context)
│   └── api.ts                # API fetch helper
├── pages/
│   ├── calculator.tsx        # Sub-threshold pace + power calculator
│   ├── planner.tsx           # Weekly training planner
│   ├── block-generator.tsx   # 4-week block generator wizard
│   ├── dashboard.tsx         # User dashboard (stats, intervals.icu)
│   ├── profile.tsx           # Profile + change password
│   ├── login.tsx             # Login
│   ├── register.tsx          # Invitation-based registration
│   ├── forgot-password.tsx   # Password reset request
│   └── reset-password.tsx    # Password reset form
backend/
├── src/
│   ├── server.ts             # HTTP server (@effect/platform HttpRouter)
│   ├── index.ts              # Entry point (BunRuntime.runMain)
│   ├── services/
│   │   ├── Auth.ts           # Registration, login, JWT, invitation tokens
│   │   ├── Database.ts       # SQLite (WAL mode)
│   │   ├── Email.ts          # Nodemailer + Sumopod SMTP
│   │   ├── Errors.ts         # Domain error types (TaggedError)
│   │   ├── Intervals.ts      # Intervals.icu API (wellness, sport settings)
│   │   ├── Activities.ts     # Activity sync from Intervals.icu
│   │   ├── Assessment.ts     # Training readiness assessment
│   │   ├── Block.ts          # NSA block CRUD
│   │   ├── Planner.ts        # Weekly planner save/load
│   │   ├── TestResults.ts    # 5K/test result storage
│   │   ├── Wellness.ts       # Wellness data queries
│   │   ├── WorkoutExport.ts  # Export to Intervals.icu
│   │   └── RateLimit.ts      # Rate limiting
│   └── migrations/           # SQLite migrations (001-005)
docs/plans/                   # Design docs and implementation plans
public/                       # Static assets (logos, OG image)
```

## Tech Stack

- **Frontend**: Vite + React 19 + TypeScript, Tailwind v4, shadcn/ui, @dnd-kit (drag-and-drop)
- **Backend**: Bun + Effect-TS, @effect/platform (HttpRouter, BunHttpServer), SQLite
- **Email**: Nodemailer + Sumopod SMTP
- **External API**: Intervals.icu (wellness sync, activity sync, workout export, sport settings)
- **Fonts**: DM Sans (body), JetBrains Mono (monospace)

## Key Features

### Sub-threshold Calculator
- Derive threshold pace from 5K/10K/half/full marathon time or 20-min time trial
- Threshold = 5K pace × 1.05 (Daniels VDOT)
- Pace zones: Short (99-101%), Medium (97-99%), Long (95-97%) of threshold
- FTP-based power zones for running

### Weekly Planner
- Drag-and-drop quality sessions (short/medium/long intervals) to day slots
- Easy run, long run, rest session types
- WU/CD customization per day
- Training load estimation (IF² × duration/60 × 100)
- Export to Intervals.icu

### Block Generator (4-week wizard)
1. **Assessment** — fetches 8 weeks of activities + 4 weeks wellness from Intervals.icu, evaluates readiness
2. **Date selection** — pick start date (snaps to Monday)
3. **Week building** — build 4 weeks (3 build + 1 deload/test) with validation
4. **Review** — summary table with compliance checks
5. **Push** — push events to Intervals.icu calendar

### Workout Templates
- 23 sub-threshold templates across Short/Medium/Long categories
- 2 test templates (5K Time Trial, 20' Test)
- Each template has: reps, duration, rest, pctLow/pctHigh (% of threshold)

### Intervals.icu Integration
- Connect with athlete ID + API key (encrypted at rest)
- Sync wellness data (CTL, ATL, TSB, resting HR, sleep)
- Sync activities (distance, duration, pace)
- Fetch sport settings (FTP, CP, power zones, pace zones)
- Export workouts as events with structured workout_doc

### Auth System
- Invite-only registration (admin sends JWT invitation token via email)
- JWT auth (30-day tokens)
- Change password, forgot/reset password via email
- Admin role (is_admin column)

## Live URL

https://subthreshold.bagus.icu

## Deployment

### Frontend

```bash
pnpm build
rsync -avz --delete dist/ dev@lab:~/nsa-subthreshold/
```

### Backend

```bash
rsync -avz --exclude node_modules --exclude nsa.db --exclude nsa.db-shm --exclude nsa.db-wal --exclude .env backend/ dev@lab:~/nsa-backend/
ssh dev@lab "cd ~/nsa-backend && bun install && sudo systemctl restart nsa-backend"
```

### Full deploy (both)

```bash
pnpm build && rsync -avz --delete dist/ dev@lab:~/nsa-subthreshold/
rsync -avz --exclude node_modules --exclude nsa.db --exclude nsa.db-shm --exclude nsa.db-wal --exclude .env backend/ dev@lab:~/nsa-backend/
ssh dev@lab "cd ~/nsa-backend && bun install && sudo systemctl restart nsa-backend"
```

## VPS Details

- **Host**: `dev@lab` (103.74.5.35)
- **Frontend**: Static files at `~/nsa-subthreshold/`, served by Caddy
- **Backend**: Bun process at `~/nsa-backend/`, systemd service `nsa-backend`, port 3002
- **Web server**: Caddy — proxies `/api/*` to backend, serves static files for everything else
- **Database**: SQLite at `~/nsa-backend/nsa.db` (auto-created, WAL mode)
- **SSL**: Auto-managed by Caddy (Let's Encrypt)
- **DNS**: Cloudflare (alaric.ns.cloudflare.com, elle.ns.cloudflare.com)
- **Monitoring**: Grafana + Loki + Alloy (log aggregation) at `grafana.bagus.icu`

### Caddy config

Location: `/etc/caddy/Caddyfile`

```
subthreshold.bagus.icu {
    handle /api/* {
        reverse_proxy localhost:3002
    }
    handle /grafana/* {
        reverse_proxy localhost:3000
    }
    handle {
        root * /home/dev/nsa-subthreshold
        file_server
        try_files {path} /index.html
    }
    encode gzip
}
```

### Backend service management

```bash
ssh dev@lab "sudo systemctl status nsa-backend"   # check status
ssh dev@lab "sudo systemctl restart nsa-backend"   # restart
ssh dev@lab "sudo systemctl stop nsa-backend"      # stop
ssh dev@lab "sudo journalctl -u nsa-backend -f"    # tail logs
```

### Environment variables

Backend `.env` at `~/nsa-backend/.env` (not synced):
- `JWT_SECRET` — required, random string for JWT signing
- `ENCRYPTION_KEY` — required, 64-char hex string for encrypting API keys at rest
- `PORT` — server port (default 3002)
- `SMTP_HOST` — smtp.sumopod.com
- `SMTP_PORT` — 465
- `SMTP_USER` — SMTP username
- `SMTP_PASS` — SMTP password
- `SMTP_FROM` — sender email (noreply@bagus.icu)

### Database backup

```bash
ssh dev@lab "cp ~/nsa-backend/nsa.db ~/backups/nsa-$(date +%Y%m%d).db"
```

## Development

### Frontend

```bash
pnpm dev          # start Vite dev server on localhost:5173
pnpm build        # production build
pnpm vitest run   # run frontend tests
pnpm lint         # ESLint
pnpm tsc --noEmit # type check
```

### Backend

```bash
cd backend
bun run dev       # start with --watch on localhost:3002
bun test          # run all tests
bun tsc --noEmit  # type check
```

## API Endpoints

All `/api/*` routes. Auth routes marked (public), others require `Authorization: Bearer <token>`.

### Auth
- `POST /api/auth/register` (public) — `{ token, password }` → `{ id, email, token }` (requires invitation JWT)
- `POST /api/auth/login` (public) — `{ email, password }` → `{ id, email, token }`
- `GET /api/auth/me` — `{ id, email, is_admin }`
- `POST /api/auth/change-password` — `{ currentPassword, newPassword }`
- `POST /api/auth/forgot-password` (public) — `{ email }` → sends reset email
- `POST /api/auth/reset-password` (public) — `{ token, password }`

### Admin
- `POST /api/admin/invite` (admin only) — `{ email }` → sends invitation email

### Test Results
- `POST /api/tests` — save test result
- `GET /api/tests` — list user's test results
- `DELETE /api/tests/:id` — delete test result

### Planner
- `POST /api/planner` — `{ week_data, default_wu, default_cd, name? }`
- `GET /api/planner` — list user's saved plans
- `GET /api/planner/:id` — get specific plan

### Intervals.icu
- `POST /api/intervals/connect` — `{ athlete_id, api_key }`
- `POST /api/intervals/sync` — pull wellness from Intervals.icu
- `POST /api/intervals/export` — push workouts to Intervals.icu
- `GET /api/intervals/sport-settings` — fetch FTP, CP, power/pace zones

### Wellness & Activities
- `GET /api/wellness` — list wellness data (`?from=&to=` optional)
- `POST /api/activities/sync` — `{ from, to }` sync activities from Intervals.icu
- `GET /api/activities` — list activities (`?from=&to=` optional)

### Block Generator
- `POST /api/block/assess` — run readiness assessment (fetches fresh from Intervals.icu)
- `POST /api/block` — save block
- `GET /api/block` — list blocks
- `GET /api/block/:id` — get block detail
- `POST /api/block/:id/push` — push block to Intervals.icu
- `DELETE /api/block/:id` — delete block

## Backend Architecture (Effect-TS)

Services use `Effect.Service` pattern (modern) or `Context.Tag` (Database). All services have `.Default` layers.

### Error Types (Errors.ts)
`EmailAlreadyRegistered`, `InvalidCredentials`, `InvalidToken`, `NotFoundError`, `ValidationError`, `IntervalsNotConnected`, `IntervalsApiError`, `InvitationRequired`, `InvitationExpired`, `NotAdmin`, `PasswordMismatch`, `ResetTokenExpired`

### Server Pattern
- `@effect/platform` HttpRouter for route definitions
- `BunHttpServer.layer` for Bun HTTP server
- `BunRuntime.runMain` entry point
- Structured logging via `Effect.logInfo` with annotations (method, path, status, duration)
- CORS middleware with error handling via `Effect.catchAll` + tagged error switch

### Database Schema (SQLite)
- `users` — id, email, password_hash, is_admin, intervals_icu_athlete_id, intervals_icu_api_key
- `test_results` — user test results (5K, etc.)
- `planner_results` — saved weekly plans (JSON)
- `wellness_data` — synced wellness (CTL, ATL, TSB, HR, sleep)
- `activities` — synced running activities
- `nsa_blocks` — 4-week training blocks
- `nsa_block_events` — individual workouts within blocks
- `migrations` — migration tracking
