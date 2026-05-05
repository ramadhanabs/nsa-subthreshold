# Intervals.icu Deep Integration — Design

## Overview

Extend the existing Intervals.icu connection with activities sync, activity display on the dashboard, and workout export from the Planner.

## Capabilities

1. **Read wellness** (existing) — resting HR, HRV, sleep, weight, ATL/CTL/TSB
2. **Read activities** (new) — pull runs with distance, duration, pace, HR
3. **Push workouts** (new) — export planner week as planned workout events

## Data Model

### New table: `activities`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| user_id | TEXT | FK → users |
| intervals_id | TEXT | Intervals.icu activity ID |
| date | TEXT | YYYY-MM-DD |
| type | TEXT | "Run", "Ride", etc. |
| name | TEXT | activity name |
| distance_m | REAL | meters |
| duration_secs | REAL | total seconds |
| avg_pace | REAL | sec/km (nullable) |
| avg_hr | REAL | bpm (nullable) |
| moving_time | REAL | seconds (nullable) |
| synced_at | TEXT (ISO) | |

Unique constraint: `(user_id, intervals_id)`

## Intervals.icu API Usage

### Read Activities
```
GET /api/v1/athlete/{id}/activities?oldest=YYYY-MM-DD&newest=YYYY-MM-DD
Auth: Basic (API_KEY:{api_key})
```

Response fields to map: `id` → intervals_id, `start_date_local` → date, `type`, `name`, `distance` (meters), `elapsed_time` (secs), `average_speed` (m/s, convert to pace), `average_heartrate`

### Push Workout Events
```
POST /api/v1/athlete/{id}/events
Auth: Basic (API_KEY:{api_key})
Content-Type: application/json
```

Body per event:
```json
{
  "start_date_local": "2026-05-05",
  "category": "WORKOUT",
  "name": "NSA: 10×3min sub-T",
  "description": "WU 10min easy\n10×3min @ 5:09-5:16/km (60s rest)\nCD 10min easy\nTotal: ~55min",
  "type": "Run"
}
```

## Backend Changes

### New migration: `003_activities.ts`
Creates the `activities` table.

### New service: `ActivitiesService`
- `sync(userId, from, to)` — fetch from Intervals.icu, upsert into activities table, return count
- `list(userId, from?, to?)` — query activities with optional date range, ordered by date DESC

### Extended service: `WorkoutExportService`
- `exportWeek(userId, weekData, startDate, defaultWu, defaultCd)` — maps each day in the week to an Intervals.icu event and POSTs it. Returns count of events created.

Workout name format: session type + template name
- Quality: "NSA: {template.name} sub-T"
- Easy: "Easy run"
- Long: "Long run"
- Rest: skip (don't create event)

Workout description format:
```
WU {wu}min easy pace
{reps}×{dur}min @ sub-threshold ({rest}s rest)
CD {cd}min easy pace
Total: ~{total}min | Est. {distance}km
```

### New API Routes
- `POST /api/activities/sync` — body: `{ from, to }`, requires auth
- `GET /api/activities` — query: `?from=&to=`, requires auth
- `POST /api/intervals/export` — body: `{ week_data, start_date, default_wu, default_cd }`, requires auth

## Frontend Changes

### Dashboard — Activities Section
- New section after Progress cards
- Date range picker (from/to inputs or presets: 7d, 30d, 90d)
- "Sync activities" button
- Activities table: date, name, distance (km), duration (mm:ss), pace (/km), avg HR
- Empty state: "Connect Intervals.icu to see your activities"

### Planner — Export Button
- "Export to Intervals.icu" button in the WeeklySummary or as a standalone action
- Only shown when user is connected to Intervals.icu
- On click: confirm dialog showing the 7 events to be created (with start date picker for the week)
- On success: show "Exported X workouts to Intervals.icu"
- On error: show error message
