#!/usr/bin/env python3
"""Migrate rounds from Momento v1 database to v4 database.

This script imports deduplicated rounds from the v1 database,
applies band classification, and handles duplicates gracefully.
"""

import sqlite3
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict


def classify_band(multiplier: float) -> str:
    """Classify multiplier into band based on thresholds."""
    if multiplier < 2.0:
        return "low"
    elif multiplier < 5.0:
        return "ignition"
    elif multiplier < 10.0:
        return "moonshot"
    else:
        return "mega"


def migrate_v1_to_v4(v1_db_path: str, v4_db_path: str, batch_size: int = 1000) -> Dict[str, Any]:
    """Migrate rounds from v1 database to v4 database.
    
    Args:
        v1_db_path: Path to v1 database file
        v4_db_path: Path to v4 database file
        batch_size: Number of rounds to process per batch
        
    Returns:
        Migration statistics
    """
    print(f"Starting migration from {v1_db_path} to {v4_db_path}")
    print(f"Batch size: {batch_size}")
    
    # Connect to both databases
    v1_conn = sqlite3.connect(v1_db_path)
    v4_conn = sqlite3.connect(v4_db_path)
    
    v1_cursor = v1_conn.cursor()
    v4_cursor = v4_conn.cursor()
    
    # Get total count from v1
    v1_cursor.execute("SELECT COUNT(*) FROM rounds")
    total_v1_rounds = v1_cursor.fetchone()[0]
    print(f"Total v1 rounds: {total_v1_rounds}")
    
    # Get current v4 count
    v4_cursor.execute("SELECT COUNT(*) FROM rounds")
    initial_v4_count = v4_cursor.fetchone()[0]
    print(f"Initial v4 rounds: {initial_v4_count}")
    
    # Read v1 rounds in batches
    v1_cursor.execute("SELECT id, timestamp, multiplier, color, source_file, created_at, source FROM rounds ORDER BY id")
    
    stats = {
        "total_v1_rounds": total_v1_rounds,
        "initial_v4_count": initial_v4_count,
        "imported": 0,
        "duplicates": 0,
        "errors": 0,
        "bands": {"low": 0, "ignition": 0, "moonshot": 0, "mega": 0}
    }
    
    batch = []
    processed = 0
    
    for row in v1_cursor:
        v1_id, timestamp, multiplier, color, source_file, created_at, source = row
        
        # Classify band
        band = classify_band(multiplier)
        
        # Prepare v4 record
        v4_record = {
            "source": source or "aviator",
            "timestamp": timestamp,
            "multiplier": multiplier,
            "color": color,
            "band": band,
            "points": None,  # Will be calculated by analysis engine
            "source_file": source_file,
            "ingest_method": "file",
            "created_at": created_at or datetime.utcnow().isoformat()
        }
        
        batch.append(v4_record)
        stats["bands"][band] += 1
        
        # Process batch
        if len(batch) >= batch_size:
            imported, duplicates = process_batch(v4_cursor, batch)
            stats["imported"] += imported
            stats["duplicates"] += duplicates
            processed += len(batch)
            batch = []
            
            if processed % 10000 == 0:
                v4_conn.commit()
                print(f"Processed {processed}/{total_v1_rounds} rounds")
    
    # Process remaining batch
    if batch:
        imported, duplicates = process_batch(v4_cursor, batch)
        stats["imported"] += imported
        stats["duplicates"] += duplicates
        processed += len(batch)
    
    # Final commit
    v4_conn.commit()
    
    # Get final v4 count
    v4_cursor.execute("SELECT COUNT(*) FROM rounds")
    final_v4_count = v4_cursor.fetchone()[0]
    stats["final_v4_count"] = final_v4_count
    stats["net_added"] = final_v4_count - initial_v4_count
    
    # Close connections
    v1_conn.close()
    v4_conn.close()
    
    print("\n=== Migration Complete ===")
    print(f"Total v1 rounds: {stats['total_v1_rounds']}")
    print(f"Initial v4 rounds: {stats['initial_v4_count']}")
    print(f"Final v4 rounds: {stats['final_v4_count']}")
    print(f"Net added: {stats['net_added']}")
    print(f"Imported: {stats['imported']}")
    print(f"Duplicates skipped: {stats['duplicates']}")
    print(f"Band distribution:")
    for band, count in stats["bands"].items():
        print(f"  {band}: {count}")
    
    return stats


def process_batch(cursor: sqlite3.Cursor, batch: list) -> tuple[int, int]:
    """Process a batch of rounds for insertion.
    
    Returns:
        (imported_count, duplicate_count)
    """
    imported = 0
    duplicates = 0
    
    for record in batch:
        try:
            cursor.execute(
                """INSERT INTO rounds (source, timestamp, multiplier, color, band, points, source_file, ingest_method, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    record["source"],
                    record["timestamp"],
                    record["multiplier"],
                    record["color"],
                    record["band"],
                    record["points"],
                    record["source_file"],
                    record["ingest_method"],
                    record["created_at"]
                )
            )
            imported += 1
        except sqlite3.IntegrityError:
            # Duplicate - skip
            duplicates += 1
        except Exception as e:
            print(f"Error inserting round: {e}")
    
    return imported, duplicates


if __name__ == "__main__":
    v1_db = "/home/pirates/Avfs_Core/avfs/v4/old_dont_implement/avfs.db"
    v4_db = "/opt/momento/backend/data/momento.db"
    
    if not Path(v1_db).exists():
        print(f"Error: v1 database not found at {v1_db}")
        sys.exit(1)
    
    if not Path(v4_db).exists():
        print(f"Error: v4 database not found at {v4_db}")
        sys.exit(1)
    
    stats = migrate_v1_to_v4(v1_db, v4_db, batch_size=1000)
    
    # Exit with error if nothing was imported
    if stats["imported"] == 0:
        print("Warning: No rounds were imported")
        sys.exit(1)
