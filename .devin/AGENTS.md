# Project Agents Configuration

This file defines the specialist agents for the Momento Core Platform project, adapted from the MDOS workspace configuration.

## System Architecture Overview

Momento Core is a prediction and analysis platform for crash-style games with a modular pipeline architecture:

**Technology Stack**:
- Backend: Python 3.10+, FastAPI, SQLite
- Frontend: TypeScript, React 18, Vite, shadcn/ui, TailwindCSS
- Real-time: Custom WebSocket implementation
- Data Processing: Pure Python functions

**Architecture Layers**:
1. Data Collection Layer (feed.py, watcher.py, collector scripts)
2. Data Storage Layer (SQLite with ingest_method tracking)
3. Analysis Engine (analysis.py - pure functions, forecast.py)
4. API Layer (modular FastAPI routers in api/routes/)
5. Real-time Layer (hub.py for broadcasting)
6. Frontend Application (React Router, PlatformProvider context)

**Data Flow**:
- Ingestion: Collector/Watcher → store.ingest_file() → Database → WebSocket broadcast → Frontend
- Analysis: Database → store.history() → analysis.analyze() → forecast.forecast() → analysis_payload() → API → Frontend
- Real-time: New Round → Database → hub.broadcast() → WebSocket → PlatformProvider → UI update

**Key Patterns**:
- Pure analysis functions (no I/O) for testability
- Memoization in store.analysis_payload() (1-second TTL)
- Ingest method tracking (api, file, live-feed)
- Session segmentation by time gaps
- PlatformProvider as single source of truth for frontend

## Default Agent

**Project Administrator (ag_admin)** - Coordinates all interactions and delegates to specialists.

## Specialist Agents

### Project Administrator (ag_admin)
- **Role**: Orchestration
- **Purpose**: Understand project state and coordinate specialist agents to advance milestones
- **Responsibilities**:
  - Read architecture & roadmap
  - Generate implementation plans
  - Break work into tasks
  - Assign to specialists
  - Track blockers
  - Coordinate validation
- **Boundaries**: Coordinates work; never silently modifies unrelated parts of the system
- **Default for**: All chat prompts, planning, coordination

### System Architect (ag_arch)
- **Role**: Architecture
- **Purpose**: Design future architecture, find weaknesses, create migration strategies
- **Responsibilities**:
  - Review existing architecture
  - Design contracts
  - Produce ADRs
  - Review major changes
- **Boundaries**: Architecture over short-term convenience

### Backend Engineer (ag_backend)
- **Role**: Implementation
- **Purpose**: Implement REST APIs, SSE, services, and business logic
- **Responsibilities**:
  - FastAPI endpoints
  - Services
  - WebSockets
  - Business logic
- **Boundaries**: Preserve existing event contracts

### Frontend Engineer (ag_frontend)
- **Role**: Implementation
- **Purpose**: Build interfaces and visualizations
- **Responsibilities**:
  - Dashboards
  - Charts
  - Real-time UI
- **Boundaries**: Match reference UX; replace mock data with real APIs

### Database Engineer (ag_db)
- **Role**: Data
- **Purpose**: Maintain storage, migrations, and optimization
- **Responsibilities**:
  - Schema
  - Migrations
  - Indexing
- **Boundaries**: Never edit historical truth

### Collector Engineer (ag_collector)
- **Role**: Collection
- **Purpose**: Maintain browser automation and ingestion
- **Responsibilities**:
  - Playwright collectors
  - Validation
  - Deduplication
  - Heartbeat/reconnect
- **Boundaries**: All external data passes through observation

### Forecast Engineer (ag_forecast)
- **Role**: Intelligence
- **Purpose**: Improve prediction logic with measurable outputs
- **Responsibilities**:
  - Feature extraction
  - Pattern analysis
  - Confidence scoring
- **Boundaries**: No prediction without explanation

### DevOps Engineer (ag_devops)
- **Role**: Operations
- **Purpose**: Handle deployment across local and cloud
- **Responsibilities**:
  - Vercel/Render/Supabase
  - CI
  - Config
- **Boundaries**: Keep environments independent

### Documentation Engineer (ag_docs)
- **Role**: Docs
- **Purpose**: Keep documentation current and generated from structured data
- **Responsibilities**:
  - MES docs
  - Backlinks
  - Review workflows
- **Boundaries**: No duplicate knowledge

### QA Engineer (ag_qa)
- **Role**: Quality
- **Purpose**: Prove reliability with tests
- **Responsibilities**:
  - Unit
  - Integration
  - Replay
  - Historical
  - Live verification
- **Boundaries**: Definition of Done gate

### System Mentor (ag_mentor)
- **Role**: Teaching
- **Purpose**: Teach the owner every subsystem in four layers: simple, technical, engineering, future
- **Responsibilities**:
  - Explain files & architecture
  - Use real-world analogies
  - Never assume knowledge
  - Produce diagrams
- **Boundaries**: Teacher first, engineer second, coder third

## Agent Coordination

All specialist agents are coordinated by the Project Administrator (ag_admin). The system follows a skills-first approach:

1. **Skills First**: Automatically use relevant skills before agent fallback
2. **Project Admin Coordination**: Specialist agents work together through project admin
3. **Fallback Hierarchy**: Skills → Project Admin → Specialist Agents → General Purpose

## Entry Point Integration

All agents are entry-point aware and coordinate through the project administrator. The default entry point for all chat prompts is `all_prompts`, which routes to the Project Administrator.

## Page Creation Patterns

When adding new dashboard pages, follow this pattern:

1. **Create page component** in `web/src/pages/dashboard/YourPage.tsx`:
   - Use `AppShell` wrapper for layout
   - Use `usePlatform()` hook for shared data (source, analysis, rounds)
   - Use React Query for page-specific data fetching
   - Use `Panel` components for content organization
   - Follow existing styling (shadcn/ui + TailwindCSS)

2. **Add route** in `web/src/App.tsx`:
   ```typescript
   <Route path="/dashboard/your-page" element={<YourPage />} />
   ```

3. **Add navigation link** in Sidebar component

4. **Add API endpoints** if needed (see Backend Function Patterns below)

**File-based Data Strategy (Command Center Pattern)**:
For pages that should use file-based rounds only (stable data strategy):
```typescript
const fileRoundsQuery = useQuery({
  queryKey: ["page-rounds", source],
  queryFn: () => api.rounds(source, 80, 0, "desc", "file"),
  refetchInterval: POLL.rounds,
  staleTime: 1500,
});

const fileAnalysisQuery = useQuery({
  queryKey: ["page-analysis", source],
  queryFn: () => api.analysis(source, 600, "file"),
  refetchInterval: false,
  staleTime: 30000,
});
```

## Backend Function Patterns

### Pure Analysis Functions
Location: `momento/analysis.py` or new analysis modules
- Must be pure (no database access, no I/O)
- Take round data and settings, return computed results
- Use type hints and docstrings
- Handle empty input gracefully

Example:
```python
def your_analysis_function(rounds: Sequence[Round], settings: AnalysisSettings) -> Dict[str, Any]:
    if not rounds:
        return {"value": 0, "count": 0}
    # Analysis logic
    return result
```

### Store Functions
Location: `momento/store.py`
- Handle database operations and business logic
- Normalize source using `normalize_source()`
- Use parameterized queries (no SQL injection)
- Return structured dicts with metadata

Example:
```python
def get_your_data(source: str, limit: int = 100) -> Dict[str, Any]:
    source = normalize_source(source)
    limit = max(1, min(int(limit), 5000))
    rows = db.query("SELECT ... WHERE source = ? LIMIT ?", (source, limit))
    return {"data": db.rows_to_dicts(rows), "source": source, "limit": limit}
```

### API Endpoints
Location: `momento/api/routes/` (create new or add to existing)
- Use `source_param` dependency for source validation
- Use Query parameters for GET requests
- Broadcast updates via hub for real-time UI
- Include docstrings for OpenAPI docs

Example:
```python
@router.get("/your-data")
async def get_your_data(
    source: str = Depends(source_param),
    limit: int = Query(default=100, ge=1, le=1000),
) -> Dict[str, Any]:
    result = store.get_your_data(source, limit)
    hub.broadcast_threadsafe("your-feature:update", {"source": source, "result": result})
    return result
```

Register router in `momento/api/app.py`:
```python
from .routes import your_feature
app.include_router(your_feature.router)
```

## Data Access Patterns (Command Center Strategy)

The Command Center uses a stable data strategy that should be adopted by all pages:

1. **Use file-based rounds with ingest_method filter**:
   - Backend: `store.get_rounds(source, limit, offset, order, ingest_method="file")`
   - Frontend: `api.rounds(source, limit, 0, "desc", "file")`

2. **Use file-based analysis**:
   - Backend: `store.analysis_payload(source, limit, ingest_method="file")`
   - Frontend: `api.analysis(source, limit, "file")`

3. **WebSocket invalidation on file ingest events**:
   - Backend: `hub.broadcast_threadsafe("ingest:scan", ...)` after file ingest
   - Frontend: `wsTransport.on("ingest:scan", () => queryClient.invalidateQueries())`

4. **Consistent polling intervals**:
   - Use `POLL.rounds` for rounds queries
   - Use `POLL.analysis` for analysis queries
   - Use `POLL.slow` for less frequent data

## Component Library Usage

Momento Core uses shadcn/ui components with TailwindCSS styling:

**Common Components**:
- `AppShell` - Page layout wrapper with sidebar and top bar
- `Panel` - Content container with title, subtitle, icon, actions
- `StatTile` - Metric display with value, accent, progress, hint
- `Button` - Action buttons with size and variant options
- `Input` - Form inputs
- `Label` - Form labels
- `EmptyState` - Empty data display
- `StateBadge` - State indicator
- `RoundsFeed` - Round list display

**Styling Conventions**:
- Use semantic colors: signal, caution, critical, info
- Use `cn()` utility for conditional classes
- Maintain consistent spacing: space-y-4, gap-2
- Use existing components from shadcn/ui
- Follow TailwindCSS utility-first approach

**Icons**: Use Lucide React icons consistently
