# Megaplan: System Documentation, Standardization, Backtesting & Eagle Eye Dashboard

This plan implements a comprehensive system overhaul including developer documentation, master settings enhancement, data strategy standardization, full backtesting framework, and an advanced Eagle Eye Dashboard with multi-dimensional filtering.

## Phase 1: Developer Documentation System (Priority 1)

**Objective**: Create comprehensive Markdown developer guides to enable seamless addition of pages and functions, and configure Devin AI with system context before making changes.

### 1.1 Documentation Structure
- Create `docs/developer/` directory structure
- Core documentation files:
  - `ARCHITECTURE.md` - System architecture overview
  - `ADDING_PAGES.md` - Step-by-step guide for adding new pages
  - `ADDING_FUNCTIONS.md` - Guide for adding backend functions
  - `DATA_FLOW.md` - How data moves through the system
  - `TESTING_GUIDE.md` - Testing conventions and practices
  - `STYLING_GUIDE.md` - UI/UX patterns and component usage

### 1.2 Configure Devin AI Context
- Update `.devin/AGENTS.md` with:
  - Current system architecture
  - Page creation patterns
  - Backend function patterns
  - Data access patterns (Command Center strategy)
  - Component library usage
- Update `.devin/CODING_STANDARDS.md` with:
  - TypeScript/React patterns
  - Python/FastAPI patterns
  - Database interaction patterns
  - WebSocket integration patterns

### 1.3 Documentation Content
Each guide will include:
- Prerequisites
- Step-by-step instructions
- Code examples
- Common pitfalls
- Testing requirements
- Integration points

## Phase 2: Master Settings Panel Enhancement

**Objective**: Create a comprehensive master settings page that allows tweaking the entire system from a single interface.

### 2.1 Backend Enhancements
- Extend `momento/config.py` AnalysisSettings with new parameters:
  - Backtesting window sizes
  - Filter presets for Eagle Eye
  - Feature toggle configurations
  - Session grouping parameters
- Add new settings categories in settings table:
  - `backtesting_settings` - backtest parameters
  - `dashboard_settings` - UI/UX configurations
  - `filter_presets` - saved filter configurations

### 2.2 Frontend Master Settings Page
- Create new page: `/dashboard/master-settings` (or enhance existing Settings.tsx)
- Add sections:
  - **Analysis Parameters** (existing - move from Settings.tsx)
  - **Engine Toggles** (existing - move from Settings.tsx)
  - **Backtesting Configuration** - window sizes, session gaps, accuracy thresholds
  - **Dashboard Presets** - default views, refresh rates, chart configurations
  - **Filter Management** - save/load filter presets for Eagle Eye
  - **System Limits** - max rounds, buffer sizes, rate limits

### 2.3 API Endpoints
- Add `/settings/backtesting` GET/PUT endpoints
- Add `/settings/dashboard` GET/PUT endpoints
- Add `/settings/filters` CRUD endpoints for filter presets

## Phase 3: Standardize Data Strategy Across All Pages

**Objective**: Adapt Command Center's stable data strategy to all unstable pages to ensure consistent file-based round usage.

### 3.1 Identify Unstable Pages
Based on code analysis, these pages use `usePlatform` but may have inconsistent data strategies:
- Resistance.tsx
- DnaHunter.tsx
- ForecastStudio.tsx
- LadderDash.tsx
- Linguistics.tsx
- Market.tsx
- MoonshotFinder.tsx
- Autopilot.tsx
- BirdEye.tsx

### 3.2 Standardize Data Access Pattern
Ensure all pages follow Command Center pattern:
```typescript
// Use file-based rounds with ingest_method filter
const allRoundsQuery = useQuery({
  queryKey: ["page-rounds", source],
  queryFn: () => api.rounds(source, limit, 0, "desc", "file"),
  refetchInterval: POLL.rounds,
  staleTime: 1500,
});

// Use file-based analysis
const fileAnalysisQuery = useQuery({
  queryKey: ["page-analysis", source],
  queryFn: () => api.analysis(source, limit, "file"),
  refetchInterval: false,
  staleTime: 30000,
});
```

### 3.3 Backend Consistency
- Ensure `store.get_rounds()` and `store.analysis_payload()` properly handle `ingest_method` parameter
- Add validation to ensure file-based queries return consistent results
- Update API route handlers to enforce ingest_method filtering

### 3.4 Page-by-Page Updates
Update each unstable page to:
1. Use `ingest_method: "file"` for rounds queries
2. Use `ingest_method: "file"` for analysis queries
3. Add WebSocket invalidation on file ingest events
4. Ensure consistent polling intervals

## Phase 4: Investigation Suite (Full Backtesting Framework)

**Objective**: Create a comprehensive backtesting system that runs features through historical sessions to measure prediction accuracy with togglable features.

### 4.1 Backend Implementation

#### 4.1.1 New Database Schema
Add table to `db.py`:
```sql
CREATE TABLE IF NOT EXISTS backtest_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    name TEXT NOT NULL,
    config_json TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    total_rounds INTEGER NOT NULL,
    total_sessions INTEGER NOT NULL,
    accuracy_overall REAL,
    accuracy_by_state TEXT,
    feature_impacts TEXT,
    created_at TEXT NOT NULL
);
```

#### 4.1.2 Backtesting Engine (`momento/backtest.py`)
Create new module with functions:
- `run_backtest(source, config)` - main backtest runner
- `split_by_sessions(rounds, gap_seconds)` - session segmentation
- `simulate_prediction(rounds, feature_toggles)` - prediction simulation
- `measure_accuracy(predictions, actuals)` - accuracy calculation
- `feature_impact_analysis(base_accuracy, feature_accuracy)` - impact measurement

#### 4.1.3 API Routes (`momento/api/routes/backtest.py`)
Add endpoints:
- `POST /backtest/run` - start a backtest run
- `GET /backtest/runs` - list backtest runs
- `GET /backtest/run/{id}` - get specific run results
- `DELETE /backtest/run/{id}` - delete a run

#### 4.1.4 Configuration Schema
Backtest config includes:
- Session gap threshold
- Feature toggles (which features to enable/disable)
- Prediction horizon
- Test feature (new feature to evaluate)
- Baseline comparison (full system vs. without feature)
- Session filters (time range, session count)

### 4.2 Frontend Implementation

#### 4.2.1 New Page: Investigation Suite
Create `/dashboard/investigation` page with:
- **Configuration Panel**:
  - Source selector
  - Session gap slider
  - Feature toggle matrix (checkboxes for each engine)
  - Test feature selector
  - Time range picker
  - Session count limit
- **Run Controls**:
  - Start backtest button
  - Stop button (for long runs)
  - Progress indicator
- **Results Panel**:
  - Overall accuracy metrics
  - Per-session accuracy breakdown
  - Feature impact scores
  - Comparison charts (baseline vs. with feature)
  - Session-by-session detailed table
- **History Panel**:
  - List of past backtest runs
  - Compare runs
  - Delete runs

#### 4.2.2 Add Navigation Link
Update `App.tsx` to add route:
```typescript
<Route path="/dashboard/investigation" element={<Investigation />} />
```

Update Sidebar component to include Investigation link

#### 4.2.3 API Client Updates
Add to `api.ts`:
```typescript
backtestRun: (config: BacktestConfig) => request<BacktestRun>("/backtest/run", { method: "POST", body: config }),
backtestRuns: (source: string) => request<{ runs: BacktestRun[] }>(`/backtest/runs${qs({ source })}`),
backtestResult: (id: number) => request<BacktestRun>(`/backtest/run/${id}`),
deleteBacktest: (id: number) => request<{ deleted: number }>(`/backtest/run/${id}`, { method: "DELETE" }),
```

### 4.3 Backtesting Logic
1. **Session Segmentation**: Split historical rounds into sessions using gap threshold
2. **Baseline Run**: Run full system prediction on all sessions
3. **Feature Toggle Runs**: Run with each feature disabled individually
4. **Test Feature Run**: Run with new feature enabled
5. **Accuracy Calculation**: Compare predictions to actual outcomes
6. **Impact Analysis**: Measure delta between baseline and each variant
7. **Reporting**: Generate comprehensive accuracy report per session and overall

## Phase 5: Mawillah's Eagle Eye Dashboard

**Objective**: Create a full-page continuous rounds display (1000+ rounds) with advanced multi-dimensional filtering matching the Betway Aviator interface theme.

### 5.1 Backend Enhancements

#### 5.1.1 Advanced Filtering API
Extend `momento/api/routes/rounds.py`:
```python
@router.get("/rounds/filtered")
async def get_filtered_rounds(
    source: str = Depends(source_param),
    limit: int = Query(default=1000, ge=1, le=10000),
    offset: int = Query(default=0, ge=0),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    ingest_method: str = Query(default=None),
    # New filters
    session_id: Optional[int] = Query(default=None),
    multiplier_ranges: Optional[str] = Query(default=None),  # JSON array of [min, max]
    min_multiplier: Optional[float] = Query(default=None),
    max_multiplier: Optional[float] = Query(default=None),
    bands: Optional[str] = Query(default=None),  # comma-separated
    moonshot_only: bool = Query(default=False),
    min_moonshot: float = Query(default=10.0),
    ceiling_levels: Optional[str] = Query(default=None),  # JSON array
    gap_ranges: Optional[str] = Query(default=None),  # JSON array
    rounds_between_min: Optional[int] = Query(default=None),
    rounds_between_max: Optional[int] = Query(default=None),
    time_start: Optional[str] = Query(default=None),
    time_end: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
```

#### 5.1.2 Filter Logic in Store
Add `get_filtered_rounds()` function in `momento/store.py`:
- Parse complex filter parameters
- Build dynamic SQL WHERE clauses
- Support multiple multiplier ranges (OR logic)
- Support band filtering
- Support ceiling/gap analysis filtering
- Support session filtering
- Support time range filtering
- Support "rounds between" filtering (find rounds with N rounds in range)

### 5.2 Frontend Implementation

#### 5.2.1 New Page: Eagle Eye Dashboard
Create `/dashboard/eagle-eye` page with:

**Layout**:
- Full-page grid display (like Betway Round History)
- Dense multiplier grid (1000+ rounds visible)
- Color-coded by multiplier value (green/purple/red like Betway)
- Responsive grid (adjusts columns based on screen width)

**Filter Panel** (collapsible sidebar):
- **Session Filter**: Dropdown of sessions (from sessions API)
- **Multiplier Ranges**: Multi-range selector
  - Add/remove range buttons
  - Min/max inputs for each range
  - Example: 2.30x-3.40x AND 4.0x-8.9x simultaneously
- **Band Filter**: Multi-select checkboxes (Low, Ignition, Moonshot, Mega)
- **Moonshot Filter**: Toggle + minimum threshold (default 10x)
- **Ceiling Filter**: Multi-select from detected ceiling levels
- **Gap Filter**: Range selector for gap sizes
- **Rounds Between**: Find rounds with N rounds within specified range
- **Time Range**: Date/time picker for start/end
- **Ingest Method**: File/Live/All toggle

**Display Options**:
- Grid size (small, medium, large)
- Color scheme (Betway theme, custom themes)
- Sort order (newest first, oldest first)
- Show/hide metadata (timestamp, band, points)

**Statistics Bar**:
- Total rounds matching filter
- Average multiplier
- Distribution by band
- Moonshot count
- Session count

**Actions**:
- Export filtered rounds (CSV/JSON)
- Save filter preset
- Load filter preset
- Reset filters

#### 5.2.2 Visual Design
Match Betway Aviator interface:
- Dense grid layout
- Multiplier cells with:
  - Background color based on value
  - White text for contrast
  - Rounded corners
  - Hover effects
- Color mapping:
  - Green: 1.0x - 1.99x
  - Purple: 2.0x - 9.99x
  - Red: 10.0x+ (moonshots)
- Compact spacing
- Scrollable container with sticky headers

#### 5.2.3 Performance Optimizations
- Virtual scrolling for large datasets
- Debounced filter application
- Cached filter results
- Lazy loading for pagination

#### 5.2.4 Add Navigation Link
Update `App.tsx`:
```typescript
<Route path="/dashboard/eagle-eye" element={<EagleEye />} />
```

Update Sidebar component

### 5.3 Filter Preset System
- Save/load filter configurations
- Preset names and descriptions
- Quick-select common filters (e.g., "All Moonshots", "Compression Zones")
- Share presets via URL parameters

## Implementation Order

1. **Phase 1**: Developer Documentation (configure Devin AI first)
2. **Phase 2**: Master Settings Enhancement
3. **Phase 3**: Data Strategy Standardization
4. **Phase 4**: Investigation Suite (Backtesting)
5. **Phase 5**: Eagle Eye Dashboard

## Testing Strategy

Each phase includes:
- Unit tests for new backend functions
- Integration tests for API endpoints
- E2E tests for new pages
- Performance tests for large datasets
- Accessibility tests for UI components

## Acceptance Criteria

### Phase 1
- Developer can add a new page following documentation
- Devin AI has context of system architecture
- All documentation is accurate and up-to-date

### Phase 2
- All system settings accessible from single page
- Settings persist correctly
- Changes take effect immediately

### Phase 3
- All pages use consistent file-based data strategy
- No unstable behavior across pages
- WebSocket updates work consistently

### Phase 4
- Can run backtest on historical sessions
- Feature impact accurately measured
- Results clearly displayed
- Navigation link visible in sidebar

### Phase 5
- Display 1000+ rounds in grid
- All filter types work correctly
- Multi-range multiplier filtering works
- Visual design matches Betway theme
- Performance acceptable with large datasets

## Technical Constraints

- Maintain backward compatibility
- No breaking changes to existing API
- Follow existing coding standards
- Use existing component library (shadcn/ui)
- Maintain WebSocket real-time updates where applicable
- Respect database performance (add indexes as needed)
