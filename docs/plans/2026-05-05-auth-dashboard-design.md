# Auth + Dashboard Design

## Overview

Frontend authentication (login/register pages), auth context, and a user dashboard with profile, training zones, weekly plan, progress metrics, test tracker, and Intervals.icu connection.

## Data Model Changes

### Remove
- `calculator_results` table, service, and routes — no longer needed

### Add
```sql
CREATE TABLE test_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  test_type TEXT NOT NULL,       -- '5k' or '20min'
  test_date TEXT NOT NULL,       -- YYYY-MM-DD
  value_a INTEGER NOT NULL,      -- 5k: minutes, 20min: km whole
  value_b INTEGER NOT NULL,      -- 5k: seconds, 20min: decimals
  max_hr INTEGER,                -- optional, snapshot at test time
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### New API Endpoints
- `POST /api/tests` — record a test result
- `GET /api/tests` — list user's test results (ordered by test_date DESC)
- `DELETE /api/tests/:id` — delete a test result

### Remove API Endpoints
- `POST /api/calculator`, `GET /api/calculator`, `GET /api/calculator/:id`

## Data Flow

- **Not logged in**: Calculator reads from localStorage (existing behavior)
- **Logged in**: Calculator loads latest test_result → auto-populates inputs. New test records update the calculator anchor.
- **Planner**: Derives pace zones from latest test result (same as now, via localStorage bridge)

## Auth

### Token Storage
- JWT stored in `localStorage` under key `nsa-token`

### AuthContext (`src/lib/auth-context.tsx`)
- Provides: `user`, `token`, `login()`, `register()`, `logout()`, `isLoading`
- On mount: check localStorage for token → `GET /api/auth/me` → set user or clear
- Wrap app in `<AuthProvider>`

### Auth Flow
1. User uses calculator freely (no auth required)
2. Clicks "Save" or navigates to dashboard → redirected to `/login?redirect=...`
3. Logs in → redirected back → features unlocked

## Pages

### `/login`
- Email + password form
- Link to register
- Error display for invalid credentials
- Redirect param support (`?redirect=/dashboard`)

### `/register`
- Email + password + confirm password form
- Link to login
- Error display for validation/duplicate email

### `/dashboard` (protected)
Sections from mockup:

1. **Profile header** — avatar initials, name/email, edit button
2. **Athlete parameters + Training zones** — 2-col grid:
   - Left: 5K PB, threshold pace, max HR, LTHR (from latest test)
   - Right: easy/sub-T/LTHR zones with pace + HR ranges
   - Last re-test date
3. **This week** — compact 7-day grid (E/Q/LR pills from saved planner), ratio bar
4. **Progress cards** — CTL, resting HR, week streak, phase (from Intervals.icu/wellness data)
5. **Test tracker** — tabbed (5K / 20-min):
   - Metrics row: latest result, threshold, CV, improvement
   - Progress chart (line chart showing pace over time)
   - Record form: date + time/distance + add button
   - History table: date, result, threshold, CV, delta, delete
6. **Quick actions** — Plan next week, Pace calculator, Re-test threshold
7. **Intervals.icu section** — connection status, connect form, sync button

## Nav Updates

- **Not logged in**: "Login" text link in nav
- **Logged in**: User initials avatar + dropdown with "Dashboard" and "Logout"

## Components

- `src/lib/auth-context.tsx` — AuthProvider + useAuth hook
- `src/lib/api.ts` — fetch wrapper with auth header
- `src/pages/login.tsx` — login form
- `src/pages/register.tsx` — register form
- `src/pages/dashboard.tsx` — full dashboard
- `src/components/test-tracker.tsx` — tabbed test tracker (5K + 20min)
- Updated `src/components/nav.tsx` — auth-aware
