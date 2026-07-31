# Momento Core Platform - Technical Overview

## Executive Summary

Momento Core is a modular analytics and forecasting platform designed for crash-curve round data. The platform processes round events through a sophisticated pipeline: **Collector → Ingest API → Analysis → Forecast Engine → Database → Dashboard**.

Built with Python 3/FastAPI for the backend and React/TypeScript for the frontend, the platform provides real-time analysis, forecasting, and decision orchestration capabilities for crash game data.

## Core Philosophy

### Four Foundational Principles

1. **Observation Before Prediction** - Understand the present before reasoning about the future
2. **Immutable Raw Events** - Raw data is never edited; corrections are recorded separately
3. **Explainability Is Mandatory** - Every prediction must have explanation metadata
4. **Local vs Production Independence** - SQLite/local dev must always work when cloud support is added

## Architecture Overview

### Module Pipeline

```
Collector → Ingest API → Analysis → Forecast Engine → Database → Dashboard
```

### The Momento Kernel

The platform is built around a central kernel consisting of:

- **Round Event Model** - Core data structure for round events
- **Database Layer** - SQLAlchemy ORM with SQLite (WAL mode)
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

## Technology Stack

### Backend
- **Language**: Python 3
- **Framework**: FastAPI
- **ORM**: SQLAlchemy
- **Database**: SQLite (WAL mode)
- **Async**: Async/await for I/O operations

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Charts**: Recharts
- **State Management**: React Query

### Data Collection
- **Tool**: Playwright (browser automation)
- **Validation**: Multi-layer validation and deduplication

## Core Sub-Projects

### 1. Collector & Ingest
**Responsibility**: File watcher, REST push, upload, live engine  
**Surface**: `/dashboard/ingest`

Features:
- File watcher for automated ingestion
- REST API for programmatic data push
- Manual upload interface
- Live round engine with cryptographic verification
- Multi-format support (JSON, CSV, plain text)

### 2. Analysis Core
**Responsibility**: Ladders, resistance, streaks, regimes, edge fit  
**Surface**: `/dashboard`

Features:
- Ladder analysis for pattern detection
- Resistance level identification
- Streak analysis (winning/losing sequences)
- Regime detection (market state changes)
- Edge fit analysis for statistical significance

### 3. MomentoLinguistics
**Responsibility**: Eight-layer semantic vocabulary  
**Surface**: `/dashboard/linguistics`

Features:
- Eight-layer semantic classification system
- Multiplier-to-semantic mapping
- Band-based categorization
- Linguistic tokens for pattern recognition

### 4. Forecast Engine
**Responsibility**: Markov + percentile + DNA blend, measured accuracy  
**Surface**: `/dashboard/studio`

Features:
- Markov chain analysis
- Percentile-based forecasting
- DNA pattern matching
- Confidence scoring
- Honest accuracy tracking (forecasts stored before round lands)

### 5. Decision Orchestrator
**Responsibility**: Patience, speed, risk, mistake prevention  
**Surface**: `/orchestrator`

Features:
- Patience optimization
- Speed analysis
- Risk assessment
- Mistake prevention logic
- Decision recording

### 6. Autopilot Ledger
**Responsibility**: Recorded decisions, measured paper P&L  
**Surface**: `/dashboard/autopilot`

Features:
- Decision recording and tracking
- Paper P&L calculation
- Performance metrics
- Trade history

### 7. Plugin Inventory
**Responsibility**: Analyzer registry with live weights  
**Surface**: `/inventory`

Features:
- Plugin registry system
- Live weight management
- Analyzer performance tracking
- Plugin configuration

### 8. Consumer App
**Responsibility**: Simplified daily guidance, premium tiers  
**Surface**: `/app`

Features:
- Daily guidance interface
- Premium tier features
- Simplified consumer experience

## API Architecture

### REST API Endpoints

#### Data Ingestion
- `POST /api/v1/ingest` - Push round data
- `GET /api/v1/sources` - List configured sources
- `GET /api/v1/rounds` - Retrieve historical rounds
- `GET /api/v1/rounds/latest` - Get latest rounds for a source

#### Analysis
- `GET /api/v1/analysis` - Get analysis results
- `GET /api/v1/linguistics` - Get linguistic tokens
- `GET /api/v1/candles` - Get OHLC candle data

#### Forecasting
- `GET /api/v1/forecasts` - Get forecasts
- `POST /api/v1/forecasts` - Create forecast

#### Autopilot
- `GET /api/v1/autopilot/decisions` - Get recorded decisions
- `POST /api/v1/autopilot/decisions` - Record decision

### WebSocket Real-Time Updates

- `/ws` - Main WebSocket connection
- Real-time round updates
- Live analysis updates
- Forecast notifications

## Data Models

### Round Record
```typescript
interface RoundRecord {
  id: number;
  multiplier: number;
  timestamp: string;
  source: string;
}
```

### Source Info
```typescript
interface SourceInfo {
  id: string;
  name: string;
  active: boolean;
  round_count: number;
  latest_multiplier: number | null;
}
```

### Candle (OHLC)
```typescript
interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  peak_multiplier: number;
  volume: number;
  time: string;
}
```

### Linguistics Token
```typescript
interface LinguisticsToken {
  band: string;
  points: number;
  multiplier: number;
  label: string;
}
```

## Data Ingestion Methods

### 1. REST Push
```bash
POST /api/v1/ingest
Content-Type: application/json

{
  "source": "my_source",
  "rounds": [
    {"multiplier": 1.5, "timestamp": "2024-01-01T00:00:00Z"},
    {"multiplier": 2.0, "timestamp": "2024-01-01T00:01:00Z"}
  ]
}
```

### 2. File Watcher
Drop files into `backend/data/inbox/`:
- JSON arrays or objects
- CSV with or without header
- Plain list of numbers

### 3. Live Engine
Cryptographically verifiable round engine for real-time data collection.

## Analysis Capabilities

### Ladder Analysis
- Pattern detection using ladder structures
- Support/resistance identification
- Trend analysis

### Resistance Levels
- Dynamic resistance calculation
- Historical resistance tracking
- Breakthrough detection

### Streak Analysis
- Winning/losing streak detection
- Streak probability calculation
- Streak pattern recognition

### Regime Detection
- Market state identification
- Regime change detection
- State transition analysis

### Edge Fit Analysis
- Statistical significance testing
- Edge quantification
- Confidence intervals

## Forecasting System

### Honest Accuracy
The forecast engine stores every projection **before** the round lands. When the round arrives, the open forecast is scored against the recorded range. Accuracy figures, per-state breakdown, and Brier score describe real predictive performance — nothing can be back-dated, and unrecorded forecasts do not count.

### Forecast Components
- **Markov Analysis**: State transition probabilities
- **Percentile Analysis**: Historical percentile positioning
- DNA Pattern Matching**: Similar historical patterns
- **Confidence Scoring**: Statistical confidence levels

### Forecast Output
```typescript
interface Forecast {
  id: string;
  source: string;
  timestamp: string;
  prediction: {
    min: number;
    max: number;
    confidence: number;
  };
  explanation: {
    markov_score: number;
    percentile_score: number;
    dna_score: number;
  };
}
```

## Development Workflow

### Coding Standards

#### Python (FastAPI)
- Google-style docstrings
- Type hints required for all function signatures
- Async/await for I/O operations
- PEP 8 formatting
- Explicit imports at the top of files

#### TypeScript (React)
- JSDoc for documentation
- Strict TypeScript configuration
- Functional components with hooks
- Explicit interface definitions
- No `any` types without justification

### Testing Strategy
- Unit tests
- Integration tests
- Replay tests
- Historical validation
- Live verification

### Quality Gates
- Code implemented
- Tests passing
- Documentation updated
- Code reviewed
- Backward compatible

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

## Extensibility

### Plugin System
The platform features a plugin registry system that allows:
- Custom analyzers
- Live weight management
- Performance tracking
- Plugin configuration

### Middleware Pattern
All new features follow a strict middleware pattern:
- Isolation from main system
- Clear data contracts
- Independent testing
- Versioned interfaces

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
