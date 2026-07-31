# Adding Backend Functions to Momento Core

This guide explains how to add new backend functions to the Momento Core system.

## Prerequisites

- Familiarity with Python and FastAPI
- Understanding of the existing backend structure
- Knowledge of the analysis engine patterns

## Function Types

### 1. Pure Analysis Functions

Pure functions that operate on round data without I/O. These go in `momento/analysis.py` or new analysis modules.

### 2. Store Functions

Data access functions that interact with the database. These go in `momento/store.py`.

### 3. API Endpoint Functions

HTTP endpoint handlers. These go in `momento/api/routes/`.

## Step-by-Step Guide

### Adding a Pure Analysis Function

Pure analysis functions are the building blocks of the analysis engine. They take round data and return computed results.

**Location**: `momento/analysis.py` or a new module

```python
# momento/analysis.py
from typing import List, Dict, Any, Sequence

Round = Dict[str, Any]

def your_analysis_function(rounds: Sequence[Round], settings: AnalysisSettings) -> Dict[str, Any]:
    """
    Brief description of what this function does.

    Args:
        rounds: Sequence of round dicts (oldest first)
        settings: AnalysisSettings configuration

    Returns:
        Dict with analysis results
    """
    if not rounds:
        return {"value": 0, "count": 0}

    multipliers = [float(r["multiplier"]) for r in rounds]

    # Your analysis logic here
    result = {
        "value": sum(multipliers) / len(multipliers),
        "count": len(multipliers),
    }

    return result
```

**Key Points**:
- Functions should be pure (no database access, no I/O)
- Use type hints
- Include docstrings
- Handle empty input gracefully
- Return plain dicts (no custom objects)

### Adding a Store Function

Store functions handle database operations and business logic.

**Location**: `momento/store.py`

```python
# momento/store.py
from typing import Dict, Any, Optional
from . import db, config

def get_your_data(source: str, limit: int = 100) -> Dict[str, Any]:
    """
    Retrieve your data from the database.

    Args:
        source: Game source identifier
        limit: Maximum number of records

    Returns:
        Dict with data and metadata
    """
    source = normalize_source(source)
    limit = max(1, min(int(limit), 5000))

    rows = db.query(
        """SELECT id, source, timestamp, multiplier
           FROM rounds
           WHERE source = ?
           ORDER BY timestamp DESC
           LIMIT ?""",
        (source, limit),
    )

    return {
        "data": db.rows_to_dicts(rows),
        "source": source,
        "limit": limit,
    }
```

**Key Points**:
- Normalize source using `normalize_source()`
- Validate and clamp limits
- Use parameterized queries (no SQL injection)
- Return structured dicts with metadata
- Use `db.rows_to_dicts()` for result conversion

### Adding an API Endpoint

API endpoints expose your functions via HTTP.

**Location**: Create new file in `momento/api/routes/` or add to existing

```python
# momento/api/routes/your_feature.py
from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, Optional

from ..deps import source_param
from ... import store, analysis, config

router = APIRouter(prefix="/your-feature", tags=["your-feature"])

@router.get("/data")
async def get_your_data(
    source: str = Depends(source_param),
    limit: int = Query(default=100, ge=1, le=1000),
    ingest_method: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    """
    Get your feature data.

    Args:
        source: Game source identifier
        limit: Maximum records to return
        ingest_method: Filter by ingestion method (api, file, live-feed)

    Returns:
        Dict with data and metadata
    """
    return store.get_your_data(source, limit, ingest_method)

@router.post("/action")
async def perform_action(
    source: str = Depends(source_param),
    params: Dict[str, Any] = None,
) -> Dict[str, Any]:
    """
    Perform an action.

    Args:
        source: Game source identifier
        params: Action parameters

    Returns:
        Dict with action result
    """
    result = store.perform_action(source, params)

    # Broadcast update via WebSocket
    hub.broadcast_threadsafe("your-feature:update", {"source": source, "result": result})

    return result
```

**Key Points**:
- Use `source_param` dependency for source validation
- Use Query parameters for GET requests
- Use Pydantic models for POST request bodies (complex data)
- Broadcast updates via hub for real-time UI
- Include docstrings for OpenAPI docs

### Registering the Router

Add your router to the main app in `momento/api/app.py`:

```python
# momento/api/app.py
from .routes import your_feature

app.include_router(your_feature.router)
```

## Common Patterns

### Database Queries

```python
# Single row
row = db.query_one("SELECT * FROM table WHERE id = ?", (id,))

# Multiple rows
rows = db.query("SELECT * FROM table WHERE source = ?", (source,))

# With transaction
with db.transaction():
    db.execute("INSERT INTO table ...", params)
    db.execute("UPDATE table ...", params)
```

### Working with Sessions

```python
from .analysis import split_sessions

sessions = split_sessions(rounds, gap_seconds=settings.session_gap_seconds)

for session in sessions:
    # Analyze each session
    result = your_analysis_function(session, settings)
```

### Using AnalysisSettings

```python
from .config import analysis_settings

settings = analysis_settings()

# Access settings
threshold = settings.moonshot_threshold
window = settings.dna_window
```

### Using RuntimeToggles

```python
from .store import runtime_toggles

toggles = runtime_toggles()

if toggles.forecast_engine:
    # Run forecast
    pass
```

### Caching Results

```python
import time
from threading import Lock

_CACHE = {}
_CACHE_LOCK = Lock()
_CACHE_TTL = 1.0  # seconds

def cached_function(key: str) -> Dict[str, Any]:
    with _CACHE_LOCK:
        cached = _CACHE.get(key)
        if cached and (time.monotonic() - cached[0]) < _CACHE_TTL:
            return cached[1]

    result = compute_result(key)

    with _CACHE_LOCK:
        _CACHE[key] = (time.monotonic(), result)

    return result
```

### Broadcasting Updates

```python
from . import hub

# Broadcast to all connected clients
hub.broadcast_threadsafe("event:name", {"data": "value"})

# Broadcast source-specific update
hub.broadcast_threadsafe("rounds:update", {"rounds": new_rounds, "source": source})
```

## Adding to Analysis Payload

To include your analysis in the main analysis payload:

```python
# momento/store.py - in analysis_payload function
payload["your_feature"] = analysis.your_analysis_function(rounds, settings)
```

## Testing Your Functions

### Unit Tests

```python
# tests/test_analysis.py
def test_your_analysis_function():
    rounds = [
        {"multiplier": 1.5, "timestamp": "2024-01-01T00:00:00Z"},
        {"multiplier": 2.0, "timestamp": "2024-01-01T00:01:00Z"},
    ]
    settings = AnalysisSettings()

    result = your_analysis_function(rounds, settings)

    assert result["count"] == 2
    assert result["value"] == 1.75
```

### Manual Testing

Use the RoundTesting page to inject test rounds and verify your function works correctly.

## Common Pitfalls

- **Not normalizing source**: Source names should be normalized
- **SQL injection**: Always use parameterized queries
- **Not handling empty data**: Functions should handle empty input
- **Side effects in pure functions**: Analysis functions should be pure
- **Not broadcasting updates**: UI won't refresh automatically
- **Forgetting to register router**: Endpoint won't be accessible
- **Not validating limits**: Users could request too much data

## Examples

See existing functions for reference:
- `analysis.py` - Pure analysis functions
- `store.py` - Data access functions
- `api/routes/rounds.py` - API endpoints
- `api/routes/analysis.py` - Analysis endpoints
