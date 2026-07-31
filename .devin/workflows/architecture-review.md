---
description: Architecture review workflow for design decisions
---

# Architecture Review Workflow

## Context

The Momento Core Platform follows a modular pipeline architecture:
```
Collector → Ingest API → Analysis → Forecast Engine → Database → Dashboard
```

The architecture is built around:
- **The Momento Kernel**: Round Event Model, Database Layer, Schema Contracts, Runtime, Event Bus, API Contracts, Engine Registry
- **Intelligence Engine Chain**: Pattern → DNA → Similarity → Probability → Confidence → Forecast
- **Module Boundaries**: Each module has single responsibility with clear contracts

## Stages

### 1. Read Current Architecture
- Review existing architecture in `PROJECT_KNOWLEDGE.md`
- Examine current module boundaries and contracts
- Study the Momento Kernel components
- Review intelligence engine chain implementation
- Check existing ADRs in `docs/steps/`

### 2. Find Weaknesses
- Identify areas violating core principles (observation before prediction, immutable events, explainability)
- Find module boundary violations or unclear contracts
- Detect performance bottlenecks in the pipeline
- Identify missing or incomplete engine chain components
- Review local vs production independence compliance

### 3. Design Target Architecture
- Design the target state following core principles
- Define clear module boundaries and contracts
- Plan engine chain improvements
- Ensure local development independence
- Design for explainability and immutability

### 4. Create Architecture Decision Record (ADR)
Document the decision with:
- **Clear decision statement** - What is being decided
- **Rationale and context** - Why this decision is needed
- **Alternatives considered** - Other approaches evaluated
- **Consequences and impacts** - Positive and negative effects
- **Migration strategy** - How to move from current to target
- **Compliance checklist** - Core principles, module boundaries, engine chain

### 5. Migration Plan
- Define step-by-step migration path
- Identify atomic commits needed
- Plan testing strategy (unit, integration, replay, historical, live)
- Specify rollback procedures
- Document impact on existing contracts

## Expected Outputs
- Accepted ADR following the template
- Detailed migration plan with atomic steps
- Updated architecture documentation
- Test plan for validation

## Coordinated By
System Architect (ag_arch) with Project Administrator (ag_admin) coordination

## ADR Template

```markdown
# ADR-[number]: [Title]

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
[Background and problem statement]

## Decision
[Clear statement of the decision]

## Rationale
[Why this decision was made]

## Alternatives Considered
- [Alternative 1]: [Description and why rejected]
- [Alternative 2]: [Description and why rejected]

## Consequences
- **Positive**: [Benefits]
- **Negative**: [Drawbacks]
- **Risks**: [Potential issues]

## Migration Strategy
[Step-by-step migration plan]

## Compliance
- [x] Observation before prediction
- [x] Immutable raw events
- [x] Explainability mandatory
- [x] Local vs production independence
- [x] Clear module boundaries
- [x] Engine chain integrity
```

## Architecture Principles

### Core Principles
1. **Observation Before Prediction** - Understand the present before reasoning about the future
2. **Immutable Raw Events** - Raw data is never edited; corrections are recorded separately
3. **Explainability Is Mandatory** - Every prediction must have explanation metadata
4. **Local vs Production Independence** - SQLite/local dev must always work when cloud support is added

### Module Boundaries
- Collector → Backend API → Analysis → Forecast Engine → Database → Dashboard
- Each module has single responsibility
- Clear contracts between modules
- Independent testing per module

### Engine Chain Integrity
- Pattern → DNA → Similarity → Probability → Confidence → Forecast
- Each engine replaceable with clear contracts
- Independently tested
- Measurable outputs

## Entry Point Integration
All architecture decisions are entry-point aware and reference configuration files in `.devin/`.

## Related Documentation
- `PROJECT_KNOWLEDGE.md` - Complete architecture overview
- `CODING_STANDARDS.md` - Architecture standards
- `docs/steps/` - Implementation documentation
- `.devin/AGENTS.md` - Agent responsibilities
