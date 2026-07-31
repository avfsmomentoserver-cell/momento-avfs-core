# Coding Standards

This document defines the coding standards for the Momento Core Platform project, adapted from the MDOS workspace configuration and project principles.

## Technology Stack

- **Backend**: FastAPI, SQLAlchemy, SQLite
- **Frontend**: React, TypeScript, Vite
- **Collection**: Playwright
- **Testing**: Unit, integration, replay, historical, live validation
- **Documentation**: Markdown with structured knowledge base

## Core Principles

### 1. Observation Before Prediction
- Understand the present before reasoning about the future
- Prediction without understanding is speculation
- All intelligence begins with observation

### 2. Immutable Raw Events
- Raw data is never edited
- Corrections are recorded separately
- Enables replay, auditing, calibration, learning

### 3. Explainability Is Mandatory
- Every prediction must have explanation metadata
- State inputs used, patterns detected, reasoning, confidence, uncertainty drivers
- Trust and learning require transparency

### 4. Local vs Production Independence
- SQLite/local dev must always work when cloud support is added
- Never remove local functionality when adding production support
- Keep environments independent

## Code Style

### Python (FastAPI)
- Use Google-style docstrings
- Type hints required for all function signatures
- Async/await for I/O operations
- Follow PEP 8 formatting
- Use explicit imports at the top of files
- Pure analysis functions (no I/O) in analysis.py for testability
- Normalize source using `normalize_source()` in store functions
- Use parameterized queries (no SQL injection)
- Return structured dicts with metadata

### TypeScript (React)
- Use JSDoc for documentation
- Strict TypeScript configuration
- Functional components with hooks
- Explicit interface definitions
- No `any` types without justification
- Use `usePlatform()` hook for shared data (source, analysis, rounds)
- Use React Query for data fetching with proper query keys
- Use `AppShell` wrapper for page layout
- Use `Panel` components for content organization
- Follow file-based data strategy (Command Center pattern) for stability

### Database
- Use SQLAlchemy ORM with explicit models
- Migration files for all schema changes
- Never edit historical truth
- Indexing strategy documented

## Architecture Standards

### Module Boundaries
- Collector → Backend API → Analysis → Forecast Engine → Database → Dashboard
- Each module has single responsibility
- Clear contracts between modules
- Independent testing per module

### The Momento Kernel
- Round Event Model
- Database Layer
- Schema Contracts
- Runtime
- Event Bus
- API Contracts
- Engine Registry

### Intelligence Engine Chain
- Pattern → DNA → Similarity → Probability → Confidence → Forecast
- Each engine replaceable with clear contracts
- Independently tested
- Measurable outputs

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

## Entry Point System

### Default Agent
- Project Administrator (ag_admin) coordinates all interactions
- Skills-first approach
- Automatic delegation to specialists

### Fallback Hierarchy
1. Skills
2. Project Admin Agent
3. Specialist Agents
4. General Purpose

### Mode Selection
- **Low-credit efficient**: "efficient", "low credit", "budget", "light"
- **Full power**: "full power", "deep", "full control", "thorough"

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
