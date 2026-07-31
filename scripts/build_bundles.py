#!/usr/bin/env python3
"""Generate step documentation and zipped source bundles into `downloads/`.

The Build Steps screen in the dashboard reads `downloads/manifest.json` and links
straight to these files, so every implementation step ships with:

  * `<ordinal>-<slug>.md`   the step document
  * `<ordinal>-<slug>.zip`  exactly the source files that step covers

plus `avfs-momento-core-complete.zip`, the whole platform in one archive.

Usage:
    python3 scripts/build_bundles.py
    python3 scripts/build_bundles.py --clean
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import zipfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, List

ROOT = Path(__file__).resolve().parent.parent
DOCS_STEPS = ROOT / "docs" / "steps"
DIST = ROOT / "downloads"

# Directories that must never end up inside a bundle.
EXCLUDE_DIRS = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    "dist",
    "build",
    ".vite",
    ".turbo",
    "data",
    "logs",
    "downloads",
    ".rork",
}
EXCLUDE_SUFFIXES = {".pyc", ".pyo", ".db", ".db-wal", ".db-shm", ".log", ".zip", ".rar"}


@dataclass
class Step:
    ordinal: int
    slug: str
    title: str
    summary: str
    doc: str
    sources: List[str] = field(default_factory=list)
    highlights: List[str] = field(default_factory=list)


STEPS: List[Step] = [
    Step(
        ordinal=1,
        slug="architecture-and-configuration",
        title="Platform Architecture & Configuration",
        summary=(
            "Module boundaries, the six-stage data pipeline and one environment-driven "
            "configuration surface that behaves identically on a laptop and on a Debian VM."
        ),
        doc="01-architecture-and-configuration.md",
        sources=["backend/momento/config.py", "backend/momento/__init__.py", "backend/requirements.txt", "backend/run_api.py"],
        highlights=[
            "Collector → Ingest → Analysis → Forecast → Database → Dashboard",
            "Every setting resolves from an environment variable with a safe default",
            "AnalysisSettings and RuntimeToggles persisted live in the settings table",
            "Launcher supports API, receiver-only and init-only modes",
        ],
    ),
    Step(
        ordinal=2,
        slug="database-and-persistence",
        title="Database & Persistence Layer",
        summary=(
            "SQLite in WAL mode with a thread-local connection pool, thirteen tables, "
            "payload normalisation and constraint-enforced deduplication."
        ),
        doc="02-database-and-persistence.md",
        sources=["backend/momento/db.py", "backend/momento/store.py"],
        highlights=[
            "WAL journaling so the watcher and API never block each other",
            "UNIQUE(source, timestamp, multiplier) makes every ingest path idempotent",
            "Band and point values denormalised on write for fast charting",
            "Accepts JSON, CSV and bare multiplier lists from any collector shape",
        ],
    ),
    Step(
        ordinal=3,
        slug="linguistics-layer",
        title="MomentoLinguistics Semantic Layer",
        summary=(
            "Eight layers turning raw multipliers into bands, energy, shape, state and a "
            "plain-language narrative shared by every engine and every screen."
        ),
        doc="03-linguistics-layer.md",
        sources=["backend/momento/linguistics.py"],
        highlights=[
            "Momento point scale: 100 + log2(m) * 30, so 1.02x and 250x are both legible",
            "Ten ordered bands with a single canonical colour palette",
            "Seven market states, each with tone, colour and meaning",
            "Survival distribution kept strictly separate from band density",
        ],
    ),
    Step(
        ordinal=4,
        slug="analysis-engine",
        title="Analysis Engine",
        summary=(
            "Pure, testable detectors for ladders, compression, shelves, bait and clustered "
            "resistance, plus streaks, cadence, regimes and a fitted operator edge."
        ),
        doc="04-analysis-engine.md",
        sources=["backend/momento/analysis.py"],
        highlights=[
            "No I/O anywhere — rounds in, dictionaries out",
            "House edge fitted from the crash survival law P(M>=x) = (1-h)/x",
            "Resistance zones clustered from local maxima in point space",
            "Refuses to estimate below the minimum sample size rather than printing noise",
        ],
    ),
    Step(
        ordinal=5,
        slug="forecast-engine",
        title="Forecast Engine",
        summary=(
            "Markov transitions, empirical percentiles and DNA analogue matching blended into "
            "one range, recorded before the round lands and scored against reality after."
        ),
        doc="05-forecast-engine.md",
        sources=["backend/momento/forecast.py"],
        highlights=[
            "Laplace-smoothed transition matrix over rolling state labels",
            "Confidence rewards estimator agreement, not raw magnitude",
            "Brier score and per-state accuracy from resolved forecasts only",
            "Calibration refits thresholds; backtest walks forward through real history",
        ],
    ),
    Step(
        ordinal=6,
        slug="ingest-and-live-engine",
        title="Ingest Pipeline & Provably-Fair Live Engine",
        summary=(
            "Four ingest paths funnelling through one normalising write path, plus an "
            "HMAC-SHA256 hash-chain round engine whose every output is verifiable."
        ),
        doc="06-ingest-and-live-engine.md",
        sources=["backend/momento/watcher.py", "backend/momento/feed.py", "backend/momento/api/routes/ingest.py"],
        highlights=[
            "Watcher skips files still being written and archives to processed/ or failed/",
            "Reverse SHA-256 seed chain committed before the session starts",
            "Terminal seed published on stop so any session can be replayed",
            "Every attempt logged with imported, duplicate and rejected counts",
        ],
    ),
    Step(
        ordinal=7,
        slug="plugin-registry",
        title="Plug-and-Play Analyzer Registry",
        summary=(
            "Seven built-in analyzers behind one three-argument contract, with live weights, "
            "thresholds, derived variants and a real per-execution performance history."
        ),
        doc="07-plugin-registry.md",
        sources=["backend/momento/plugins.py"],
        highlights=[
            "Uniform contract: (multipliers, settings, config) -> signal dict",
            "Derived analyzers reference a base and keep their own tuning and history",
            "Per-analyzer exception isolation — one failure cannot break the batch",
            "Run count, mean score and latency measured, never declared",
        ],
    ),
    Step(
        ordinal=8,
        slug="orchestrator-and-autopilot",
        title="Decision Orchestrator & Autopilot Ledger",
        summary=(
            "Patience, speed, risk and mistake-prevention engines collapsed into one "
            "instruction, then recorded and scored as paper decisions."
        ),
        doc="08-orchestrator-and-autopilot.md",
        sources=["backend/momento/orchestrator.py", "backend/momento/autopilot.py"],
        highlights=[
            "Three execution modules from conservative to aggressive",
            "Fixed, confidence-scaled and quarter-Kelly position sizing",
            "Hard blocks on loss limits always override an actionable signal",
            "Equity curve, win rate and profit factor from settled rows only",
        ],
    ),
    Step(
        ordinal=9,
        slug="api-and-websocket",
        title="API & WebSocket Surface",
        summary=(
            "Seventy-plus versioned endpoints, three auth guards, sanitised errors, a "
            "one-second analysis cache and a multiplexed live channel."
        ),
        doc="09-api-and-websocket.md",
        sources=[
            "backend/momento/api/app.py",
            "backend/momento/api/deps.py",
            "backend/momento/api/schemas.py",
            "backend/momento/api/routes",
            "backend/momento/hub.py",
            "backend/momento/auth.py",
        ],
        highlights=[
            "PBKDF2 passwords with stateless HMAC-signed session tokens",
            "Snapshot on connect, then round/analysis/session/feed deltas",
            "Thread-safe broadcast so the watcher can publish into the event loop",
            "Every mutating operator route is guarded and audited",
        ],
    ),
    Step(
        ordinal=10,
        slug="frontend-foundation",
        title="Frontend Foundation: Design System & Data Layer",
        summary=(
            "The instrument-console design language, eight reusable primitives, five chart "
            "components, a typed API client and one live state spine."
        ),
        doc="10-frontend-foundation.md",
        sources=[
            "web/src/index.css",
            "web/tailwind.config.ts",
            "web/src/lib",
            "web/src/state",
            "web/src/components/console",
            "web/src/components/charts",
            "web/src/components/layout",
        ],
        highlights=[
            "Deep ink chassis with phosphor-mint signal, amber caution, crimson failure",
            "All numeric readouts monospaced and tabular so columns never jitter",
            "Retry on 5xx only; 4xx is final and carries an actionable message",
            "WebSocket deltas over React Query polling, with automatic backoff",
        ],
    ),
    Step(
        ordinal=11,
        slug="operator-console",
        title="Operator Console Screens",
        summary=(
            "Sixteen operator screens plus two cross-cutting surfaces, sharing one navigation "
            "model, one source selector and one live spine."
        ),
        doc="11-operator-console.md",
        sources=["web/src/pages/dashboard", "web/src/pages/Orchestrator.tsx", "web/src/pages/Inventory.tsx", "web/src/components/panels", "web/src/App.tsx"],
        highlights=[
            "Navigation grouped by intent, not by module",
            "Operator-only screens hidden for other roles rather than disabled",
            "Round Testing injects six scenarios that exercise every detector",
            "Legacy AVFS routes redirect to their new homes",
        ],
    ),
    Step(
        ordinal=12,
        slug="consumer-app",
        title="Consumer App & Entitlements",
        summary=(
            "Four consumer screens reading the same engines, with server-enforced premium "
            "entitlements and honest framing of what a forecast can and cannot do."
        ),
        doc="12-consumer-app.md",
        sources=["web/src/pages/app", "web/src/pages/Landing.tsx", "web/src/pages/auth", "web/src/state/AuthProvider.tsx"],
        highlights=[
            "One mood, one confidence ring, one suggestion with a hard stop",
            "Guardrail warnings surfaced verbatim from the orchestrator",
            "Premium gating enforced by an API dependency, not by hiding nav items",
            "Measured accuracy shown to paying users, including when it is poor",
        ],
    ),
    Step(
        ordinal=13,
        slug="deployment-debian-azure",
        title="Deployment: Debian VM on Azure",
        summary=(
            "Provisioning, systemd units, nginx with WebSocket upgrade, TLS, WAL-safe backups, "
            "log rotation and a hardening checklist."
        ),
        doc="13-deployment-debian-azure.md",
        sources=["scripts", "docs/SETUP.md", "docs/API.md", "README.md"],
        highlights=[
            "Separate momento-api and momento-receiver systemd units",
            "nginx /ws block with proxy_read_timeout 3600s for long-lived sockets",
            "Backups via sqlite3 .backup — never a plain cp on a live WAL database",
            "Port 8000 stays private; nginx is the only public listener",
        ],
    ),
]


def _should_skip(path: Path) -> bool:
    if any(part in EXCLUDE_DIRS for part in path.parts):
        return True
    return path.suffix.lower() in EXCLUDE_SUFFIXES


def _iter_files(target: Path) -> Iterable[Path]:
    """Yield every includable file for a source path (file or directory)."""
    if not target.exists():
        return
    if target.is_file():
        if not _should_skip(target.relative_to(ROOT)):
            yield target
        return
    for candidate in sorted(target.rglob("*")):
        if candidate.is_file() and not _should_skip(candidate.relative_to(ROOT)):
            yield candidate


def build_step_bundle(step: Step) -> tuple[str, int]:
    """Zip the sources a step covers, plus its own document."""
    name = f"{step.ordinal:02d}-{step.slug}.zip"
    archive = DIST / name
    written = 0

    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for source in step.sources:
            for path in _iter_files(ROOT / source):
                bundle.write(path, arcname=str(path.relative_to(ROOT)))
                written += 1

        doc_path = DOCS_STEPS / step.doc
        if doc_path.exists():
            bundle.write(doc_path, arcname=f"docs/steps/{step.doc}")
            written += 1

    return name, written


def build_full_bundle() -> tuple[str, int]:
    """Zip the entire platform: backend, frontend, docs and scripts."""
    name = "avfs-momento-core-complete.zip"
    archive = DIST / name
    written = 0
    roots = ["backend", "web", "docs", "scripts", "README.md", "rork.json"]

    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for entry in roots:
            for path in _iter_files(ROOT / entry):
                bundle.write(path, arcname=str(path.relative_to(ROOT)))
                written += 1

    return name, written


def main() -> int:
    parser = argparse.ArgumentParser(description="Build step docs and source bundles")
    parser.add_argument("--clean", action="store_true", help="Remove the downloads directory first")
    args = parser.parse_args()

    if args.clean and DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True, exist_ok=True)

    if not DOCS_STEPS.exists():
        print(f"error: {DOCS_STEPS} not found", file=sys.stderr)
        return 1

    manifest_steps = []
    total_files = 0

    for step in STEPS:
        source_doc = DOCS_STEPS / step.doc
        if not source_doc.exists():
            print(f"  !! missing document for step {step.ordinal:02d}: {step.doc}", file=sys.stderr)
            continue

        # Copy the step document next to its bundle so the API can serve both.
        doc_name = f"{step.ordinal:02d}-{step.slug}.md"
        shutil.copyfile(source_doc, DIST / doc_name)

        bundle_name, count = build_step_bundle(step)
        total_files += count

        manifest_steps.append(
            {
                "slug": step.slug,
                "ordinal": step.ordinal,
                "title": step.title,
                "summary": step.summary,
                "status": "complete",
                "highlights": step.highlights,
                "doc_file": doc_name,
                "bundle_file": bundle_name,
                "source_paths": step.sources,
            }
        )

        doc_kb = (DIST / doc_name).stat().st_size / 1024
        zip_kb = (DIST / bundle_name).stat().st_size / 1024
        print(f"  [{step.ordinal:02d}] {step.title}")
        print(f"       {doc_name}  ({doc_kb:6.1f} KB)")
        print(f"       {bundle_name}  ({zip_kb:6.1f} KB, {count} files)")

    full_name, full_count = build_full_bundle()
    full_mb = (DIST / full_name).stat().st_size / (1024 * 1024)
    print(f"  [--] Complete archive")
    print(f"       {full_name}  ({full_mb:.2f} MB, {full_count} files)")

    manifest = {
        "platform": "AVFS / Momento Core",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "steps": manifest_steps,
        "full_bundle": full_name,
        "total_steps": len(manifest_steps),
    }
    (DIST / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print()
    print(f"  {len(manifest_steps)} steps · {total_files} bundled files · manifest.json written")
    print(f"  output: {DIST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
