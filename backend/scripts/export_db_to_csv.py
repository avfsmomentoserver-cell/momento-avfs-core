#!/usr/bin/env python3
"""Export database tables to CSV files.

Exports rounds table to games.csv and sessions table to sessions.csv,
plus other relevant tables for complete data export.
"""

import csv
import sqlite3
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

# Add parent directory to path to import momento modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from momento import config


def export_table_to_csv(conn: sqlite3.Connection, table_name: str, output_path: Path) -> None:
    """Export a single table to CSV."""
    cursor = conn.execute(f"SELECT * FROM {table_name}")
    columns = [description[0] for description in cursor.description]
    rows = cursor.fetchall()
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(columns)
        writer.writerows(rows)
    
    print(f"Exported {len(rows)} rows from {table_name} to {output_path}")


def calculate_sessions_from_rounds(conn: sqlite3.Connection, gap_minutes: int = 5) -> List[Dict[str, Any]]:
    """Calculate sessions from rounds based on time gaps.
    
    A new session starts when there's a gap greater than gap_minutes between consecutive rounds.
    
    Args:
        conn: Database connection
        gap_minutes: Minimum gap in minutes to consider as a new session
        
    Returns:
        List of session dictionaries
    """
    # Get all rounds ordered by timestamp, grouped by source
    cursor = conn.execute("""
        SELECT source, timestamp, multiplier 
        FROM rounds 
        ORDER BY source, timestamp ASC
    """)
    rounds = cursor.fetchall()
    
    sessions = []
    current_source = None
    current_session_rounds = []
    last_timestamp = None
    
    for round_row in rounds:
        source = round_row['source']
        timestamp_str = round_row['timestamp']
        
        try:
            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            continue
        
        # Check if we need to start a new session
        if current_source != source:
            # New source - start new session
            if current_session_rounds:
                sessions.append(_finalize_session(current_source, current_session_rounds))
            current_source = source
            current_session_rounds = [round_row]
            last_timestamp = timestamp
        elif last_timestamp is not None:
            # Check time gap
            time_diff = (timestamp - last_timestamp).total_seconds() / 60  # Convert to minutes
            if time_diff > gap_minutes:
                # Gap exceeded - finalize current session and start new one
                sessions.append(_finalize_session(current_source, current_session_rounds))
                current_session_rounds = [round_row]
            else:
                # Continue current session
                current_session_rounds.append(round_row)
            last_timestamp = timestamp
        else:
            # First round for this source
            current_session_rounds.append(round_row)
            last_timestamp = timestamp
    
    # Don't forget the last session
    if current_session_rounds:
        sessions.append(_finalize_session(current_source, current_session_rounds))
    
    return sessions


def _finalize_session(source: str, rounds: List[sqlite3.Row]) -> Dict[str, Any]:
    """Create a session dictionary from a list of rounds."""
    if not rounds:
        return {}
    
    timestamps = []
    multipliers = []
    
    for round_row in rounds:
        try:
            ts = datetime.fromisoformat(round_row['timestamp'].replace('Z', '+00:00'))
            timestamps.append(ts)
            multipliers.append(round_row['multiplier'])
        except (ValueError, AttributeError):
            continue
    
    if not timestamps:
        return {}
    
    started_at = min(timestamps).isoformat()
    ended_at = max(timestamps).isoformat()
    round_count = len(rounds)
    peak = max(multipliers) if multipliers else 0
    mean = sum(multipliers) / len(multipliers) if multipliers else 0
    created_at = datetime.utcnow().isoformat()
    
    return {
        'source': source,
        'started_at': started_at,
        'ended_at': ended_at,
        'round_count': round_count,
        'peak': peak,
        'mean': mean,
        'created_at': created_at
    }


def export_calculated_sessions(conn: sqlite3.Connection, output_path: Path, gap_minutes: int = 5) -> None:
    """Calculate and export sessions based on round gaps."""
    sessions = calculate_sessions_from_rounds(conn, gap_minutes)
    
    if not sessions:
        print("No sessions calculated")
        return
    
    # Use the same column order as the sessions table
    columns = ['id', 'source', 'started_at', 'ended_at', 'round_count', 'peak', 'mean', 'created_at']
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(columns)
        for i, session in enumerate(sessions):
            row = [i + 1] + [session.get(col, '') for col in columns[1:]]
            writer.writerow(row)
    
    print(f"Exported {len(sessions)} calculated sessions to {output_path}")


def export_merged_clean_csv(conn: sqlite3.Connection, output_path: Path, gap_minutes: int = 5) -> None:
    """Export a single clean CSV with rounds annotated with session IDs."""
    # Get all rounds ordered by timestamp
    cursor = conn.execute("""
        SELECT id, source, timestamp, multiplier, color, band, points, source_file, ingest_method, created_at
        FROM rounds 
        ORDER BY source, timestamp ASC
    """)
    rounds = cursor.fetchall()
    
    # Calculate sessions
    sessions = calculate_sessions_from_rounds(conn, gap_minutes)
    
    # Create a mapping of (source, timestamp) -> session_id
    session_map = {}
    for session_idx, session in enumerate(sessions):
        session_id = session_idx + 1
        source = session['source']
        
        # Find rounds that belong to this session
        cursor = conn.execute("""
            SELECT id, timestamp 
            FROM rounds 
            WHERE source = ? AND timestamp >= ? AND timestamp <= ?
            ORDER BY timestamp ASC
        """, (source, session['started_at'], session['ended_at']))
        
        for row in cursor.fetchall():
            session_map[(row['id'], row['timestamp'])] = session_id
    
    # Export merged data
    columns = ['round_id', 'source', 'timestamp', 'multiplier', 'color', 'band', 'points', 'session_id']
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(columns)
        
        for round_row in rounds:
            round_id = round_row['id']
            timestamp = round_row['timestamp']
            session_id = session_map.get((round_id, timestamp), '')
            
            row = [
                round_id,
                round_row['source'],
                timestamp,
                round_row['multiplier'],
                round_row['color'] or '',
                round_row['band'] or '',
                round_row['points'] or '',
                session_id
            ]
            writer.writerow(row)
    
    print(f"Exported {len(rounds)} rounds with session annotations to {output_path}")


def main():
    """Export all relevant tables to CSV."""
    config.ensure_directories()
    db_path = config.DATABASE_PATH
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        sys.exit(1)
    
    # Create output directory
    output_dir = Path(__file__).parent.parent / "exports"
    output_dir.mkdir(exist_ok=True)
    
    # Connect to database
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    
    print(f"Exporting clean merged CSV from {db_path} to {output_dir}")
    print("=" * 60)
    
    # Export single clean CSV with rounds and session annotations
    clean_csv_path = output_dir / "clean_data.csv"
    export_merged_clean_csv(conn, clean_csv_path, gap_minutes=5)
    
    conn.close()
    print("=" * 60)
    print(f"Export complete. Files saved to {output_dir}")


if __name__ == "__main__":
    main()
