"""File ingest watcher.

Polls the inbox (and optionally the Downloads folder) for new round exports,
imports them, then moves each file to `processed/` or `failed/`. Runs in a
daemon thread alongside the API.
"""

from __future__ import annotations

import json
import logging
import shutil
import threading
import time
from pathlib import Path
from typing import Optional, Set

from . import config, store
from .hub import hub

logger = logging.getLogger("momento.watcher")

VALID_SUFFIXES = {".json", ".csv", ".txt", ".ndjson"}
DOWNLOAD_PREFIXES = ("momento", "avfs", "round", "rounds", "aviator", "crash", "jetx")


class IngestWatcher:
    """Polling watcher — no native dependencies, works the same on any host."""

    def __init__(self) -> None:
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()
        self._seen: Set[str] = set()
        self.files_processed = 0
        self.files_failed = 0
        self.rounds_imported = 0
        self.last_scan: Optional[float] = None
        self.last_error: Optional[str] = None

    @property
    def running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def start(self) -> None:
        if self.running:
            return
        config.ensure_directories()
        self._stop.clear()
        self._thread = threading.Thread(target=self._loop, name="momento-watcher", daemon=True)
        self._thread.start()
        watch_msg = f"ingest watcher started (inbox={config.INBOX_DIR}"
        if config.WATCH_DOWNLOADS:
            watch_msg += f", downloads={config.DOWNLOADS_DIR}"
        watch_msg += ")"
        logger.info(watch_msg)

    def stop(self) -> None:
        self._stop.set()
        thread = self._thread
        self._thread = None
        if thread is not None and thread.is_alive():
            thread.join(timeout=3.0)

    def status(self) -> dict:
        return {
            "running": self.running,
            "inbox_dir": str(config.INBOX_DIR),
            "processed_dir": str(config.PROCESSED_DIR),
            "failed_dir": str(config.FAILED_DIR),
            "downloads_dir": str(config.DOWNLOADS_DIR),
            "watch_downloads": config.WATCH_DOWNLOADS,
            "interval_seconds": config.WATCHER_INTERVAL,
            "files_processed": self.files_processed,
            "files_failed": self.files_failed,
            "rounds_imported": self.rounds_imported,
            "pending_files": len(self._pending()),
            "last_scan": self.last_scan,
            "last_error": self.last_error,
            "accepted_suffixes": sorted(VALID_SUFFIXES),
        }

    def _pending(self) -> list[Path]:
        files: list[Path] = []
        if config.INBOX_DIR.exists():
            files.extend(p for p in config.INBOX_DIR.iterdir() if p.is_file() and p.suffix.lower() in VALID_SUFFIXES)
        if config.WATCH_DOWNLOADS and config.DOWNLOADS_DIR.exists():
            for path in config.DOWNLOADS_DIR.iterdir():
                if not path.is_file() or path.suffix.lower() not in VALID_SUFFIXES:
                    continue
                if not path.name.lower().startswith(DOWNLOAD_PREFIXES):
                    continue
                if str(path.resolve()) in self._seen:
                    continue
                files.append(path)
        return sorted(files)

    def scan_once(self) -> dict:
        """Process every pending file. Returns a summary for the API."""
        processed = 0
        failed = 0
        imported = 0
        duplicates = 0

        for path in self._pending():
            key = str(path.resolve())
            try:
                if not self._is_settled(path):
                    continue

                # Check if this is a top rounds file
                if "top_rounds" in path.name.lower():
                    text = path.read_text(encoding="utf-8", errors="replace")
                    try:
                        payload = json.loads(text)
                        source_hint = self._source_hint(path)
                        report = store.ingest_top_rounds_payload(payload, source_hint, source_file=path.name)
                        imported += int(report["imported"])
                        duplicates += int(report["duplicates"])
                        processed += 1
                        self.files_processed += 1
                        self._seen.add(key)
                        self._move(path, config.PROCESSED_DIR)

                        if report["top_rounds"]:
                            source = report["top_rounds"][0]["source"]
                            hub.broadcast_threadsafe("top_rounds:update", {"top_rounds": report["top_rounds"], "source": source})
                    except json.JSONDecodeError:
                        raise ValueError(f"Invalid JSON in top rounds file {path.name}")
                else:
                    report = store.ingest_file(path, default_source=self._source_hint(path))
                    imported += int(report["imported"])
                    duplicates += int(report["duplicates"])
                    self.rounds_imported += int(report["imported"])
                    processed += 1
                    self.files_processed += 1
                    self._seen.add(key)
                    self._move(path, config.PROCESSED_DIR)

                    if report["rounds"]:
                        source = report["rounds"][0]["source"]
                        hub.broadcast_threadsafe("rounds:update", {"rounds": report["rounds"], "source": source})
                        try:
                            hub.broadcast_threadsafe("analysis:update", store.analysis_payload(source, use_cache=False))
                        except Exception as exc:
                            logger.debug("watcher analysis broadcast skipped: %s", exc)

            except Exception as exc:
                failed += 1
                self.files_failed += 1
                self.last_error = f"{path.name}: {exc}"
                self._seen.add(key)
                logger.warning("ingest failed for %s: %s", path.name, exc)
                self._move(path, config.FAILED_DIR)

        self.last_scan = time.time()
        summary = {"processed": processed, "failed": failed, "imported": imported, "duplicates": duplicates}
        if processed or failed:
            hub.broadcast_threadsafe("ingest:scan", {**summary, "status": self.status()})
        return summary

    @staticmethod
    def _is_settled(path: Path) -> bool:
        """Skip files that are still being written."""
        try:
            first = path.stat().st_size
            time.sleep(0.15)
            return first == path.stat().st_size and first > 0
        except OSError:
            return False

    @staticmethod
    def _source_hint(path: Path) -> str:
        name = path.stem.lower()
        for entry in config.DEFAULT_SOURCES:
            if entry["id"] in name:
                return entry["id"]
        return "aviator"

    @staticmethod
    def _move(path: Path, destination: Path) -> None:
        try:
            destination.mkdir(parents=True, exist_ok=True)
            target = destination / path.name
            if target.exists():
                target = destination / f"{path.stem}_{int(time.time())}{path.suffix}"
            shutil.move(str(path), str(target))
        except Exception as exc:
            logger.debug("could not move %s: %s", path.name, exc)

    def _loop(self) -> None:
        while not self._stop.is_set():
            try:
                self.scan_once()
            except Exception as exc:
                self.last_error = str(exc)
                logger.exception("watcher loop error")
            self._stop.wait(config.WATCHER_INTERVAL)


watcher = IngestWatcher()
