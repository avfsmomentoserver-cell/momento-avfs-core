# Adding New Pages to Momento Core

This guide explains how to add new pages to the Momento Core dashboard application.

## Prerequisites

- Familiarity with React and TypeScript
- Understanding of the existing component structure
- Access to the codebase

## Page Types

Momento Core has three main page categories:

1. **Public Pages** - Landing, marketing (rarely modified)
2. **Auth Pages** - Login, Register (`web/src/pages/auth/`)
3. **Dashboard Pages** - Operator console (`web/src/pages/dashboard/`)

This guide focuses on Dashboard Pages.

## Step-by-Step Guide

### Step 1: Create the Page Component

Create a new file in `web/src/pages/dashboard/`:

```typescript
// web/src/pages/dashboard/YourPage.tsx
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { Panel } from "@/components/console/Panel";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { usePlatform } from "@/state/PlatformProvider";

/**
 * YourPage: Brief description of what this page does.
 */
export default function YourPage() {
  const { source, analysis, rounds } = usePlatform();
  const [localState, setLocalState] = useState<string>("");

  // Fetch data using React Query
  const dataQuery = useQuery({
    queryKey: ["your-data", source],
    queryFn: () => api.yourEndpoint(source),
    refetchInterval: POLL.slow,
    staleTime: 10000,
  });

  return (
    <AppShell title="Your Page Title" subtitle="Optional subtitle">
      <div className="space-y-4">
        {/* Your page content */}
        <Panel title="Panel Title" subtitle="Optional subtitle">
          <p>Your content here</p>
        </Panel>
      </div>
    </AppShell>
  );
}
```

### Step 2: Add the Route

Update `web/src/App.tsx` to add the route:

```typescript
import YourPage from "@/pages/dashboard/YourPage";

// In the Routes component, add:
<Route path="/dashboard/your-page" element={<YourPage />} />
```

### Step 3: Add Navigation Link

Update the Sidebar component to add a navigation link:

```typescript
// web/src/components/layout/Sidebar.tsx
// Add to the dashboard links section:
<Link to="/dashboard/your-page" className={cn(/* existing classes */)}>
  <YourIcon className="h-4 w-4" />
  Your Page
</Link>
```

### Step 4: Add API Endpoints (if needed)

If your page needs new backend endpoints:

1. Create or update a route file in `backend/momento/api/routes/`:

```python
# backend/momento/api/routes/your_feature.py
from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, Optional

from ..deps import source_param
from ... import store

router = APIRouter(prefix="/your-feature", tags=["your-feature"])

@router.get("/data")
async def get_your_data(
    source: str = Depends(source_param),
    limit: int = Query(default=100, ge=1, le=1000),
) -> Dict[str, Any]:
    """Get your feature data."""
    return store.get_your_data(source, limit)
```

2. Register the router in `backend/momento/api/app.py`:

```python
from .routes import your_feature

app.include_router(your_feature.router)
```

3. Add API client functions in `web/src/lib/api.ts`:

```typescript
export const api = {
  // ... existing functions
  yourData: (source: string, limit?: number) =>
    request<{ data: YourDataType }>(
      `/your-feature/data${qs({ source, limit })}`
    ),
};
```

### Step 5: Add Type Definitions (if needed)

Update `web/src/lib/types.ts` with any new types:

```typescript
export interface YourDataType {
  id: number;
  value: string;
  // ... other fields
}
```

## Common Patterns

### Using Platform Context

Most dashboard pages use the PlatformProvider for shared data:

```typescript
const { source, analysis, rounds, flashRoundId, setSource } = usePlatform();
```

Available from PlatformContext:
- `source` - Currently selected source
- `setSource` - Function to change source
- `analysis` - Current analysis payload
- `rounds` - Round buffer (newest first)
- `flashRoundId` - ID of round that just arrived (for animation)
- `feed` - Feed status
- `connected` - WebSocket connection status
- `isLive` - Whether data is live
- `loading` - Loading state
- `error` - Error message
- `refreshAll` - Function to refresh all queries

### Data Fetching with React Query

Use React Query for data fetching:

```typescript
const query = useQuery({
  queryKey: ["unique-key", source, otherParams],
  queryFn: () => api.yourEndpoint(source, otherParams),
  refetchInterval: POLL.slow, // or POLL.analysis, POLL.rounds
  staleTime: 1500,
});

// Access data
const data = query.data;
const isLoading = query.isLoading;
const error = query.error;
```

### Using File-Based Rounds (Command Center Pattern)

For pages that should use file-based rounds only:

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

### Using Panels

Use the Panel component for consistent layout:

```typescript
<Panel
  title="Panel Title"
  subtitle="Optional subtitle"
  icon={<YourIcon className="h-3.5 w-3.5" />}
  actions={<Button>Action Button</Button>}
  lit // Optional: adds highlight styling
>
  {/* Panel content */}
</Panel>
```

### Using StatTiles

Use StatTile for metrics:

```typescript
<StatTile
  label="Metric Name"
  value={formatValue(data.value)}
  accent="signal" // or "info", "caution", "critical"
  progress={data.percentage}
  hint="Optional tooltip text"
  emphasis // Optional: makes it larger
/>
```

### Mutations

For actions that modify data:

```typescript
const mutation = useMutation({
  mutationFn: (params) => api.yourMutation(params),
  onSuccess: (result) => {
    toast.success("Success message");
    queryClient.invalidateQueries();
  },
  onError: (error: Error) => {
    toast.error("Error message", { description: error.message });
  },
});

// Use it
<Button onClick={() => mutation.mutate(params)}>
  Submit
</Button>
```

## Styling Guidelines

- Use Tailwind CSS classes
- Follow existing color scheme (signal, caution, critical, info)
- Use `cn()` utility for conditional classes
- Maintain consistent spacing (space-y-4, gap-4)
- Use existing components from shadcn/ui

## Common Components

- `AppShell` - Page layout wrapper
- `Panel` - Content container with header
- `StatTile` - Metric display
- `Button` - Action buttons
- `Input` - Form inputs
- `Label` - Form labels
- `EmptyState` - Empty data display
- `StateBadge` - State indicator
- `RoundsFeed` - Round list display

## Testing Your Page

1. Start the backend: `cd backend && python3 run_api.py`
2. Start the frontend: `cd web && npm run dev` (or bun)
3. Navigate to your page
4. Test with different sources
5. Test error states
6. Test with empty data

## Common Pitfalls

- **Forgot to add route**: Page won't be accessible
- **Forgot to add navigation link**: No way to reach the page
- **Not using PlatformProvider**: Missing shared data
- **Not handling loading states**: When data is loading
- **Not handling error states**: When API fails
- **Hardcoding source**: Should use PlatformContext source
- **Not invalidating queries**: Data won't refresh after mutations

## Examples

See existing pages for reference:
- `CommandCenter.tsx` - Complex dashboard with multiple panels
- `Settings.tsx` - Form-based configuration
- `RoundTesting.tsx` - Interactive testing interface
- `Ingest.tsx` - File upload and manual input
