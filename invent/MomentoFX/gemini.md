Building a robust, professional-grade `MomentoFX` platform on top of the Momento Core architecture requires strict adherence to system boundaries, clean design principles, and a perfectly tuned autonomous coding environment. Since the current implementation feels less than ideal, we need to focus on stripping away the noise, adhering to a strict middleware pattern, and configuring Devin to execute tasks with high precision.

Here is your comprehensive **Implementation Guide, Developer Standards, and Devin AI IDE Configuration** to bridge the gap between traditional forex trading and crash games.

---

## I. Devin AI IDE Configuration

To get Devin performing optimally, you must configure its virtual machine environment so it acts as an extension of the Momento Core philosophy. Treat Devin like a senior engineer: provide explicit environments, strict boundaries, and clear verification steps.

### Environment & Setup Steps

Set up Devin’s classic configuration (or declarative blueprint) with these exact parameters:

| Step | Configuration / Command | Purpose |
| --- | --- | --- |
| **1. Git Pull** | Default | Ensures Devin always starts sessions with the latest commits. |
| **2. Configure Secrets** | `MOMENTO_API_PORT=8000`<br><br>

<br>`MOMENTO_DATABASE_PATH=backend/data/momento.db`<br><br>

<br>`MOMENTO_SECRET_KEY=[your_secret]`<br><br>

<br>`VITE_API_BASE_URL=http://localhost:8000`<br><br>

<br>`VITE_WS_URL=ws://localhost:8000/ws`<br> | Injects the required environment variables for both the Python FastAPI backend and the React frontend without hardcoding them.

 |
| **3. Install Dependencies** | Backend: `pip install -r requirements.txt`<br>

<br>Frontend: `cd web && bun install`<br> | Primes the VM with all required Python and Node modules. |
| **4. Maintain Dependencies** | `cd web && bun install`<br> | Runs on startup in case new packages were merged. |
| **5. Linting** | `cd web && bun run lint`<br> | Ensures TypeScript strictness and enforces code quality before Devin commits.

 |
| **6. Testing** | `cd web && bun run test` | Instructs Devin to run unit tests (e.g., verifying `MomentoFX Middleware` calculations).

 |
| **7. Run Local App** | Backend: `python3 run_api.py --reload`<br><br>

<br>Frontend: `cd web && bun run dev`<br> | Spins up the local development servers for testing browser implementations and API responses.

 |

---

## II. Prompting Standards for Devin (The "Work Order" System)

When tasking Devin to build or refactor `MomentoFX` components, do not use conversational, open-ended prompts. Use strict **Work Orders** that define the context, constraints, and exact acceptance criteria.

### 1. Goal & Context

Start every prompt by reiterating the Momento Core philosophy:

* **Observation Before Prediction**: The system must understand the present before reasoning about the future.


* **Immutable Raw Events**: Raw data is never edited; corrections are recorded separately.


* **Explainability Is Mandatory**: Every prediction and pattern detection must have explanation metadata.



### 2. Design & Visual Standards ("The Art of the Chart")

Instruct Devin to apply modern, clean data visualization principles:

* **Simplicity over Decoration**: Strip away excessive padding, 3D effects, and drop shadows. If an element doesn't answer a specific trading question, remove it.
* **Meaningful Colors**: Use visual hierarchies consciously (e.g., red for risk/bearish, green for bullish).
* **Headless Panels**: Use rounded-corner containers for `IndicatorOverlay.tsx` and `DrawingToolbar.tsx` to maintain a clean UI.


* **Auto Narrative Context**: When displaying patterns or indicators, leverage the Momento Linguistics API to render natural-language insights (e.g., summarizing a sequence as a "mini moonshot" rather than just a raw multiplier).



### 3. Scope Boundaries & Non-Goals

Explicitly tell Devin what **not** to touch to prevent it from breaking the Core platform:

* **DO NOT** modify the core data pipeline (`Collector → Ingest API → Analysis → Forecast Engine → Database → Dashboard`).


* **DO NOT** mutate data from the platform's robust data ingestion infrastructure.


* **DO** strictly confine MomentoFX logic to the Middleware Layer (`web/src/lib/invent-middleware/momentoFX.ts`).



---

## III. MomentoFX Implementation Guide

To fix the current "less than ideal" state, the implementation must be rigidly decoupled from the backend while acting as a high-performance analytical layer.

### 1. Middleware Architecture Strictness

MomentoFX must adhere to the data flow architecture: `Momento Core API → dataIngester → momentoFX Middleware → UI Components`.

* **Data Fetching**: Use React Query hooks (`useForexPairs`, `useLivePrices`, `useCandles`) to manage the state and refresh rates (e.g., 5s refresh for candles, 1s for live prices).


* **Linguistics Integration**: Route raw multiplier data through `/api/v1/linguistics` to convert it into semantic points and linguistic tokens for enhanced pattern detection.



### 2. Advanced Charting Components

Move away from basic charts and implement a professional suite using Recharts (or a library like Lightweight Charts) optimized for React 18:

* **`ForexCandleChart.tsx`**: Must support OHLC candle visualization, bullish/bearish color coding, interactive tooltips, and responsive design.


* **`TimeframeSelector.tsx`**: Ensure the aggregation API correctly handles timeframes by mapping them to round counts: 1m (1 round), 5m (5 rounds), 15m (15 rounds), 1h (60 rounds), 4h (240 rounds), 1D (1440 rounds).


* **`DrawingToolbar.tsx`**: Implement tools for trendlines, horizontal lines, Fibonacci retracements, and support/resistance zones. Ensure drawing data is managed in a standardized type interface (`DrawingTool`).



### 3. Technical Analysis & Pattern Detection

All heavy calculations must be memoized using React's `useMemo` to prevent UI blocking during re-renders.

* **Indicators**: Implement modular functions for RSI (14-period), MACD (12, 26, 9), Bollinger Bands (20, 2), Stochastic (14, 3, 3), and ATR (14-period).


* **Algorithmic Patterns**: Build detection for Double Top/Bottom, Triangles (Ascending, Descending, Symmetrical), and Flags (Bull/Bear).


* **Confidence Scoring Integration**: Pull the statistical confidence scores from the Momento Core Forecast Engine (which uses Markov chain analysis and DNA pattern matching) to validate the technical patterns.



### 4. Code Quality & Performance Optimization

* **Typing**: Enforce strict TypeScript interfaces for all data models (`RoundRecord`, `Candle`, `LinguisticsToken`). No `any` types without written justification.


* **Caching & Virtualization**: Configure stale times for React Query (e.g., `staleTime: 5000`) for optimal API load. Use libraries like `react-window` for virtualized scrolling if the dataset becomes too large.