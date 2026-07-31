# Momento Core Architecture

## System Overview

Momento Core is a prediction and analysis platform for crash-style games (Aviator, JetX, Crash, etc.). The system collects round data, analyzes patterns, and provides real-time predictions through a modular pipeline architecture.

## Technology Stack

### Backend
- **Language**: Python 3.10+
- **Framework**: FastAPI
- **Database**: SQLite
- **Real-time**: WebSocket (custom hub implementation)
- **Data Processing**: Pure Python functions (analysis.py, forecast.py)

### Frontend
- **Language**: TypeScript
- **Framework**: React 18
- **Build Tool**: Vite
- **State Management**: React Query + Context API
- **UI Components**: shadcn/ui + TailwindCSS
- **Icons**: Lucide React

## Architecture Layers

### 1. Data Collection Layer
- **Live Feed**: `momento/feed.py` - WebSocket-based live data collection
- **File Watcher**: `momento/watcher.py` - Monitors inbox directory for JSON/CSV files
- **Manual Ingest**: API endpoint for manual round injection
- **Collector Scripts**: JavaScript collectors (e.g., `collector_aviator.js`) for browser-based collection

### 2. Data Storage Layer
- **Database**: SQLite (`momento/db.py`)
- **Tables**:
  - `rounds` - Historical round data with ingest_method tracking
  - `forecasts` - Prediction records
  - `metrics` - Performance metrics
  - `sessions` - Session boundaries
  - `settings` - Configuration persistence
  - `backtest_runs` - Backtest results

### 3. Analysis Engine
- **Core Analysis**: `momento/analysis.py` - Pure functions for statistics, ladders, resistance, streaks
- **Forecast Engine**: `momento/forecast.py` - Prediction generation
- **Linguistics**: `momento/linguistics.py` - Pattern classification and narrative generation
- **Plugins**: Extensible analyzer system

### 4. API Layer
- **Routes**: `momento/api/routes/` - Modular FastAPI routers
  - `rounds.py` - Round history and sessions
  - `analysis.py` - Analysis endpoints
  - `forecasts.py` - Forecast management
  - `ingest.py` - Data ingestion
  - `settings.py` - Configuration
- **Dependencies**: `momento/api/deps.py` - Common dependencies (source auth, etc.)
- **Schemas**: `momento/api/schemas.py` - Pydantic models

### 5. Real-time Layer
- **Hub**: `momento/hub.py` - Event broadcasting system
- **WebSocket**: `momento/api/routes/ws.py` - WebSocket connections
- **Frontend Transport**: `web/src/lib/ws.ts` - WebSocket client

### 6. Frontend Application
- **Routing**: React Router in `App.tsx`
- **State**: `PlatformProvider.tsx` - Global data spine
- **Pages**: `web/src/pages/` - Dashboard, auth, app pages
- **Components**: `web/src/components/` - Reusable UI components
- **API Client**: `web/src/lib/api.ts` - Backend communication

## Data Flow

### Ingestion Flow
```
Collector/Watcher → store.ingest_file() → Database → WebSocket broadcast → Frontend update
```

### Analysis Flow
```
Database → store.history() → analysis.analyze() → forecast.forecast() → analysis_payload() → API → Frontend
```

### Real-time Update Flow
```
New Round → Database → hub.broadcast() → WebSocket → PlatformProvider → React Query invalidation → UI update
```

## Key Patterns

### Backend Patterns
- **Pure Functions**: Analysis functions are pure (no I/O) for testability
- **Memoization**: `store.analysis_payload()` caches results for 1 second
- **Ingest Method Tracking**: All rounds tagged with `ingest_method` (api, file, live-feed)
- **Session Segmentation**: Rounds grouped by time gaps (configurable)

### Frontend Patterns
- **React Query**: Data fetching with automatic caching and refetching
- **Platform Context**: Single source of truth for source, rounds, analysis
- **WebSocket Integration**: Real-time updates on top of polling
- **Component Library**: shadcn/ui for consistent UI

## Module Boundaries

### Backend
- `momento/db.py` - Database access only
- `momento/store.py` - Business logic for data operations
- `momento/analysis.py` - Pure analysis functions
- `momento/forecast.py` - Prediction logic
- `momento/api/` - HTTP interface only

### Frontend
- `web/src/lib/api.ts` - API communication only
- `web/src/state/` - State management only
- `web/src/components/` - UI components only
- `web/src/pages/` - Page composition only

## Configuration

### Backend Config
- File: `momento/config.py`
- Environment variables override defaults
- Settings persisted in database `settings` table
- Categories: AnalysisSettings, RuntimeToggles

### Frontend Config
- File: `web/src/lib/config.ts`
- API base URL, polling intervals
- Local storage keys for persistence

## Security

- JWT token authentication (operator accounts)
- CORS configuration
- Source-based access control
- SQL injection prevention (parameterized queries)

## Performance Considerations

- Database indexes on frequently queried columns
- Analysis result caching (1-second TTL)
- Round buffer limit (400 rounds in PlatformProvider)
- WebSocket for real-time, polling for fallback
- Virtual scrolling for large datasets (planned)

## Extension Points

### Adding New Analyzers
1. Create function in `momento/analysis.py` or new module
2. Add to plugin system
3. Include in analysis payload

### Adding New Sources
1. Register in `sources` table
2. Create collector script if needed
3. Configure in Settings page

### Adding New Pages
See `ADDING_PAGES.md` for detailed guide.

## Testing Strategy

- Unit tests for pure functions
- Integration tests for API endpoints
- E2E tests for critical user flows
- Manual testing via RoundTesting page
