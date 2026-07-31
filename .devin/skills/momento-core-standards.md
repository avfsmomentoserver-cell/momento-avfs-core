# Momento Core UI & Architecture Standards

This skill guide documents the project's UI standards, component library usage, and backend architecture patterns to ensure consistent implementation across all new features.

## Frontend Standards

### Component Library
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Styling**: TailwindCSS with custom design tokens
- **Icons**: Lucide React
- **State Management**: React Query + Context API
- **Routing**: React Router

### Key Components

#### AppShell
**Location**: `web/src/components/layout/AppShell.tsx`

The standard page wrapper providing sidebar, top bar, and content well.

```tsx
import { AppShell } from "@/components/layout/AppShell";

export default function YourPage() {
  return (
    <AppShell
      title="Page Title"
      subtitle="Optional subtitle"
      actions={<Button>Action</Button>}
    >
      {/* Page content */}
    </AppShell>
  );
}
```

**Props**:
- `title`: Page title (required)
- `subtitle`: Optional subtitle
- `actions`: Optional action buttons
- `children`: Page content
- `wide`: Remove max-width constraint

#### Panel
**Location**: `web/src/components/console/Panel.tsx`

The standard instrument panel with hairline border, label row, and content well.

```tsx
import { Panel } from "@/components/console/Panel";

<Panel
  title="Panel Title"
  subtitle="Optional subtitle"
  icon={<Sparkles className="h-3.5 w-3.5" />}
  actions={<Button>Action</Button>}
  lit
  dense
>
  {/* Panel content */}
</Panel>
```

**Props**:
- `title`: Panel title
- `subtitle`: Optional subtitle
- `icon`: Optional Lucide icon
- `actions`: Optional action buttons
- `lit`: Highlighted panel (for emphasis)
- `dense`: Reduced padding
- `bodyClassName`: Custom body classes

#### StatTile
**Location**: `web/src/components/console/StatTile.tsx`

Hero readout with label, big monospaced value, optional meter.

```tsx
import { StatTile } from "@/components/console/StatTile";

<StatTile
  label="Confidence"
  value={percent(confidence)}
  accent="signal"
  progress={confidence}
  hint="blended read"
  icon={<Gauge className="h-3.5 w-3.5" />}
  emphasis
/>
```

**Props**:
- `label`: Metric label
- `value`: Displayed value (ReactNode)
- `accent`: Color accent - "signal" | "info" | "caution" | "critical" | "violet" | "neutral"
- `progress`: Optional 0-1 progress value
- `hint`: Optional hint text
- `icon`: Optional Lucide icon
- `emphasis`: Larger text size

#### StateBadge
**Location**: `web/src/components/console/StateBadge.tsx`

State indicator with optional pulse animation.

```tsx
import { StateBadge } from "@/components/console/StateBadge";

<StateBadge state="Ignition" size="lg" pulse />
```

#### EmptyState
**Location**: `web/src/components/console/EmptyState.tsx`

Empty data display with icon and description.

```tsx
import { EmptyState } from "@/components/console/EmptyState";

<EmptyState
  compact
  title="No data available"
  description="Ingest rounds to see analysis."
/>
```

### Styling Conventions

#### Semantic Colors
Use these semantic color tokens for consistent meaning:

```tsx
// Tailwind classes
text-signal    // Phosphor mint - positive/success
text-caution   // Amber - warning
text-critical  // Crimson - error/negative
text-info      // Cyan - information
text-violet    // Violet - special/high-value
text-muted-foreground // Gray - secondary
```

#### Utility Classes
```tsx
// Spacing
space-y-4      // Vertical spacing between children
gap-2          // Horizontal/vertical gap
p-4            // Padding
px-4 py-3      // Specific padding

// Typography
hud-label      // Uppercase, tracking-wide label
font-mono      // Monospace font
tabular-nums   // Tabular numbers for alignment
text-[11px]    // Small text
text-sm        // Small text
text-lg        // Large text
font-semibold  // Semibold weight

// Borders
border-border  // Theme border color
border-border/60 // Semi-transparent border

// Backgrounds
bg-muted/15    // Semi-transparent muted background
bg-gray-900    // Dark gray background
```

#### cn() Utility
Always use the `cn()` utility for conditional classes:

```tsx
import { cn } from "@/lib/utils";

<div className={cn(
  "base-class",
  isActive && "active-class",
  "another-class"
)} />
```

### Typography Standards

```tsx
// Labels (uppercase, tracking-wide)
<p className="hud-label">Metric Name</p>

// Values (monospaced, tabular)
<p className="font-mono text-xl font-semibold tabular-nums">
  {multiplier(value)}
</p>

// Subtitles (muted, small)
<p className="text-muted-foreground text-[11px]">
  Optional description
</p>

// Chip badges
<span className="chip-muted">Label</span>
<span className="chip-info">Info</span>
```

### Icon Usage

Always use Lucide React icons consistently:

```tsx
import { Activity, Gauge, Flame, Sparkles } from "lucide-react";

// Standard size for panel headers
<Sparkles className="h-3.5 w-3.5" />

// Standard size for StatTile icons
<Gauge className="h-3.5 w-3.5" />

// Larger icons for emphasis
<Flame className="h-8 w-8" />

// Animated loading state
<Loader2 className="h-4 w-4 animate-spin" />
```

## Backend Architecture

### Pure Analysis Functions
**Location**: `backend/momento/analysis.py`

Every analysis function must be pure - no database access, no I/O.

```python
from typing import Any, Dict, Sequence
from .config import AnalysisSettings

Round = Dict[str, Any]

def your_analysis_function(
    rounds: Sequence[Round],
    settings: AnalysisSettings
) -> Dict[str, Any]:
    """
    Calculate custom metric from rounds.
    
    Args:
        rounds: List of round dictionaries (oldest first)
        settings: Analysis configuration
        
    Returns:
        Dictionary with computed results
    """
    if not rounds:
        return {"value": 0, "count": 0}
    
    # Pure calculation logic
    multipliers = [float(r["multiplier"]) for r in rounds]
    result = sum(multipliers) / len(multipliers)
    
    return {
        "value": round(result, 4),
        "count": len(rounds)
    }
```

**Rules**:
- Must accept `Sequence[Round]` as input
- Must return plain `Dict[str, Any]`
- No database access
- No file I/O
- No network calls
- Handle empty input gracefully
- Use type hints
- Include docstrings

### Store Functions
**Location**: `backend/momento/store.py`

Store functions handle database operations and business logic.

```python
from typing import Dict, Any
from . import db

def get_your_data(source: str, limit: int = 100) -> Dict[str, Any]:
    """
    Retrieve and process data from database.
    
    Args:
        source: Data source identifier
        limit: Maximum records to return
        
    Returns:
        Dictionary with data and metadata
    """
    # Normalize source
    source = normalize_source(source)
    
    # Validate and clamp limit
    limit = max(1, min(int(limit), 5000))
    
    # Parameterized query (no SQL injection)
    rows = db.query(
        "SELECT * FROM rounds WHERE source = ? LIMIT ?",
        (source, limit)
    )
    
    # Return structured dict with metadata
    return {
        "data": db.rows_to_dicts(rows),
        "source": source,
        "limit": limit,
        "count": len(rows)
    }
```

**Rules**:
- Always normalize source with `normalize_source()`
- Use parameterized queries (no SQL injection)
- Return structured dicts with metadata
- Validate and clamp limits
- Handle errors gracefully

### API Endpoints
**Location**: `backend/momento/api/routes/`

Create modular FastAPI routers for each feature.

```python
from typing import Dict, Any
from fastapi import APIRouter, Depends, Query
from ..deps import source_param
from ... import store

router = APIRouter()

@router.get("/your-feature")
async def get_your_data(
    source: str = Depends(source_param),
    limit: int = Query(default=100, ge=1, le=1000),
) -> Dict[str, Any]:
    """
    Get your feature data.
    
    Args:
        source: Data source identifier
        limit: Maximum records to return (1-1000)
        
    Returns:
        Feature data with metadata
    """
    result = store.get_your_data(source, limit)
    
    # Broadcast for real-time UI updates
    from ...hub import hub
    hub.broadcast_threadsafe(
        "your-feature:update",
        {"source": source, "result": result}
    )
    
    return result
```

**Rules**:
- Use `source_param` dependency for source validation
- Use Query parameters for GET requests
- Include docstrings for OpenAPI docs
- Broadcast updates via hub for real-time UI
- Register router in `momento/api/app.py`

**Register router**:
```python
# In backend/momento/api/app.py
from .routes import your_feature

app.include_router(your_feature.router, prefix="/your-feature", tags=["your-feature"])
```

## Data Flow Patterns

### Ingestion Flow
```
Collector/Watcher 
  → store.ingest_file() 
  → Database 
  → hub.broadcast() 
  → WebSocket 
  → PlatformProvider 
  → UI update
```

### Analysis Flow
```
Database 
  → store.history() 
  → analysis.analyze() 
  → forecast.forecast() 
  → store.analysis_payload() 
  → API 
  → Frontend
```

### Real-time Flow
```
New Round 
  → Database 
  → hub.broadcast() 
  → WebSocket 
  → PlatformProvider 
  → React Query invalidation 
  → UI update
```

## State Management

### PlatformProvider
**Location**: `web/src/state/PlatformProvider.tsx`

The single source of truth for frontend data.

```tsx
import { usePlatform } from "@/state/PlatformProvider";

export default function YourPage() {
  const { 
    source, 
    setSource, 
    analysis, 
    rounds, 
    latestRound, 
    feed, 
    connected, 
    loading, 
    flashRoundId 
  } = usePlatform();
  
  // Use shared data
  return <div>{/* ... */}</div>;
}
```

**Provides**:
- `source`: Current selected source
- `setSource`: Change source
- `analysis`: Analysis payload
- `rounds`: Round buffer (400 rounds)
- `latestRound`: Most recent round
- `feed`: Live feed status
- `connected`: WebSocket connection status
- `loading`: Initial loading state
- `flashRoundId`: ID of newly arrived round

### React Query Patterns

**Standard query pattern**:
```tsx
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";

const query = useQuery({
  queryKey: ["your-data", source, param],
  queryFn: () => api.yourData(source, param),
  refetchInterval: POLL.analysis, // 4000ms
  staleTime: 1500,
});
```

**Poll intervals** (from `lib/config.ts`):
```tsx
POLL.analysis: 4000   // Analysis data
POLL.rounds: 6000     // Round data
POLL.health: 15000    // Health checks
POLL.slow: 30000      // Slow-changing data
```

**Query key patterns**:
```tsx
// Single item
queryKey: ["item", id]

// List with source
queryKey: ["items", source]

// With parameters
queryKey: ["analysis", source, limit, ingest_method]
```

## Page Creation Pattern

### Step 1: Create Page Component
**Location**: `web/src/pages/dashboard/YourPage.tsx`

```tsx
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Panel } from "@/components/console/Panel";
import { StatTile } from "@/components/console/StatTile";
import { usePlatform } from "@/state/PlatformProvider";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";

export default function YourPage() {
  const { source } = usePlatform();
  
  const dataQuery = useQuery({
    queryKey: ["your-data", source],
    queryFn: () => api.yourData(source),
    refetchInterval: POLL.analysis,
    staleTime: 1500,
  });
  
  return (
    <AppShell title="Your Page" subtitle="Page description">
      <div className="space-y-4">
        <StatTile label="Metric" value={dataQuery.data?.value} />
        <Panel title="Panel" subtitle="Description">
          {/* Content */}
        </Panel>
      </div>
    </AppShell>
  );
}
```

### Step 2: Add Route
**Location**: `web/src/App.tsx`

```tsx
<Route path="/dashboard/your-page" element={<YourPage />} />
```

### Step 3: Add Navigation Link
**Location**: `web/src/components/layout/Sidebar.tsx`

Add to the navigation menu.

### Step 4: Add API Endpoints (if needed)
Create backend routes in `backend/momento/api/routes/your_feature.py`

### Step 5: Add Middleware (for inventions)
**Location**: `web/src/lib/invent-middleware/yourFeature.ts`

```tsx
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";

export function useYourData(source: string) {
  return useQuery({
    queryKey: ["your-data", source],
    queryFn: () => api.yourData(source),
    refetchInterval: POLL.analysis,
    staleTime: 1500,
  });
}
```

## Design Tokens

### Color Palette (HSL)

```css
/* Semantic Colors */
--signal: 158 88% 60%;      /* Phosphor mint - positive */
--caution: 36 100% 56%;     /* Amber - warning */
--critical: 353 100% 65%;   /* Crimson - error */
--info: 199 89% 60%;       /* Cyan - information */
--violet: 258 90% 72%;     /* Violet - special */

/* Base Colors */
--background: 220 42% 3%;   /* Deep ink chassis */
--foreground: 210 30% 94%; /* Light text */
--card: 218 38% 6%;        /* Card background */
--muted: 217 28% 12%;      /* Muted background */
--border: 216 30% 13%;     /* Border color */
```

### Spacing Scale
```tsx
gap-1    // 4px
gap-2    // 8px
gap-3    // 12px
gap-4    // 16px
gap-6    // 24px

space-y-2 // 8px vertical
space-y-3 // 12px vertical
space-y-4 // 16px vertical
```

### Typography Scale
```tsx
text-[11px]  // Labels, subtitles
text-sm      // 14px
text-base    // 16px
text-lg      // 18px
text-xl      // 20px
text-2xl     // 24px
text-3xl     // 30px
```

### Border Radius
```tsx
rounded-md   // 6px
rounded-lg   // 8px
rounded-xl   // 12px
--radius: 0.625rem; // 10px (default)
```

## File-based Data Strategy (Command Center Pattern)

For stable data that shouldn't be affected by live feed noise:

### Backend
```python
# Use ingest_method filter
rounds = store.get_rounds(
    source, 
    limit, 
    offset, 
    order, 
    ingest_method="file"
)

analysis = store.analysis_payload(
    source, 
    limit, 
    ingest_method="file"
)
```

### Frontend
```tsx
// Use file-based rounds
const fileRoundsQuery = useQuery({
  queryKey: ["page-rounds", source],
  queryFn: () => api.rounds(source, 80, 0, "desc", "file"),
  refetchInterval: POLL.rounds,
  staleTime: 1500,
});

// Use file-based analysis
const fileAnalysisQuery = useQuery({
  queryKey: ["page-analysis", source],
  queryFn: () => api.analysis(source, 600, "file"),
  refetchInterval: false, // Only update on WebSocket events
  staleTime: 30000,
});
```

### WebSocket Invalidation
```tsx
// Backend - broadcast after file ingest
hub.broadcast_threadsafe("ingest:scan", {"source": source})

// Frontend - invalidate queries on event
wsTransport.on("ingest:scan", () => {
  queryClient.invalidateQueries({ queryKey: ["page-rounds"] });
  queryClient.invalidateQueries({ queryKey: ["page-analysis"] });
});
```

## Format Utilities

**Location**: `web/src/lib/format.ts`

Use these formatters for consistent display:

```tsx
import { 
  multiplier, 
  percent, 
  decimal, 
  integer, 
  signed, 
  currency,
  relativeTime,
  duration 
} from "@/lib/format";

multiplier(2.45)      // "2.45x"
percent(0.65)        // "65%"
decimal(0.1234)      // "0.12"
integer(1234)        // "1,234"
signed(0.5)          // "+0.50"
currency(-100)       // "−100.00"
relativeTime(now)    // "just now", "5m ago", etc.
duration(125)        // "2m 5s"
```

## Anti-Patterns

### Backend
❌ **Direct database access in analysis functions**
```python
# WRONG
def analyze(rounds):
    db.query("SELECT ...")  # No!
```

✅ **Pure functions only**
```python
# CORRECT
def analyze(rounds):
    return calculate(rounds)  # Pure calculation
```

❌ **SQL injection risk**
```python
# WRONG
db.query(f"SELECT * WHERE source = '{source}'")
```

✅ **Parameterized queries**
```python
# CORRECT
db.query("SELECT * WHERE source = ?", (source,))
```

❌ **Missing type hints**
```python
# WRONG
def get_data(source, limit):
    ...
```

✅ **Always use type hints**
```python
# CORRECT
def get_data(source: str, limit: int) -> Dict[str, Any]:
    ...
```

### Frontend
❌ **Inconsistent spacing**
```tsx
// WRONG
<div className="gap-1 space-y-5 p-2">
```

✅ **Use consistent spacing scale**
```tsx
// CORRECT
<div className="gap-2 space-y-4 p-4">
```

❌ **Hardcoded colors**
```tsx
// WRONG
<div className="text-green-500">
```

✅ **Use semantic colors**
```tsx
// CORRECT
<div className="text-signal">
```

❌ **Not using PlatformProvider**
```tsx
// WRONG
const [source, setSource] = useState("aviator");
```

✅ **Use shared state**
```tsx
// CORRECT
const { source, setSource } = usePlatform();
```

❌ **Missing tabular-nums for numbers**
```tsx
// WRONG
<p className="font-mono">{value}</p>
```

✅ **Always use tabular-nums**
```tsx
// CORRECT
<p className="font-mono tabular-nums">{value}</p>
```

## Example: Complete Feature Implementation

### Backend: New Analysis Function

```python
# backend/momento/analysis.py

def custom_metric(rounds: Sequence[Round], settings: AnalysisSettings) -> Dict[str, Any]:
    """Calculate custom metric from round history."""
    if not rounds:
        return {"value": 0, "count": 0}
    
    multipliers = [float(r["multiplier"]) for r in rounds]
    avg = sum(multipliers) / len(multipliers)
    
    return {
        "value": round(avg, 4),
        "count": len(rounds),
        "min": min(multipliers),
        "max": max(multipliers)
    }
```

### Backend: Store Function

```python
# backend/momento/store.py

def get_custom_metric(source: str, limit: int = 100) -> Dict[str, Any]:
    """Get custom metric for source."""
    source = normalize_source(source)
    limit = max(1, min(int(limit), 5000))
    
    rounds = history(source, limit)
    result = analysis.custom_metric(rounds, analysis_settings())
    
    return {
        "source": source,
        "limit": limit,
        "metric": result
    }
```

### Backend: API Route

```python
# backend/momento/api/routes/custom.py

from fastapi import APIRouter, Depends, Query
from ..deps import source_param
from ... import store

router = APIRouter()

@router.get("/custom-metric")
async def custom_metric(
    source: str = Depends(source_param),
    limit: int = Query(default=100, ge=1, le=1000),
):
    """Get custom metric."""
    return store.get_custom_metric(source, limit)
```

### Frontend: API Client

```typescript
// web/src/lib/api.ts

async function customMetric(source: string, limit: number = 100) {
  return request<{ metric: CustomMetric }>(
    `/custom-metric?source=${source}&limit=${limit}`
  );
}
```

### Frontend: Middleware Hook

```typescript
// web/src/lib/invent-middleware/custom.ts

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";

export function useCustomMetric(source: string, limit: number = 100) {
  return useQuery({
    queryKey: ["custom-metric", source, limit],
    queryFn: () => api.customMetric(source, limit),
    refetchInterval: POLL.analysis,
    staleTime: 1500,
  });
}
```

### Frontend: Page Component

```tsx
// web/src/pages/dashboard/CustomPage.tsx

import { AppShell } from "@/components/layout/AppShell";
import { Panel } from "@/components/console/Panel";
import { StatTile } from "@/components/console/StatTile";
import { usePlatform } from "@/state/PlatformProvider";
import { useCustomMetric } from "@/lib/invent-middleware/custom";
import { multiplier } from "@/lib/format";

export default function CustomPage() {
  const { source } = usePlatform();
  const metricQuery = useCustomMetric(source, 100);
  
  return (
    <AppShell title="Custom Metric" subtitle="Custom analysis">
      <div className="space-y-4">
        <StatTile
          label="Average"
          value={multiplier(metricQuery.data?.metric.value)}
          accent="signal"
        />
        <Panel title="Details" subtitle="Metric breakdown">
          {/* Content */}
        </Panel>
      </div>
    </AppShell>
  );
}
```

## Summary

**Key Principles**:
1. **Pure functions** for analysis logic
2. **Parameterized queries** for database access
3. **Semantic colors** for consistent meaning
4. **PlatformProvider** for shared state
5. **React Query** for data fetching
6. **shadcn/ui** for UI components
7. **TailwindCSS** for styling
8. **Type hints** for all functions
9. **Docstrings** for documentation
10. **Consistent spacing** using the scale

**File Locations**:
- Frontend pages: `web/src/pages/dashboard/`
- Frontend components: `web/src/components/`
- Backend analysis: `backend/momento/analysis.py`
- Backend store: `backend/momento/store.py`
- Backend routes: `backend/momento/api/routes/`
- Middleware: `web/src/lib/invent-middleware/`

**Always benchmark** against existing implementations like `CommandCenter.tsx` and `MegaPressureTracker.tsx` for patterns and conventions.
