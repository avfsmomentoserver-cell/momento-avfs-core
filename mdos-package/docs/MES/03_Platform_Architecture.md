# Platform Architecture

| Field | Value |
|---|---|
| Document | 03_Platform_Architecture |
| Version | 2.0 |
| Status | Draft |

## Module Pipeline

    Collector -> Backend API -> Analysis -> Forecast Engine -> Database -> Dashboard

Each module has a single responsibility.

## The Momento Kernel (Phase 1 — Protect the Kernel)

    Round Event Model | Database Layer | Schema Contracts | Runtime
    Event Bus | API Contracts | Engine Registry

## Collection Architecture (Phase 2)

    Browser Collector | WebSocket Collector | CSV Import Collector
        -> Normalizer -> Event Bus -> Core Database

## Intelligence Layer (Phase 3)

    Pattern Engine -> DNA Engine -> Similarity Engine
        -> Probability Engine -> Confidence Engine -> Forecast Engine

Each engine has clear contracts, is independently tested, replaceable, and
produces measurable outputs.

## Platform Applications (Phase 4)

- **Admin Platform** — live monitoring, collector status, engine health, calibration, data explorer.
- **Consumer Application** — auth, subscription, forecast display, confidence indicators, history.

## Local vs Production

- Local: SQLite, local API, local dashboard — fast development.
- Production: Vercel, Render, Supabase, cloud collector.
- Never remove local functionality when adding production support.
