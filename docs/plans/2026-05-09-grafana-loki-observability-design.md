# Grafana + Loki Observability Stack — Design

**Date:** 2026-05-09
**Status:** Approved

---

## Overview

Self-hosted logging stack on the VPS using Loki (log aggregation), Promtail (log shipper), and Grafana (dashboard). All installed natively via Nix as systemd services — no Docker. Captures all systemd service logs via journald. Grafana accessible at `subthreshold.bagus.icu/grafana`.

## Architecture

```
All systemd services → journald → Promtail → Loki → Grafana
                                                      ↓
                                        subthreshold.bagus.icu/grafana
```

## Components

### Loki
- **Port:** 3100 (localhost only)
- **Storage:** filesystem at `~/monitoring/loki-data`
- **Retention:** 30 days
- **Config:** `~/monitoring/loki-config.yml`
- **Nix package:** `grafana-loki`

### Promtail
- **Port:** 9080 (localhost only)
- **Source:** journald (all systemd units)
- **Labels:** `unit`, `hostname`, `severity`
- **Pipeline:** JSON parsing for `nsa-backend.service` logs (level, message extraction)
- **Config:** `~/monitoring/promtail-config.yml`
- **Nix package:** `promtail`

### Grafana
- **Port:** 3000 (localhost only)
- **URL:** `subthreshold.bagus.icu/grafana`
- **Auth:** admin password from `~/nsa-backend/.env` (`GRAFANA_ADMIN_PASSWORD`)
- **Datasource:** Loki auto-provisioned as default
- **Config:** `~/monitoring/grafana-datasources.yml`
- **Nix package:** `grafana`

## Config Files

All stored in `~/monitoring/` on VPS.

### loki-config.yml
- Filesystem storage, single-node, inmemory ring
- TSDB schema v13
- 30-day retention with compactor
- No auth

### promtail-config.yml
- Scrapes journald with 12h max_age
- Relabels: `__journal__systemd_unit` → `unit`, `__journal__hostname` → `hostname`, `__journal_priority_keyword` → `severity`
- Pipeline: JSON parsing for `nsa-backend.service` (extracts `level`, `message`)

### grafana-datasources.yml
- Auto-provisions Loki at `http://localhost:3100` as default datasource

## Caddy Change

Add to existing Caddyfile block for `subthreshold.bagus.icu`:

```
handle /grafana/* {
    reverse_proxy localhost:3000
}
```

Grafana configured with `GF_SERVER_ROOT_URL=https://subthreshold.bagus.icu/grafana` and `GF_SERVER_SERVE_FROM_SUB_PATH=true`.

## Systemd Services

Three new services:
- `loki.service` — runs Loki with config from `~/monitoring/loki-config.yml`
- `promtail.service` — runs Promtail, needs read access to `/var/log/journal`
- `grafana.service` — runs Grafana with provisioned datasource

## Deployment

1. Install Nix packages: `grafana-loki`, `promtail`, `grafana`
2. Create `~/monitoring/` directory with config files
3. Create systemd service units
4. Add `GRAFANA_ADMIN_PASSWORD` to `~/nsa-backend/.env`
5. Update Caddyfile
6. Enable and start services
7. Reload Caddy

No changes to frontend or backend application code.

## Useful LogQL Queries

```logql
# All nsa-backend logs
{unit="nsa-backend.service"}

# Errors only
{unit="nsa-backend.service"} | json | level="ERROR"

# Search by keyword
{unit="nsa-backend.service"} |= "database"

# Caddy logs
{unit="caddy.service"}

# Error rate over time
count_over_time({unit="nsa-backend.service"} | json | level="ERROR" [5m])
```

## Resource Estimate

| Service | RAM | Disk |
|---------|-----|------|
| Loki | ~100 MB | Grows with logs |
| Promtail | ~30 MB | Negligible |
| Grafana | ~80 MB | ~100 MB |
| **Total** | **~210 MB** | Moderate |

VPS has 5.8 GB available RAM and 146 GB free disk — plenty of headroom.
