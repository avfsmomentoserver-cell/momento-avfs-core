# `DEVIN_MEGA_PRESSURE_BLUEPRINT.md`

## Executive Directives for Devin

When instructed to build, extend, or optimize the Mega Pressure Tracker within the Momento Core ecosystem, you must adhere strictly to this blueprint. This document defines the exact mathematical models, architectural constraints, and strategic intelligence required to build a production-grade Mega Pressure Tracker.

As an autonomous AI engineer, you must anchor your development in the four foundational principles of Momento Core:

* **Observation Before Prediction**: Understand the present data state before generating forecasts.


* **Immutable Raw Events**: Never alter raw multiplier data; log any corrections independently.


* **Explainability Is Mandatory**: Ensure all generated ETA and range predictions carry detailed metadata explaining the calculation.


* **Local vs Production Independence**: Ensure the backend functions entirely on a local SQLite database (in WAL mode) before porting to any cloud infrastructure.



---

## I. Architectural Constraints & Pipeline

Mega Pressure Tracker must operate strictly as a downstream module within the established Momento Core pipeline: **Collector → Ingest API → Analysis → Forecast Engine → Database → Dashboard**.

**Integration Map:**

* **Data Ingestion Layer**: Connect to `/api/v1/rounds/all` (handling up to 100,000 rounds) and `/api/v1/sources` to fetch historical crash curves.


* **Semantic Layer**: Utilize `/api/v1/linguistics` to categorize raw multipliers into the eight-layer semantic vocabulary (e.g., Ignition, Moonshot, Mega, Cosmic).


* **Analytics Middleware**: Build `megaPressure.ts` strictly isolated from the main system, passing structured data to the React UI via the middleware pattern.


* **Forecast Registration**: The forecast engine must submit all ETA and probability predictions to `/api/v1/forecasts` **before** the actual round lands to comply with the platform's honest accuracy scoring methodology.



---

## II. The Pressure Calculation Engine

The Mega Pressure Tracker relies on a multivariate metric $P(t)$ mapped to a 0.0 to 1.0 scale.

$$P(t) = w_E E(t) + w_S S(t) + w_M M(t) + w_D D(t)$$

* $E(t)$ is **Energy Buildup**: Cumulative sum of recent multipliers relative to the historical average energy between Mega events.
* $S(t)$ is **Shape Consistency**: Pattern recurrence matched against the Intelligence Engine Chain (Pattern → DNA → Similarity).


* $M(t)$ is **Band Momentum**: Velocity of transition across semantic bands (e.g., frequency of Moonshots leading up to a Mega).
* $D(t)$ is **Time Decay**: Pressure decay or inflation adjusted for the time elapsed since the last Mega.
* $w_i$ represents dynamic variables tied to live weight management via the Plugin Inventory.



---

## III. ETA Forecasting & Survival Analysis

Do not rely purely on simple averages. Implement a Kaplan-Meier estimator or Weibull distribution to calculate the hazard rate $h(t)$ of a Mega event occurring at round $t$, given it has not yet occurred:

$$h(t) = \frac{f(t)}{1 - F(t)}$$

Combine this hazard rate with current pressure $P(t)$ to generate an adjusted Expected Time of Arrival (ETA). Provide statistical confidence bands based on the standard error:

$$CI = \mu_{ETA} \pm Z \left( \frac{\sigma}{\sqrt{n}} \right)$$

---

## IV. Semantic Layer Optimization & Probability Weighting

When calculating probability distribution bounds and hazard rate $h(t)$, strictly enforce the following prioritization across the MomentoLinguistics vocabulary.

**The Core Target: Moonshot & Mega Bands**

* **Moonshot (20x–50x)**: Treat as the primary momentum indicator. A dense cluster dictates high Band Momentum $M(t)$.
* **Mega (50x–100x)**: The focal point for all Expected Value (EV) calculations and ETA predictions. Target profit multipliers in Chase Strategies must anchor here.

**The Variance Tail: Cosmic & Galactic Bands**

* **Cosmic (100x–500x) & Galactic (500x+)**: Treat strictly as long-tail variance. Do not allow the Chase Strategy engine to set a profit target in these bands unless explicitly overridden by a user.

**Algorithmic Weight Distribution Table**
When configuring the probability density function (PDF), apply these baseline mass distribution constraints:

| Semantic Band | Multiplier Range | Probability Mass | Strategic Function |
| --- | --- | --- | --- |
| **Ignition** | 10x – 20x | 0.05 | Noise / Early pressure buildup |
| **Moonshot** | 20x – 50x | 0.35 | Immediate precursor / Momentum gauge |
| **Mega** | 50x – 100x | 0.55 | Primary Prediction Target |
| **Cosmic** | 100x – 500x | 0.04 | Outlier edge-case |
| **Galactic** | 500x+ | 0.01 | Statistical anomaly |

---

## V. Deep DNA Similarity & Rare-Event Pattern Matching

When a user specifies an extreme target multiplier (e.g., $T = 2000$), dynamically shift to **Targeted DNA Similarity Matching**.

**1. Dynamic Boundary Definition**

* **Target ($T$)**: User-defined goal (e.g., 2000).
* **Variance Window ($\Delta$)**: Dynamically set to 50% of the target (e.g., $\pm$ 1000).
* **Query Range**: Retrieve historical rounds where $T - \Delta \le \text{Multiplier} \le T + \Delta$.

**2. State Vector Extraction (The "DNA" Signature)**
For every historical event $i$ in the query range, extract a historical state vector $V_i$ representing the $N$ preceding rounds. The real-time data ingestion feed generates current state vector $V_{current}$.

$$V = [D_b, \Sigma M, L_c, P_{ceiling}]$$

* $D_b$ (**Band Distribution**): Frequency of MomentoLinguistics semantic tokens.


* $\Sigma M$ (**Multiplier Sum**): Total accumulated raw multiplier energy.
* $L_c$ (**Ladder Count**): Integer count of detected ladder structures.


* $P_{ceiling}$ (**Accumulated Ceiling Pressure**): Count of failed breakouts (rounds entering the Mega band but crashing before Cosmic/Galactic bands).

**3. Similarity Calculation Algorithm**
Implement Cosine Similarity to compare $V_{current}$ against historical $V_i$ vectors.

$$\text{Similarity}(V_{current}, V_i) = \frac{V_{current} \cdot V_i}{\Vert{}V_{current}\Vert{} \Vert{}V_i\Vert{}} = \frac{\sum_{k=1}^{n} A_k B_k}{\sqrt{\sum_{k=1}^{n} A_k^2} \sqrt{\sum_{k=1}^{n} B_k^2}}$$

Any historical event $i$ where $\text{Similarity} \ge 0.85$ is classified as a DNA Match.

**4. ETA Synthesis & Compute Isolation**
Calculate the average gap from the moment a historical vector reached a 0.85 score to the actual event occurrence. Vector math is computationally heavy; ensure calculations are memoized in React Query or executed on the Python backend using NumPy.

---

## VI. Bankroll & Chase Strategy Intelligence

* **The 1% Bankroll Rule**: Hardcode conservative logic where base bets never exceed 1% of total capital.
* **Geometric Bet Progression**: For aggressive recovery, implement multiplier growth rate $r$:

$$b_k = b_1 \cdot r^{k-1}$$


* **Expected Value (EV) Guardrails**: Every sequence must calculate its EV to derive stop-loss parameters:

$$EV = (P_{win} \cdot \text{Target Multiplier}) - (P_{loss} \cdot \text{Cumulative Wager})$$



---

## VII. Code Implementation Specifications

**Backend Extensions (Python / FastAPI)**
Use Python 3, FastAPI, async/await for I/O operations, PEP 8 formatting, explicit type hints, and Google-style docstrings.

```python
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/v1/mega-pressure", tags=["pressure"])

class PressureMetrics(BaseModel):
    current_pressure: float
    avg_mega_gap: float
    energy_buildup: float
    time_decay: float
    confidence_score: float

@router.get("/metrics", response_model=PressureMetrics)
async def get_pressure_metrics(source: str, limit: int = 1000) -> PressureMetrics:
    """
    Computes real-time pressure metrics using the weighted algorithm.
    """
    # Devin: Implement DB fetch via SQLAlchemy ORM (SQLite WAL mode)[cite: 1]
    # Map raw events through MomentoLinguistics vocabulary
    pass

```

**Frontend Middleware (React / TypeScript)**
Write functional components with strict TypeScript definitions and hooks; use JSDoc; strictly avoid `any` types.

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Interface representing the output of the ETA Hazard Model.
 */
export interface ETAPrediction {
    rounds_eta: number;
    time_eta_minutes: number;
    confidence_50: { min: number; max: number };
    confidence_95: { min: number; max: number };
}

/**
 * Fetches the pressure-adjusted ETA forecast.
 * @param source The active data source identifier.
 */
export function useETAPrediction(source: string) {
    return useQuery<ETAPrediction>({
        queryKey: ['etaPrediction', source],
        queryFn: () => api.get(`/api/v1/mega-pressure/eta?source=${source}`),
        refetchInterval: 10000, 
        staleTime: 10000,
    });
}

```

---

## VIII. Honest Accuracy & System Validation

* **Strict Forward-Testing**: The Forecast Engine must log its $P(t)$ triggers and ETA predictions into the SQLite database before the crash curve resolves.


* **Brier Scoring**: Validate probabilistic accuracy utilizing a standard Brier Score:



$$BS = \frac{1}{N} \sum_{t=1}^{N} (f_t - o_t)^2$$


* **Local Replay Mode**: Build a script utilizing the `backend/data/inbox/` file watcher to stream historical data, verifying WebSocket `/ws` updates.



---

## IX. Devin Task Execution Roadmap

1. **Environment Sync**: Run `python3 run_api.py --init-only` to instantiate the SQLite database.


2. **Endpoint Scaffolding**: Build the FastAPI router for `/api/v1/mega-pressure`.
3. **Middleware Construction**: Develop `web/src/lib/invent-middleware/megaPressure.ts` with strict React Query caching rules.


4. **UI Development**: Construct `MegaPressureTracker.tsx` utilizing TailwindCSS and Recharts.


5. **Quality Gates**: Execute `bun run lint` and `python3 -m compileall -q momento run_api.py` to validate syntactical perfection.