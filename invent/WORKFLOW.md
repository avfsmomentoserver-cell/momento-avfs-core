# Invention Workflow - Strict Autonomous Process

## Purpose
This workflow governs the autonomous invention system (megaX) for creating robust, unique inventions that integrate with the Momento Core platform without modifying the main system.

## Activation Trigger
When user provides invention prompt (e.g., "megaX tracker"), AI assumes full autonomous control and executes this workflow without interruption until completion.

## Core Principles

### 1. Strict Isolation
- **NO modifications to main system** except menu link and route addition
- All data access through read-only API endpoints
- Separate processing pipeline with middleware processors
- Independent state management
- Clean architectural boundaries

### 2. Complete Autonomy
- AI makes all design decisions
- AI implements all components
- AI handles all edge cases
- AI creates all documentation
- AI presents final working product

### 3. Quality Standards
- Must be unique (not found in main system)
- Must be robust (handles edge cases)
- Must be useful (provides genuine value)
- Must be impressive (exceeds expectations)
- Must be complete (end-to-end working)

## Workflow Steps

### Phase 1: Analysis & Design (Autonomous)
1. **Analyze Platform Capabilities**
   - Read main system API endpoints
   - Understand data structures
   - Identify available data streams
   - Note existing features to avoid duplication

2. **Design Unique Invention**
   - Concept novel features based on platform data
   - Define value proposition
   - Plan middleware architecture
   - Design UI/UX approach
   - Create technical specification

### Phase 2: Middleware Framework (Autonomous)
3. **Create Middleware Processor Framework**
   - Build data ingester (API client)
   - Build transform processor (data normalization)
   - Build analysis engine (custom logic)
   - Build state manager (local state)
   - Build UI adapter (React integration)

4. **Implement Data Pipeline**
   - Connect to main system API (read-only)
   - Implement WebSocket listeners
   - Create data transformation layer
   - Build local caching mechanism
   - Add error handling and retry logic

### Phase 3: UI Implementation (Autonomous)
5. **Build User Interface**
   - Create React components (TypeScript)
   - Use shadcn/ui + TailwindCSS
   - Implement responsive design
   - Add real-time updates via WebSocket
   - Create interactive visualizations

6. **Integrate with Main System**
   - Add route to App.tsx
   - Add menu link to sidebar
   - Ensure proper authentication flow
   - Test navigation and access

### Phase 4: Documentation & Delivery (Autonomous)
7. **Document Everything**
   - Create technical documentation
   - Document middleware architecture
   - Document API integrations
   - Document features and usage
   - Create README

8. **Present Final Product**
   - Verify end-to-end functionality
   - Test all features
   - Demonstrate unique capabilities
   - Provide access instructions

## Allowed Modifications

### ✅ PERMITTED
- Add menu link in sidebar component
- Add route in App.tsx
- Create files in `/invent/` folder
- Create middleware processors
- Create UI components
- Create documentation

### ❌ FORBIDDEN
- Modify main system backend code
- Modify main system database schema
- Modify existing API endpoints
- Modify existing dashboard pages
- Direct database access
- Modify core platform logic

## Middleware Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    INVENTION SYSTEM                          │
│  (Isolated from Main System - Read-Only API Access)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATA INGESTER                              │
│  - API Client (fetch from main system)                       │
│  - WebSocket Listener (real-time events)                     │
│  - Rate Limiting & Retry Logic                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 TRANSFORM PROCESSOR                          │
│  - Data Normalization                                        │
│  - Schema Validation                                        │
│  - Type Conversion                                           │
│  - Enrichment & Aggregation                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   ANALYSIS ENGINE                            │
│  - Custom Business Logic                                     │
│  - Pattern Recognition                                       │
│  - Calculations & Metrics                                    │
│  - Prediction/Forecasting                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    STATE MANAGER                             │
│  - Local State Storage                                       │
│  - React Query Integration                                  │
│  - Cache Management                                          │
│  - State Synchronization                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     UI ADAPTER                               │
│  - React Components                                          │
│  - Data Visualization                                        │
│  - User Interaction                                          │
│  - Real-time Updates                                         │
└─────────────────────────────────────────────────────────────┘
```

## Data Access Rules

### API Access (Read-Only)
```typescript
// Allowed: Fetch data from main system
const rounds = await fetch('http://localhost:8000/api/v1/rounds?source=aviator');
const analysis = await fetch('http://localhost:8000/api/v1/analysis?source=aviator');

// Forbidden: Direct database access
// const rounds = db.query('SELECT * FROM rounds'); // ❌ NOT ALLOWED
```

### WebSocket Access (Listen-Only)
```typescript
// Allowed: Listen to events
ws.on('round:new', (data) => { /* process data */ });
ws.on('analysis:update', (data) => { /* process data */ });

// Forbidden: Send commands to main system
// ws.emit('command', { action: 'modify' }); // ❌ NOT ALLOWED
```

## Success Criteria

Invention is complete when:
- ✅ All features work end-to-end
- ✅ Unique features not found in main system
- ✅ Robust error handling
- ✅ Provides genuine user value
- ✅ Exceeds expectations
- ✅ Complete documentation
- ✅ Accessible via main system menu
- ✅ No main system modifications (except menu/route)

## Emergency Override

If invention cannot be completed autonomously:
1. Document blocker
2. Propose solution options
3. Request user decision
4. Continue with alternative approach

## Version History
- v1.0.0 - Initial workflow definition
