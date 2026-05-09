# Grafana + Loki Observability Stack Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install Grafana, Loki, and Promtail natively on the VPS via Nix to capture all systemd logs with a web dashboard at `subthreshold.bagus.icu/grafana`.

**Architecture:** Nix-installed binaries running as systemd services. Promtail reads journald and ships to Loki on localhost:3100. Grafana on localhost:3000 exposed via Caddy reverse proxy at `/grafana` path.

**Tech Stack:** Nix, systemd, Loki, Promtail, Grafana, Caddy

**VPS:** `dev@lab` (103.74.5.35), NixOS-like with Nix package manager, 7.7GB RAM, 155GB disk

---

### Task 1: Install Nix Packages

**Step 1: Install loki, promtail, and grafana via Nix**

```bash
ssh dev@lab "nix-env -iA nixpkgs.grafana-loki nixpkgs.promtail nixpkgs.grafana"
```

**Step 2: Verify binaries are available**

```bash
ssh dev@lab "which loki && which promtail && which grafana-server"
```

Expected: three paths printed (e.g., `/home/dev/.nix-profile/bin/loki`)

**Step 3: Note the binary paths for systemd units**

```bash
ssh dev@lab "readlink -f \$(which loki) && readlink -f \$(which promtail) && readlink -f \$(which grafana-server)"
```

Record these paths — needed in Task 3.

---

### Task 2: Create Config Files

**Step 1: Create monitoring directory**

```bash
ssh dev@lab "mkdir -p ~/monitoring/loki-data"
```

**Step 2: Create loki-config.yml**

```bash
ssh dev@lab "cat > ~/monitoring/loki-config.yml << 'LOKI_EOF'
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /home/dev/monitoring/loki-data
  storage:
    filesystem:
      chunks_directory: /home/dev/monitoring/loki-data/chunks
      rules_directory: /home/dev/monitoring/loki-data/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  retention_period: 30d
  max_query_length: 721h

compactor:
  working_directory: /home/dev/monitoring/loki-data/compactor
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  delete_request_store: filesystem
LOKI_EOF"
```

**Step 3: Create promtail-config.yml**

```bash
ssh dev@lab "cat > ~/monitoring/promtail-config.yml << 'PROMTAIL_EOF'
server:
  http_listen_port: 9080

positions:
  filename: /home/dev/monitoring/promtail-positions.yml

clients:
  - url: http://localhost:3100/loki/api/v1/push

scrape_configs:
  - job_name: journal
    journal:
      json: false
      max_age: 12h
      labels:
        job: systemd-journal
    relabel_configs:
      - source_labels: [\"__journal__systemd_unit\"]
        target_label: \"unit\"
      - source_labels: [\"__journal__hostname\"]
        target_label: \"hostname\"
      - source_labels: [\"__journal_priority_keyword\"]
        target_label: \"severity\"
    pipeline_stages:
      - match:
          selector: '{unit=\"nsa-backend.service\"}'
          stages:
            - json:
                expressions:
                  level: level
                  msg: message
            - labels:
                level:
            - output:
                source: msg
PROMTAIL_EOF"
```

**Step 4: Create grafana-datasources.yml**

```bash
ssh dev@lab "mkdir -p ~/monitoring/grafana-provisioning/datasources && cat > ~/monitoring/grafana-provisioning/datasources/ds.yml << 'DS_EOF'
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://localhost:3100
    isDefault: true
    editable: true
DS_EOF"
```

**Step 5: Add GRAFANA_ADMIN_PASSWORD to .env**

```bash
ssh dev@lab "echo 'GRAFANA_ADMIN_PASSWORD=ChangeMeToSomethingSecure123' >> ~/nsa-backend/.env"
```

> **Important:** Change the password to something secure before running this.

**Step 6: Verify config files exist**

```bash
ssh dev@lab "ls -la ~/monitoring/*.yml ~/monitoring/grafana-provisioning/datasources/ds.yml"
```

Expected: three yml files listed.

---

### Task 3: Create Systemd Services

**Step 1: Create loki.service**

```bash
ssh dev@lab "sudo tee /etc/systemd/system/loki.service << 'EOF'
[Unit]
Description=Loki Log Aggregation
After=network.target

[Service]
Type=simple
User=dev
ExecStart=/home/dev/.nix-profile/bin/loki -config.file=/home/dev/monitoring/loki-config.yml
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF"
```

> **Note:** If the binary path from Task 1 Step 3 differs, update `ExecStart` accordingly.

**Step 2: Create promtail.service**

```bash
ssh dev@lab "sudo tee /etc/systemd/system/promtail.service << 'EOF'
[Unit]
Description=Promtail Log Shipper
After=network.target loki.service

[Service]
Type=simple
User=dev
ExecStart=/home/dev/.nix-profile/bin/promtail -config.file=/home/dev/monitoring/promtail-config.yml
Restart=on-failure
RestartSec=5
# Need access to journald
SupplementaryGroups=systemd-journal

[Install]
WantedBy=multi-user.target
EOF"
```

**Step 3: Create grafana.service**

```bash
ssh dev@lab "sudo tee /etc/systemd/system/grafana.service << 'EOF'
[Unit]
Description=Grafana Dashboard
After=network.target loki.service

[Service]
Type=simple
User=dev
EnvironmentFile=/home/dev/nsa-backend/.env
ExecStart=/home/dev/.nix-profile/bin/grafana-server \
  --homepath /home/dev/.nix-profile/share/grafana \
  --config /dev/null \
  web
Environment=GF_SECURITY_ADMIN_USER=admin
Environment=GF_SECURITY_ADMIN_PASSWORD=%GRAFANA_ADMIN_PASSWORD%
Environment=GF_SERVER_HTTP_PORT=3000
Environment=GF_SERVER_ROOT_URL=https://subthreshold.bagus.icu/grafana
Environment=GF_SERVER_SERVE_FROM_SUB_PATH=true
Environment=GF_PATHS_DATA=/home/dev/monitoring/grafana-data
Environment=GF_PATHS_PROVISIONING=/home/dev/monitoring/grafana-provisioning
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF"
```

**Step 4: Create grafana data directory**

```bash
ssh dev@lab "mkdir -p ~/monitoring/grafana-data"
```

**Step 5: Reload systemd**

```bash
ssh dev@lab "sudo systemctl daemon-reload"
```

---

### Task 4: Start Services

**Step 1: Enable and start loki**

```bash
ssh dev@lab "sudo systemctl enable --now loki"
```

**Step 2: Verify loki is running**

```bash
ssh dev@lab "sudo systemctl status loki --no-pager -l"
```

Expected: `active (running)`

```bash
ssh dev@lab "curl -s http://localhost:3100/ready"
```

Expected: `ready`

**Step 3: Enable and start promtail**

```bash
ssh dev@lab "sudo systemctl enable --now promtail"
```

**Step 4: Verify promtail is running and shipping**

```bash
ssh dev@lab "sudo systemctl status promtail --no-pager -l"
```

Expected: `active (running)`

```bash
ssh dev@lab "curl -s http://localhost:3100/loki/api/v1/labels | head"
```

Expected: JSON with labels like `unit`, `hostname`

**Step 5: Enable and start grafana**

```bash
ssh dev@lab "sudo systemctl enable --now grafana"
```

**Step 6: Verify grafana is running**

```bash
ssh dev@lab "sudo systemctl status grafana --no-pager -l"
```

Expected: `active (running)`

```bash
ssh dev@lab "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/grafana/login"
```

Expected: `200`

---

### Task 5: Update Caddy

**Step 1: Read current Caddyfile**

```bash
ssh dev@lab "cat /etc/caddy/Caddyfile"
```

**Step 2: Add grafana reverse proxy**

Add inside the `subthreshold.bagus.icu` block, **before** the catch-all `handle` block:

```caddy
    handle /grafana/* {
        reverse_proxy localhost:3000
    }
```

The full block should look like:

```caddy
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

**Step 3: Reload caddy**

```bash
ssh dev@lab "sudo systemctl reload caddy"
```

**Step 4: Verify Grafana is accessible**

```bash
curl -s -o /dev/null -w '%{http_code}' https://subthreshold.bagus.icu/grafana/login
```

Expected: `200`

---

### Task 6: Verify End-to-End

**Step 1: Check Loki has labels from journald**

```bash
ssh dev@lab "curl -s http://localhost:3100/loki/api/v1/labels | python3 -m json.tool"
```

Expected: labels including `unit`, `hostname`, `severity`

**Step 2: Query nsa-backend logs via Loki API**

```bash
ssh dev@lab "curl -s -G http://localhost:3100/loki/api/v1/query_range --data-urlencode 'query={unit=\"nsa-backend.service\"}' --data-urlencode 'limit=5' | python3 -m json.tool | head -30"
```

Expected: JSON with log entries from nsa-backend

**Step 3: Login to Grafana**

Open `https://subthreshold.bagus.icu/grafana` in browser.
- Username: `admin`
- Password: the one set in `.env`

Go to **Explore** → select **Loki** → run query `{unit="nsa-backend.service"}`. Should see logs.

**Step 4: Test a query for all services**

In Grafana Explore, run:
```logql
{job="systemd-journal"} | line_format "{{.unit}}: {{.__line__}}"
```

Should see logs from caddy, nsa-backend, and system services.

---

### Task 7: Commit Config References

**Step 1: Commit the design doc**

```bash
git add docs/plans/2026-05-09-grafana-loki-observability-design.md docs/plans/2026-05-09-grafana-loki-plan.md
git commit -m "docs: add Grafana + Loki observability design and plan"
```

---

## Quick Reference (post-install)

```bash
# Service management
ssh dev@lab "sudo systemctl status loki promtail grafana"
ssh dev@lab "sudo systemctl restart loki"
ssh dev@lab "sudo journalctl -u loki -f"
ssh dev@lab "sudo journalctl -u promtail -f"
ssh dev@lab "sudo journalctl -u grafana -f"

# Check Loki health
ssh dev@lab "curl -s http://localhost:3100/ready"
ssh dev@lab "curl -s http://localhost:3100/loki/api/v1/labels"

# Grafana URL
https://subthreshold.bagus.icu/grafana
```
