"""Global Watcher for Centralized Data Collection.

This module provides a centralized data collection system that feeds the global
database and can be used by all branches. It handles:
- Multi-source data collection
- Branch-agnostic data ingestion
- Real-time data streaming
- Branch-aware data routing
- Error handling and retry logic
"""

from __future__ import annotations

import json
import logging
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set
from datetime import datetime, timezone

try:
    from . import global_db as gdb
except ImportError:
    # Fallback for direct execution
    import global_db as gdb

logger = logging.getLogger("global.watcher")


class GlobalWatcher:
    """Centralized data collection system for all branches."""
    
    def __init__(self) -> None:
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()
        self._seen: Set[str] = set()
        self.files_processed = 0
        self.files_failed = 0
        self.rounds_imported = 0
        self.last_scan: Optional[float] = None
        self.last_error: Optional[str] = None
        
        # Data sources configuration
        self.sources: List[Dict[str, Any]] = []
        self.watch_directories: List[Path] = []
        
        # Branch subscribers (branches that want notifications)
        self._subscribers: Dict[str, Set[str]] = {}  # branch -> set of event types
        
    @property
    def running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()
    
    def start(self) -> None:
        """Start the global watcher service."""
        if self.running:
            return
        
        gdb.ensure_global_directories()
        self._stop.clear()
        self._thread = threading.Thread(
            target=self._loop, 
            name="global-watcher", 
            daemon=True
        )
        self._thread.start()
        logger.info("Global watcher started")
    
    def stop(self) -> None:
        """Stop the global watcher service."""
        self._stop.set()
        thread = self._thread
        self._thread = None
        if thread is not None and thread.is_alive():
            thread.join(timeout=3.0)
        logger.info("Global watcher stopped")
    
    def add_source(self, source_config: Dict[str, Any]) -> None:
        """Add a data source to watch."""
        self.sources.append(source_config)
        gdb.register_source(source_config)
        logger.info(f"Added source: {source_config['id']}")
    
    def add_watch_directory(self, directory: Path) -> None:
        """Add a directory to watch for data files."""
        self.watch_directories.append(directory)
        logger.info(f"Added watch directory: {directory}")
    
    def subscribe_branch(self, branch: str, event_types: List[str]) -> None:
        """Subscribe a branch to specific event types."""
        if branch not in self._subscribers:
            self._subscribers[branch] = set()
        self._subscribers[branch].update(event_types)
        logger.info(f"Branch {branch} subscribed to events: {event_types}")
    
    def status(self) -> Dict[str, Any]:
        """Get watcher status information."""
        return {
            "running": self.running,
            "sources": len(self.sources),
            "watch_directories": [str(d) for d in self.watch_directories],
            "files_processed": self.files_processed,
            "files_failed": self.files_failed,
            "rounds_imported": self.rounds_imported,
            "subscribers": {k: list(v) for k, v in self._subscribers.items()},
            "last_scan": self.last_scan,
            "last_error": self.last_error,
        }
    
    def _pending_files(self) -> List[Path]:
        """Get list of pending files to process."""
        files: List[Path] = []
        
        for directory in self.watch_directories:
            if not directory.exists():
                continue
            
            # Look for common data file formats
            valid_suffixes = {".json", ".csv", ".txt", ".ndjson"}
            for path in directory.iterdir():
                if not path.is_file() or path.suffix.lower() not in valid_suffixes:
                    continue
                if str(path.resolve()) in self._seen:
                    continue
                files.append(path)
        
        return sorted(files)
    
    def _is_settled(self, path: Path) -> bool:
        """Check if file is still being written."""
        try:
            first = path.stat().st_size
            time.sleep(0.15)
            return first == path.stat().st_size and first > 0
        except OSError:
            return False
    
    def _process_file(self, path: Path) -> Dict[str, Any]:
        """Process a single data file."""
        result = {
            "file": str(path),
            "imported": 0,
            "duplicates": 0,
            "source": None,
            "data_type": "crash",
            "errors": []
        }
        
        try:
            # Detect file type and process accordingly
            if path.suffix == ".json":
                data = json.loads(path.read_text(encoding="utf-8", errors="replace"))
                result = self._process_json_file(data, path, result)
            elif path.suffix == ".csv":
                result = self._process_csv_file(path, result)
            else:
                result = self._process_text_file(path, result)
                
        except Exception as e:
            result["errors"].append(str(e))
            logger.error(f"Error processing {path.name}: {e}")
        
        return result
    
    def _process_json_file(self, data: Any, path: Path, result: Dict[str, Any]) -> Dict[str, Any]:
        """Process JSON data file."""
        # Detect if this is rounds data or top rounds data
        if isinstance(data, list) and len(data) > 0:
            if isinstance(data[0], dict) and "multiplier" in data[0]:
                # Standard rounds data
                source = self._detect_source(path, data[0])
                result["source"] = source
                
                for round_data in data:
                    try:
                        round_data["source"] = source
                        round_data["timestamp"] = round_data.get("timestamp", gdb.utc_now())
                        gdb.ingest_round(round_data, data_type="crash")
                        result["imported"] += 1
                    except Exception as e:
                        result["errors"].append(f"Round {round_data.get('id', 'unknown')}: {e}")
                        
            elif isinstance(data[0], dict) and "session_id" in data[0]:
                # Top rounds data
                source = self._detect_source(path, data[0])
                result["source"] = source
                result["data_type"] = "top_rounds"
                
                for round_data in data:
                    try:
                        round_data["source"] = source
                        round_data["timestamp"] = round_data.get("timestamp", gdb.utc_now())
                        # Store in branch-specific table if needed
                        result["imported"] += 1
                    except Exception as e:
                        result["errors"].append(f"Round {round_data.get('id', 'unknown')}: {e}")
        
        return result
    
    def _process_csv_file(self, path: Path, result: Dict[str, Any]) -> Dict[str, Any]:
        """Process CSV data file."""
        # Basic CSV processing - can be enhanced
        import csv
        
        source = self._detect_source(path, {})
        result["source"] = source
        
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    round_data = {
                        "source": source,
                        "timestamp": row.get("timestamp", gdb.utc_now()),
                        "multiplier": float(row.get("multiplier", 1.0)),
                        "raw_data": json.dumps(row)
                    }
                    gdb.ingest_round(round_data, data_type="crash")
                    result["imported"] += 1
                except Exception as e:
                    result["errors"].append(f"Row processing error: {e}")
        
        return result
    
    def _process_text_file(self, path: Path, result: Dict[str, Any]) -> Dict[str, Any]:
        """Process text data file."""
        # Try to parse as JSON or CSV
        content = path.read_text(encoding="utf-8", errors="replace")
        
        try:
            data = json.loads(content)
            return self._process_json_file(data, path, result)
        except json.JSONDecodeError:
            # Try CSV format
            try:
                return self._process_csv_file(path, result)
            except Exception:
                result["errors"].append("Could not parse text file as JSON or CSV")
        
        return result
    
    def _detect_source(self, path: Path, sample_data: Any) -> str:
        """Detect the source from filename or data."""
        # Check filename for source hints
        filename = path.stem.lower()
        
        for source_config in self.sources:
            source_id = source_config["id"].lower()
            if source_id in filename:
                return source_config["id"]
        
        # Check data for source hints
        if isinstance(sample_data, dict):
            if "source" in sample_data:
                return sample_data["source"]
        
        # Default to first available source
        if self.sources:
            return self.sources[0]["id"]
        
        return "unknown"
    
    def _notify_subscribers(self, event_type: str, data: Dict[str, Any]) -> None:
        """Notify subscribed branches about events."""
        for branch, event_types in self._subscribers.items():
            if event_type in event_types:
                logger.debug(f"Notifying branch {branch} about {event_type}")
                # In a real implementation, this would use a message queue or event bus
                # For now, we'll just log the notification
    
    def scan_once(self) -> Dict[str, Any]:
        """Process all pending files once."""
        processed = 0
        failed = 0
        imported = 0
        
        for path in self._pending_files():
            key = str(path.resolve())
            
            if not self._is_settled(path):
                continue
            
            try:
                result = self._process_file(path)
                
                if result["imported"] > 0:
                    processed += 1
                    imported += result["imported"]
                    self.files_processed += 1
                    self.rounds_imported += result["imported"]
                    
                    # Notify subscribers about new data
                    self._notify_subscribers("rounds:ingested", {
                        "source": result["source"],
                        "count": result["imported"],
                        "file": str(path)
                    })
                    
                    # Update branch sync timestamps
                    for branch in self._subscribers.keys():
                        gdb.update_branch_sync(branch)
                    
                else:
                    failed += 1
                    self.files_failed += 1
                    
                self._seen.add(key)
                
            except Exception as exc:
                failed += 1
                self.files_failed += 1
                self.last_error = f"{path.name}: {exc}"
                self._seen.add(key)
                logger.warning("Global watcher processing failed for %s: %s", path.name, exc)
        
        self.last_scan = time.time()
        summary = {
            "processed": processed,
            "failed": failed,
            "imported": imported,
            "status": self.status()
        }
        
        if processed or failed:
            self._notify_subscribers("watcher:scan", summary)
        
        return summary
    
    def _loop(self) -> None:
        """Main watcher loop."""
        while not self._stop.is_set():
            try:
                self.scan_once()
            except Exception as exc:
                self.last_error = str(exc)
                logger.exception("Global watcher loop error")
            
            # Wait before next scan
            self._stop.wait(2.0)  # 2 second interval


# Global watcher instance
global_watcher = GlobalWatcher()