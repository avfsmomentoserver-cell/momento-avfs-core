# AVFS · Momento Core

A modular analytics and forecasting platform for crash-curve round data.

```
Collector → Ingest API → Analysis → Forecast Engine → Database → Dashboard
```

- **Backend** — Python 3 / FastAPI / SQLite (WAL), hosted locally. No cloud
  dependency, no external database, no API keys required.
- **Frontend** — Vite + React + TypeScript operator console and consumer app,
  connected to the backend over REST and one multiplexed WebSocket.
- **No mock data** — every number on every screen is computed from rounds that are
  actually in the database. Data arrives through a file watcher, a REST endpoint, an
  upload form, or a provably-fair round engine whose output is cryptographically
  verifiable.

---

## Quick start

Two terminals.

### 1. Backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python run_api.py
```

- API: <http://localhost:8000>
- Interactive OpenAPI docs: <http://localhost:8000/docs>
- Health: <http://localhost:8000/api/v1/health>

On the first run it creates the database, seeds the seven built-in analyzers,
creates the operator account and starts the live round engine — so the console has
real data within seconds.

### 2. Frontend

```bash
cd web
bun install
bun run dev
```

Open <http://localhost:8080>.

### 3. Sign in

```
operator@momento.local / momento
```

Change this immediately from **Master Settings**, or set `MOMENTO_OPERATOR_EMAIL`
and `MOMENTO_OPERATOR_PASSWORD` before the first boot.

---

## What is in here

### Eight sub-projects

| Sub-project | Responsibility | Surface |
| --- | --- | --- |
| Collector & Ingest | File watcher, REST push, upload, live engine | `/dashboard/ingest` |
| Analysis Core | Ladders, resistance, streaks, regimes, edge fit | `/dashboard` |
| MomentoLinguistics | Eight-layer semantic vocabulary | `/dashboard/linguistics` |
| Forecast Engine | Markov + percentile + DNA blend, measured accuracy | `/dashboard/studio` |
| Decision Orchestrator | Patience, speed, risk, mistake prevention | `/orchestrator` |
| Autopilot Ledger | Recorded decisions, measured paper P&L | `/dashboard/autopilot` |
| Plugin Inventory | Analyzer registry with live weights | `/inventory` |
| Consumer App | Simplified daily guidance, premium tiers | `/app` |

### Twenty screens

**Operator console** — Command Center · Market · Ladder Telemetry · Resistance ·
Moonshot Finder · DNA Hunter · Forecast Studio · Linguistics · Orchestrator ·
Autopilot · Plugin Inventory · Ingest Console · Sources · Bird's Eye ·
Build Steps · Master Settings · Users · Round Testing

**Consumer app** — Today · Pro Predictions · Charts · Premium

---

## Honest accuracy

The forecast engine stores every projection **before** the round lands. When the
round arrives, the open forecast is scored against the recorded range. The accuracy
figures, the per-state breakdown and the Brier score therefore describe real
predictive performance — nothing can be back-dated, and unrecorded forecasts do not
count.

---

## Documentation

Step-by-step implementation documentation lives in [`docs/steps/`](docs/steps/) and
is also served inside the app on the **Build Steps** screen, alongside a zipped
source bundle for each step.

| Step | Document |
| --- | --- |
| 01 | [Architecture & configuration](docs/steps/01-architecture-and-configuration.md) |
| 02 | [Database & persistence](docs/steps/02-database-and-persistence.md) |
| 03 | [MomentoLinguistics layer](docs/steps/03-linguistics-layer.md) |
| 04 | [Analysis engine](docs/steps/04-analysis-engine.md) |
| 05 | [Forecast engine](docs/steps/05-forecast-engine.md) |
| 06 | [Ingest & live engine](docs/steps/06-ingest-and-live-engine.md) |
| 07 | [Plugin registry](docs/steps/07-plugin-registry.md) |
| 08 | [Orchestrator & autopilot](docs/steps/08-orchestrator-and-autopilot.md) |
| 09 | [API & WebSocket](docs/steps/09-api-and-websocket.md) |
| 10 | [Frontend foundation](docs/steps/10-frontend-foundation.md) |
| 11 | [Operator console](docs/steps/11-operator-console.md) |
| 12 | [Consumer app](docs/steps/12-consumer-app.md) |
| 13 | [Deployment: Debian on Azure](docs/steps/13-deployment-debian-azure.md) |

Also see [`docs/SETUP.md`](docs/SETUP.md) for the condensed setup path and
[`docs/API.md`](docs/API.md) for the endpoint reference.

### Regenerating the downloadable bundles

```bash
python3 scripts/build_bundles.py
```

This writes step documents, per-step source zips, a complete archive and
`manifest.json` into `downloads/`, which the backend serves to the Build Steps
screen.

---

## Getting data in

```bash
# REST push
curl -X POST localhost:8000/api/v1/ingest \
  -H 'Content-Type: application/json' \
  -d '{"source":"aviator","rounds":[{"multiplier":2.41},{"multiplier":1.08}]}'

# File watcher — drop a JSON/CSV/TXT export into the inbox
echo '[{"multiplier":3.15},{"multiplier":1.22}]' > backend/data/inbox/rounds.json

# Live engine — start it from the Ingest console, or:
curl -X POST localhost:8000/api/v1/feed/step -H "Authorization: Bearer $TOKEN"
```

Accepted shapes: JSON arrays or objects (`rounds`/`data`/`results`/`items`/
`history`/`records`), CSV with or without a header, or a plain list of numbers.
Multipliers are read from `multiplier`, `value`, `crash_point`, `result` or
`payout`; timestamps accept ISO-8601, epoch seconds or epoch milliseconds.

---

## Configuration

Every value is environment-driven with a safe default — see
[step 01](docs/steps/01-architecture-and-configuration.md) for the full table.

Backend essentials:

```bash
MOMENTO_API_PORT=8000
MOMENTO_DATABASE_PATH=backend/data/momento.db
MOMENTO_SECRET_KEY=<openssl rand -hex 32>
MOMENTO_OPERATOR_PASSWORD=<change-me>
MOMENTO_FEED_AUTOSTART=false          # production: use a real collector
```

Frontend:

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

When these are unset and the bundle is not served by a dev server, the frontend
uses the current origin — which is what a reverse-proxied deployment needs.

---

## Remote Deployment

To support remote clients accessing the backend from different machines:

### Backend Configuration

1. Copy the example environment file:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Update `.env` to bind to all interfaces:
   ```bash
   MOMENTO_API_HOST=0.0.0.0
   MOMENTO_API_PORT=8000
   ```

3. Add your remote frontend URLs to CORS origins:
   ```bash
   MOMENTO_CORS_ORIGINS=http://localhost:5173,http://YOUR_PUBLIC_IP:5173,http://YOUR_DOMAIN.com
   ```

4. For production, disable allow-all CORS:
   ```bash
   MOMENTO_CORS_ALLOW_ALL=false
   ```

5. Ensure your firewall allows port 8000:
   ```bash
   # Linux (ufw)
   sudo ufw allow 8000/tcp
   # Linux (firewalld)
   sudo firewall-cmd --add-port=8000/tcp --permanent
   sudo firewall-cmd --reload
   ```

### Frontend Configuration

1. Copy the example environment file:
   ```bash
   cd web
   cp .env.example .env
   ```

2. Set the backend API URL to your public IP or domain:
   ```bash
   VITE_API_BASE_URL=http://YOUR_PUBLIC_IP:8000
   # Or for HTTPS:
   VITE_API_BASE_URL=https://your-domain.com
   ```

3. Rebuild the frontend:
   ```bash
   bun run build
   ```

### Example Setup

**Backend server (192.168.1.100):**
```bash
cd backend
export MOMENTO_API_HOST=0.0.0.0
export MOMENTO_API_PORT=8000
export MOMENTO_CORS_ORIGINS=http://192.168.1.100:5173,http://192.168.1.100:8080
python3 run_api.py
```

**Remote client:**
```bash
cd web
export VITE_API_BASE_URL=http://192.168.1.100:8000
bun run dev
# Access at http://localhost:8080
```

### Security Notes

- Always use HTTPS in production
- Set strong `MOMENTO_SECRET_KEY` in production
- Change default operator credentials
- Consider using a reverse proxy (nginx) for SSL termination
- Keep the backend behind a firewall and only expose necessary ports

---

## Useful commands

```bash
# backend
python3 -m compileall -q momento run_api.py   # syntax check
python3 run_api.py --init-only                # create the database and exit
python3 run_api.py --receiver-only            # ingest watcher without the API
python3 run_api.py --reload                   # development auto-reload

# frontend
bun run dev
bun run build
bun run lint
```

---

## Responsible use

This platform is analytical instrumentation. Forecasts are probabilistic estimates
over historical structure, never guarantees, and no model can predict a random
outcome. The autopilot is a paper-trading decision recorder — it never places
anything. Never stake money you cannot afford to lose.
