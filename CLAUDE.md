# NSA Sub-threshold Calculator

## Project Structure

- `src/` — Vite + React + TypeScript frontend (Tailwind v4, shadcn/ui)
- `backend/` — Bun + Effect-TS API server (SQLite)
- `public/` — Static assets (logos, OG image)
- `docs/plans/` — Design docs and implementation plans

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

### Caddy config

Location: `/etc/caddy/Caddyfile`

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

### Backend service management

```bash
ssh dev@lab "sudo systemctl status nsa-backend"   # check status
ssh dev@lab "sudo systemctl restart nsa-backend"   # restart
ssh dev@lab "sudo systemctl stop nsa-backend"      # stop
ssh dev@lab "sudo journalctl -u nsa-backend -f"    # tail logs
```

### Environment variables

Backend `.env` at `~/nsa-backend/.env` (not synced):
- `JWT_SECRET` — random hex string for JWT signing
- `PORT` — server port (default 3002)

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
bun test          # run all tests (29 tests)
bun tsc --noEmit  # type check
```

## API Endpoints

All `/api/*` routes. Auth routes are public, others require `Authorization: Bearer <token>`.

- `POST /api/auth/register` — `{ email, password }` → `{ id, email, token }`
- `POST /api/auth/login` — `{ email, password }` → `{ id, email, token }`
- `GET /api/auth/me` — → `{ id, email }`
- `POST /api/calculator` — `{ input_mode, input_a, input_b, max_hr }`
- `GET /api/calculator` — list user's saved results
- `GET /api/calculator/:id` — get specific result
- `POST /api/planner` — `{ week_data, default_wu, default_cd, name? }`
- `GET /api/planner` — list user's saved plans
- `GET /api/planner/:id` — get specific plan
- `POST /api/intervals/connect` — `{ athlete_id, api_key }`
- `POST /api/intervals/sync` — pull wellness from Intervals.icu
- `GET /api/wellness` — list wellness data (`?from=&to=` optional)
