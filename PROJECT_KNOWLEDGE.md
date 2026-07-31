# Momento Core Platform - Project Knowledge

## Overview

Momento Core is a modular analytics and forecasting platform for crash-curve round data. The platform processes round events through a pipeline: Collector → Ingest API → Analysis → Forecast Engine → Database → Dashboard.

### Technology Stack

- **Backend**: Python 3 / FastAPI / SQLAlchemy / SQLite (WAL mode)
- **Frontend**: Vite + React + TypeScript
- **Collection**: Playwright (browser automation)
- **Testing**: Unit, integration, replay, historical, live validation
- **Documentation**: Markdown with structured knowledge base

### Core Principles

1. **Observation Before Prediction** - Understand the present before reasoning about the future
2. **Immutable Raw Events** - Raw data is never edited; corrections are recorded separately
3. **Explainability Is Mandatory** - Every prediction must have explanation metadata
4. **Local vs Production Independence** - SQLite/local dev must always work when cloud support is added

## Architecture

### Module Pipeline

```
Collector → Ingest API → Analysis → Forecast Engine → Database → Dashboard
```

### The Momento Kernel

- **Round Event Model** - Core data structure for round events
- **Database Layer** - SQLAlchemy ORM with SQLite
- **Schema Contracts** - Clear contracts between modules
- **Runtime** - Execution environment
- **Event Bus** - Event-driven communication
- **API Contracts** - REST API and WebSocket contracts
- **Engine Registry** - Plugin system for analyzers

### Intelligence Engine Chain

```
Pattern → DNA → Similarity → Probability → Confidence → Forecast
```

Each engine is replaceable with clear contracts, independently tested, and produces measurable outputs.

## Project Structure

### Backend (`/backend`)

- `momento/` - Core backend modules
  - `analysis.py` - Analysis engine (ladders, resistance, streaks, regimes, edge fit)
  - `api/` - FastAPI routes and endpoints
  - `auth.py` - Authentication and authorization
  - `autopilot.py` - Decision recording and paper P&L tracking
  - `config.py` - Configuration management
  - `db.py` - Database models and persistence
  - `feed.py` - Live round engine
  - `forecast.py` - Forecast engine (Markov + percentile + DNA blend)
  - `hub.py` - WebSocket hub for real-time updates
  - `linguistics.py` - Eight-layer semantic vocabulary
  - `orchestrator.py` - Decision orchestrator (patience, speed, risk, mistake prevention)
  - `plugins.py` - Plugin registry with live weights
  - `store.py` - Storage layer
  - `watcher.py` - File watcher for data ingestion
- `requirements.txt` - Python dependencies
- `run_api.py` - API server entry point

### Frontend (`/web`)

- `src/` - React/TypeScript source code
  - Components for operator console and consumer app
  - Real-time UI with WebSocket integration
  - Charts and visualizations
- `package.json` - Node.js dependencies
- `vite.config.ts` - Vite build configuration
- `tailwind.config.ts` - Tailwind CSS configuration

### Configuration (`.devin/`)

- `AGENTS.md` - Specialist agent definitions and responsibilities
- `CODING_STANDARDS.md` - Project coding standards and best practices
- `README.md` - Project configuration overview
- `config.json` - Main project configuration and entry point system
- `skills/` - Individual skill definitions (FastAPI, React, Playwright, etc.)
- `workflows/` - Workflow definitions (standard-task, new-feature, architecture-review, deployment)

### MDOS Package (`mdos-package/`)

- Reusable workspace configuration package
- Agent definitions, skills, and environment wiring
- Deployment and import documentation
- Structured for client-facing development work

## Eight Sub-Projects

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

## Twenty Screens

### Operator Console
- Command Center
- Market
- Ladder Telemetry
- Resistance
- Moonshot Finder
- DNA Hunter
- Forecast Studio
- Linguistics
- Orchestrator
- Autopilot
- Plugin Inventory
- Ingest Console
- Sources
- Bird's Eye
- Build Steps
- Master Settings
- Users
- Round Testing

### Consumer App
- Today
- Pro Predictions
- Charts
- Premium

## Agent System

### Default Agent
**Project Administrator (ag_admin)** - Coordinates all interactions and delegates to specialists.

### Specialist Agents

1. **Project Administrator (ag_admin)** - Orchestration, planning, coordination
2. **System Architect (ag_arch)** - Architecture design, ADRs, migration strategies
3. **Backend Engineer (ag_backend)** - FastAPI endpoints, services, WebSockets, business logic
4. **Frontend Engineer (ag_frontend)** - Dashboards, charts, real-time UI
5. **Database Engineer (ag_db)** - Schema, migrations, indexing
6. **Collector Engineer (ag_collector)** - Playwright collectors, validation, deduplication
7. **Forecast Engineer (ag_forecast)** - Feature extraction, pattern analysis, confidence scoring
8. **DevOps Engineer (ag_devops)** - Deployment, CI, config
9. **Documentation Engineer (ag_docs)** - MES docs, backlinks, workflow documentation
10. **QA Engineer (ag_qa)** - Unit, integration, replay, historical, live verification
11. **System Mentor (ag_mentor)** - Teaching subsystems in four layers

### Agent Coordination

- **Skills First**: Automatically use relevant skills before agent fallback
- **Project Admin Coordination**: Specialist agents work together through project admin
- **Fallback Hierarchy**: Skills → Project Admin → Specialist Agents → General Purpose

## Workflows

### /standard-task
Routine development work with stages: Understand → Design → Implement → Test → Document → Review

### /new-feature
Adding new capabilities with stages: Purpose → Necessity → Separation → Measurement → Evolution → Implement

### /architecture-review
Design decisions and ADRs with stages: Read current → Find weaknesses → Design target → ADR → Migration plan

### /deployment
Local and cloud deployment with stages: Build → Validate → Stage → Promote → Monitor

## Coding Standards

### Python (FastAPI)
- Google-style docstrings
- Type hints required for all function signatures
- Async/await for I/O operations
- PEP 8 formatting
- Explicit imports at the top of files

### TypeScript (React)
- JSDoc for documentation
- Strict TypeScript configuration
- Functional components with hooks
- Explicit interface definitions
- No `any` types without justification

### Database
- SQLAlchemy ORM with explicit models
- Migration files for all schema changes
- Never edit historical truth
- Indexing strategy documented

## Development Workflow

### Atomic Commits
- One logical change per commit
- Clear commit messages
- Test before committing
- Fix failures before proceeding

### Testing First
- Run tests before changes
- Run tests after changes
- Fix failures before proceeding
- Unit, integration, replay, historical, live verification

### Documentation
- Google-style docstrings (Python)
- JSDoc (TypeScript)
- ADRs for architectural decisions
- Update docs after approved work

## Quality Gates

### Definition of Done
- Code implemented
- Tests passing
- Documentation updated
- Code reviewed
- Backward compatible

### Validation
- Unit tests
- Integration tests
- Replay tests
- Historical validation
- Live verification

## Configuration

### Backend Essentials
```bash
MOMENTO_API_PORT=8000
MOMENTO_DATABASE_PATH=backend/data/momento.db
MOMENTO_SECRET_KEY=<openssl rand -hex 32>
MOMENTO_OPERATOR_PASSWORD=<change-me>
MOMENTO_FEED_AUTOSTART=false
```

### Frontend
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

## Data Ingestion

### Methods
1. **REST push** - POST to `/api/v1/ingest`
2. **File watcher** - Drop JSON/CSV/TXT into `backend/data/inbox/`
3. **Live engine** - Cryptographically verifiable round engine

### Accepted Formats
- JSON arrays or objects (`rounds`/`data`/`results`/`items`/`history`/`records`)
- CSV with or without header
- Plain list of numbers
- Multipliers from `multiplier`, `value`, `crash_point`, `result`, or `payout`
- Timestamps in ISO-8601, epoch seconds, or epoch milliseconds

## Honest Accuracy

The forecast engine stores every projection **before** the round lands. When the round arrives, the open forecast is scored against the recorded range. Accuracy figures, per-state breakdown, and Brier score describe real predictive performance — nothing can be back-dated, and unrecorded forecasts do not count.

## Documentation Structure

Step-by-step implementation documentation lives in `docs/steps/`:

| Step | Document |
| --- | --- |
| 01 | Architecture & configuration |
| 02 | Database & persistence |
| 03 | MomentoLinguistics layer |
| 04 | Analysis engine |
| 05 | Forecast engine |
| 06 | Ingest & live engine |
| 07 | Plugin registry |
| 08 | Orchestrator & autopilot |
| 09 | API & WebSocket |
| 10 | Frontend foundation |
| 11 | Operator console |
| 12 | Consumer app |
| 13 | Deployment: Debian on Azure |

## Security

### Data Protection
- Never expose raw historical data
- Corrections recorded separately
- Audit trail for all changes

### API Security
- Input validation on all endpoints
- Proper error handling
- Rate limiting
- Authentication/authorization

## Performance

### Optimization
- Database indexing
- Efficient queries
- Caching where appropriate
- Async I/O operations

### Monitoring
- Log key metrics
- Track prediction accuracy
- Monitor system health
- Alert on anomalies

## Useful Commands

### Backend
```bash
python3 -m compileall -q momento run_api.py   # syntax check
python3 run_api.py --init-only                # create database and exit
python3 run_api.py --receiver-only            # ingest watcher without API
python3 run_api.py --reload                   # development auto-reload
```

### Frontend
```bash
bun run dev
bun run build
bun run lint
```

## Responsible Use

This platform is analytical instrumentation. Forecasts are probabilistic estimates over historical structure, never guarantees, and no model can predict a random outcome. The autopilot is a paper-trading decision recorder — it never places anything. Never stake money you cannot afford to lose.
