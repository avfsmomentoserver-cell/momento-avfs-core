"""Initialize vocabulary system database tables."""

import sys
sys.path.insert(0, '.')

from momento import db

def main():
    print("Initializing vocabulary system tables...")
    db.init_db()
    print("✓ Vocabulary tables created successfully")
    
    # Verify tables exist
    tables = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'vocabulary%'")
    print(f"✓ Found {len(tables)} vocabulary-related tables")
    for table in tables:
        print(f"  - {table['name']}")

if __name__ == "__main__":
    main()
