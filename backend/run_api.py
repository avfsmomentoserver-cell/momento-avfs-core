#!/usr/bin/env python3
"""Momento Core API launcher.

Usage:
    python run_api.py                 # 0.0.0.0:8000
    python run_api.py --port 9000     # custom port
    python run_api.py --reload        # development auto-reload
    python run_api.py --receiver-only # ingest watcher only, no HTTP server
"""

from __future__ import annotations

import argparse
import signal
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from momento import auth, config, db, plugins  # noqa: E402
from momento.api.app import configure_logging  # noqa: E402
from momento.watcher import watcher  # noqa: E402


def run_receiver_only() -> int:
    """Run just the ingest pipeline (matches the avfs-receiver service)."""
    configure_logging()
    db.init_db()
    # plugins.seed_builtins()  # TODO: Function not implemented in current plugins module
    auth.bootstrap()
    watcher.start()
    print(f"[momento] receiver running — watching {config.INBOX_DIR}")

    stop = {"flag": False}

    def _handle(_signum: int, _frame: object) -> None:
        stop["flag"] = True

    signal.signal(signal.SIGINT, _handle)
    signal.signal(signal.SIGTERM, _handle)

    try:
        while not stop["flag"]:
            time.sleep(0.5)
    finally:
        watcher.stop()
        print("[momento] receiver stopped")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Momento Core / AVFS backend")
    parser.add_argument("--host", default=config.API_HOST)
    parser.add_argument("--port", type=int, default=config.API_PORT)
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload (development)")
    parser.add_argument("--receiver-only", action="store_true", help="Run the ingest watcher without the API")
    parser.add_argument("--init-only", action="store_true", help="Create the database and exit")
    args = parser.parse_args()

    config.ensure_directories()

    if args.init_only:
        configure_logging()
        db.init_db()
        # plugins.seed_builtins()  # TODO: Function not implemented in current plugins module
        auth.bootstrap()
        stats = db.stats()
        print(f"[momento] database ready at {stats['path']}")
        print(f"[momento] tables: {stats['counts']}")
        return 0

    if args.receiver_only:
        return run_receiver_only()

    try:
        import uvicorn
    except ImportError:
        print("uvicorn is not installed. Run: pip install -r requirements.txt", file=sys.stderr)
        return 1

    print(f"[momento] starting API on http://{args.host}:{args.port}")
    print(f"[momento] docs at http://localhost:{args.port}/docs")
    uvicorn.run(
        "momento.api.app:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
        ws_ping_interval=25,
        ws_ping_timeout=20,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
