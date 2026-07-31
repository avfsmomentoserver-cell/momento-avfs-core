# Data Flow in Momento Core

This document explains how data flows through the Momento Core system.

## Overview

Momento Core follows a modular pipeline architecture:
1. **Collection** - Data enters the system
2. **Storage** - Data is persisted
3. **Analysis** - Data is processed
4. **Prediction** - Predictions are generated
5. **Delivery** - Results are delivered to the frontend

## Data Ingestion Paths

### Path 1: Live Feed (WebSocket)

```
External Game → Feed Script → WebSocket → Feed Handler → Database → Broadcast → Frontend
```

**Components**:
- `momento/feed.py` - Feed handler
- `momento/store.py` - `ingest_rounds()`
- `momento/hub.py` - Broadcasting
- `web/src/lib/ws.ts` - WebSocket client

**Flow**:
1. Feed script connects to external game
2. Receives round data via WebSocket
3. Calls `store.ingest_rounds()` to save to database
4. `ingest_method` set to "live-feed"
5. Hub broadcasts "round:new" event
6. Frontend receives via WebSocket
7. PlatformProvider updates rounds buffer
8. React Query invalidates related queries

### Path 2: File Watcher

```
Collector Script → JSON File → Inbox Directory → Watcher → Ingest File → Database → Broadcast → Frontend
```

**Components**:
- `collector_aviator.js` - Browser-based collector
- `momento/watcher.py` - File system watcher
- `momento/store.py` - `ingest_file()`
- `momento/hub.py` - Broadcasting

**Flow**:
1. Collector script downloads rounds as JSON
2. File saved to inbox directory (or Downloads)
3. Watcher scans directory periodically
4. Calls `store.ingest_file()` to process file
5. `ingest_method` set to "file"
6. Rounds inserted into database
7. Hub broadcasts "rounds:update" event
8. Hub broadcasts "analysis:update" event
9. Frontend receives updates via WebSocket

### Path 3: Manual API Ingest

```
Frontend Form → API Request → Ingest Endpoint → Database → Broadcast → Frontend
```

**Components**:
- `web/src/pages/dashboard/Ingest.tsx` - UI
- `momento/api/routes/ingest.py` - API endpoint
- `momento/store.py` - `ingest_rounds()`

**Flow**:
1. User enters rounds in UI or uploads file
2. Frontend calls `/ingest` API endpoint
3. Endpoint calls `store.ingest_rounds()`
4. `ingest_method` set to "api"
5. Rounds inserted into database
6. Hub broadcasts updates
7. Frontend refreshes

## Data Storage

### Database Schema

**rounds table**:
```sql
CREATE TABLE rounds (
    id INTEGER PRIMARY KEY,
    source TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    multiplier REAL NOT NULL,
    color TEXT,
    band TEXT,
    points REAL,
    source_file TEXT,
    ingest_method TEXT NOT NULL DEFAULT 'api',
    created_at TEXT NOT NULL,
    UNIQUE (source, timestamp, multiplier)
);
```

**Key fields**:
- `ingest_method` - How the round was ingested (api, file, live-feed)
- `source_file` - Original file if ingested from file
- `band` - Computed band (low, ignition, moonshot, mega)

### Query Patterns

**Get rounds with ingest_method filter**:
```python
def get_rounds(source: str, limit: int, offset: int, order: str, ingest_method: Optional[str]):
    where_clause = "WHERE source = ?"
    params = [source]

    if ingest_method:
        where_clause += " AND ingest_method = ?"
        params.append(ingest_method)

    rows = db.query(f"SELECT ... FROM rounds {where_clause} ...", (*params, limit, offset))
```

## Analysis Flow

### Request Flow

```
Frontend → API Request → analysis_payload() → history() → analyze() → forecast() → Response
```

**Components**:
- `web/src/lib/api.ts` - API client
- `momento/api/routes/analysis.py` - API endpoint
- `momento/store.py` - `analysis_payload()`
- `momento/analysis.py` - Analysis functions
- `momento/forecast.py` - Forecast functions

**Flow**:
1. Frontend calls `api.analysis(source, limit, ingest_method)`
2. API endpoint calls `store.analysis_payload(source, limit, ingest_method)`
3. Check cache (1-second TTL)
4. If cache miss:
   - Call `store.history(source, limit, ingest_method)` to get rounds
   - Call `analysis.analyze(rounds, settings)` for analysis
   - If forecast enabled: call `forecast.forecast(rounds, settings, payload)`
   - Compute accuracy via `forecast.accuracy(source)`
   - Cache result
5. Return payload to frontend

### Analysis Payload Structure

```python
{
    "source": "aviator",
    "state": "Compression",
    "state_scores": {"Compression": 0.85, "Expansion": 0.12, ...},
    "state_meta": {"tone": "neutral", "color": "#8b95b7", "meaning": "..."},
    "narrative": "Plain language description",
    "prediction_confidence": {"confidence": 0.75, "moonshot_probability": 0.15, ...},
    "signals": {"gap_swing": {...}, "ceiling": {...}, ...},
    "distribution": {...},
    "band_histogram": {...},
    "percentiles": {...},
    "predictions": [...],
    "transitions": [...],
    "warnings": [...],
    "accuracy": {"overall": 0.65, "last_10": 0.70, ...},
    "session": {...},
    "latest": {"multiplier": 2.5, "band": "ignition"},
    "config": {...},
    "engines": {...},
    "empty": False
}
```

## Real-time Update Flow

### WebSocket Events

**Event Types**:
- `round:new` - Single new round arrived
- `rounds:update` - Batch of rounds updated
- `analysis:update` - Analysis payload updated
- `feed:status` - Feed status changed
- `ingest:scan` - File ingest scan completed

**Frontend Handling** (PlatformProvider):

```typescript
// On round:new
wsTransport.on("round:new", (envelope) => {
  const round = envelope.payload;
  if (round.source !== source) return;
  setRounds(previous => mergeRounds(previous, [round]));
  setFlashRoundId(round.id);
});

// On analysis:update
wsTransport.on("analysis:update", (envelope) => {
  const payload = envelope.payload;
  if (payload.source !== source) return;
  setLiveAnalysis(payload);
});

// On ingest:scan
wsTransport.on("ingest:scan", () => {
  queryClient.invalidateQueries({ queryKey: ["rounds", source] });
  queryClient.invalidateQueries({ queryKey: ["analysis", source] });
});
```

## Frontend Data Flow

### PlatformProvider (Global State)

**Responsibilities**:
- Manages selected source
- Maintains round buffer (400 rounds)
- Caches analysis payload
- Handles WebSocket connection
- Provides data to all pages

**Data Sources**:
1. **Initial Load** - React Query fetches from API
2. **WebSocket Updates** - Real-time deltas
3. **Polling Fallback** - If WebSocket disconnected

**Query Pattern**:
```typescript
// Rounds query
const roundsQuery = useQuery({
  queryKey: ["rounds", source],
  queryFn: () => api.rounds(source, 400, 0, "desc", "live-feed"),
  refetchInterval: connected ? POLL.slow : POLL.rounds,
});

// Analysis query
const analysisQuery = useQuery({
  queryKey: ["analysis", source],
  queryFn: () => api.analysis(source),
  refetchInterval: connected ? POLL.slow : POLL.analysis,
});
```

### Page-Level Data Flow

**Standard Pattern**:
```typescript
const { source, analysis, rounds } = usePlatform();

// Use shared data directly
const state = analysis?.state;
const latestRound = rounds[0];

// Or fetch page-specific data
const pageDataQuery = useQuery({
  queryKey: ["page-data", source],
  queryFn: () => api.pageData(source),
});
```

**File-Based Pattern** (Command Center):
```typescript
const fileRoundsQuery = useQuery({
  queryKey: ["page-rounds", source],
  queryFn: () => api.rounds(source, 80, 0, "desc", "file"),
  refetchInterval: POLL.rounds,
});

const fileAnalysisQuery = useQuery({
  queryKey: ["page-analysis", source],
  queryFn: () => api.analysis(source, 600, "file"),
  refetchInterval: false,
});
```

## Caching Strategy

### Backend Caching

**Analysis Payload Cache**:
- Location: `momento/store.py` (in-memory)
- TTL: 1 second
- Key: `{source}:{limit}:{ingest_method}`

**Purpose**: Avoid redundant analysis calculations when multiple requests arrive in quick succession.

### Frontend Caching

**React Query Cache**:
- Automatic caching of API responses
- Configurable stale time
- Background refetching

**Pattern**:
```typescript
useQuery({
  queryKey: ["data", source],
  queryFn: () => api.data(source),
  staleTime: 1500,  // Consider fresh for 1.5s
  refetchInterval: 5000,  // Refetch every 5s
});
```

## Session Segmentation

**Definition**: Sessions are groups of rounds with time gaps larger than a threshold.

**Implementation**:
```python
def split_sessions(rounds: Sequence[Round], gap_seconds: int) -> List[List[Round]]:
    sessions = []
    current = []
    previous = None

    for entry in rounds:
        stamp = _parse_ts(entry.get("timestamp"))
        if previous is not None and stamp is not None:
            if (stamp - previous).total_seconds() > gap_seconds:
                sessions.append(current)
                current = []
        current.append(entry)
        previous = stamp

    if current:
        sessions.append(current)

    return sessions
```

**Usage**: Used in backtesting, session analysis, and historical reporting.

## Error Handling

### Backend Errors

**Database Errors**:
- Logged to console
- Return error response to API
- Frontend displays error message

**Analysis Errors**:
- Try/except in analysis functions
- Return safe defaults
- Log warnings

### Frontend Errors

**API Errors**:
- React Query error state
- Displayed in PlatformProvider error banner
- Individual query error handling

**WebSocket Errors**:
- Automatic reconnection
- Fallback to polling
- Connection status indicator

## Performance Considerations

### Database Performance

**Indexes**:
- Primary key on `id`
- Index on `(source, timestamp)`
- Unique constraint on `(source, timestamp, multiplier)`

**Query Optimization**:
- Use LIMIT to avoid large result sets
- Filter by source and ingest_method
- Use OFFSET for pagination

### Frontend Performance

**Round Buffer**:
- Limited to 400 rounds in PlatformProvider
- Merges new rounds with existing
- Sorts and slices to maintain limit

**Analysis Payload**:
- Cached for 1 second on backend
- Cached by React Query on frontend
- Only refetches when stale

**Large Datasets**:
- Use pagination
- Implement virtual scrolling (planned)
- Debounce filter inputs

## Security Considerations

**Input Validation**:
- Source normalization
- Limit clamping
- Type checking

**SQL Injection Prevention**:
- Always use parameterized queries
- Never concatenate user input

**Access Control**:
- JWT authentication for operators
- Source-based access control
- CORS configuration
