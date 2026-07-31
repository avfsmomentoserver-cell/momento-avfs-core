---
description: New feature workflow for adding capabilities to the platform
---

# New Feature Workflow

## Research Pipeline

Every feature must follow this research-first pipeline:

```
Feature Idea
      │
      ▼
Literature Research
      │
      ▼
Mathematical Foundation
      │
      ▼
Historical Backtest
      │
      ▼
Statistical Validation
      │
      ▼
Implementation
      │
      ▼
Regression Testing
      │
      ▼
Deployment
```

## Stage 1: Research

Investigate:
- Statistical methods
- Academic papers
- Industrial approaches
- Forecasting techniques
- Similar implementations
- Probabilistic models
- Uncertainty estimation
- Calibration methods
- Production architectures

Distinguish between:
- Validated approaches
- Experimental approaches
- Hypotheses
- Unknown methods

Never mix them.

## Stage 2: Feature Engineering

Identify:
- Input variables
- Derived variables
- Hidden variables
- Temporal variables
- Rolling variables
- Window features
- Momentum
- Entropy
- Volatility
- Pressure
- Density
- Frequency
- Clusters
- Distance metrics
- Recovery metrics
- DNA fingerprints
- Transition probabilities
- Sequence embeddings
- Regime indicators
- State transitions

Explain why each feature may contain predictive information.

## Stage 3: Mathematical Model

For every calculation explain:
- Formula
- Variables
- Expected behavior
- Assumptions
- Failure modes
- Sensitivity
- Edge cases
- Confidence estimation

## Stage 4: Historical Validation

Never assume a model works. Run historical testing.

Calculate:
- Precision
- Recall
- F1
- ROC
- Brier Score
- Log Loss
- Calibration
- Prediction Interval Coverage
- MAE
- RMSE
- MAPE
- False positives
- False negatives
- Expected value
- Profit factor (only if applicable)

If the feature cannot outperform baseline, reject it.

## Stage 5: Architecture

Design:
- Interfaces
- Middleware
- Caching
- API
- Database
- Background workers
- Streaming
- Testing
- Monitoring
- Versioning
- Rollback

## Stage 6: Implementation

Only after validation.

## Required Documentation Sections

Every feature proposal must contain:

1. **Problem Definition**
2. **Research Summary**
3. **Mathematical Basis**
4. **Feature Engineering**
5. **Data Requirements**
6. **Algorithms Considered** (Compare: Markov, HMM, Bayesian, Gradient Boosting, Random Forest, XGBoost, LightGBM, CatBoost, Transformers, LSTM, Temporal CNN, Gaussian Processes, Survival Models, Extreme Value Theory, Anomaly Detection, Change Point Detection, Kalman Filters, State Space Models, Isolation Forest, Autoencoders)
7. **Backtesting Strategy** (Rolling windows, Walk-forward, Out-of-sample, Cross validation, Monte Carlo, Bootstrap, Drift testing, Calibration)
8. **Performance Metrics** (Observed calibration, Prediction interval coverage, Reliability diagrams, Historical accuracy, Brier score)
9. **Implementation Plan** (Files, Interfaces, API, Database, Tests, Documentation)
10. **Future Improvements**

## Recommended Project Structure

For each new feature, create this structure:

```text
invent/
└── feature-name/
    ├── RESEARCH.md              # Literature review & comparison
    ├── MATHEMATICS.md           # Equations and derivations
    ├── FEATURE_ENGINEERING.md   # Inputs and derived features
    ├── ARCHITECTURE.md          # Design and middleware
    ├── IMPLEMENTATION.md        # Coding plan
    ├── VALIDATION.md            # Backtest results
    ├── BENCHMARK.md             # Baseline vs new model
    ├── LIMITATIONS.md           # Known weaknesses
    ├── ROADMAP.md               # Future improvements
    ├── TESTS.md                 # Testing strategy
    └── src/
```

## Self Review

Before finishing, ask:
- Can this overfit?
- Can this leak future information?
- Is this statistically significant?
- What assumptions exist?
- Can uncertainty be quantified?
- Can calibration improve this?
- Does historical testing support it?
- Is a simpler model equally effective?

## Expected Outputs
Approved feature that fits Core or lives as an extension, backed by research and validation.

## Coordinated By
Project Administrator (ag_admin)

## Architecture Review
Requires System Architect (ag_arch) review for major features.

## Core vs Extension
Features should either:
- Fit into the Core platform (kernel, contracts, runtime)
- Live as an independent extension

## Special Note for Crash-Game Forecasting

For systems that forecast outcomes from crash-game round histories, no amount of research or AI configuration can guarantee accurate prediction of future outcomes if the underlying game is genuinely random and independent. Treat any forecasting capability as a hypothesis to be tested empirically, report calibrated probabilities and uncertainty, and reject models that fail out-of-sample validation rather than assuming predictive power.
