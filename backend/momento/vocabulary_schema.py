"""Vocabulary learning system database schema."""

VOCABULARY_SCHEMA = """
CREATE TABLE IF NOT EXISTS vocabulary_entries (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    mathematical_definition TEXT NOT NULL,
    linguistic_mapping TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'candidate',
    usage_count INTEGER NOT NULL DEFAULT 0,
    consistency_score REAL,
    discovered_at TEXT NOT NULL,
    formalized_at TEXT,
    deprecated_at TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (type, name)
);
CREATE INDEX IF NOT EXISTS idx_vocabulary_type ON vocabulary_entries(type);
CREATE INDEX IF NOT EXISTS idx_vocabulary_status ON vocabulary_entries(status);
CREATE INDEX IF NOT EXISTS idx_vocabulary_source ON vocabulary_entries(source);

CREATE TABLE IF NOT EXISTS vocabulary_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vocabulary_id TEXT NOT NULL,
    context TEXT NOT NULL,
    confidence REAL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (vocabulary_id) REFERENCES vocabulary_entries(id)
);
CREATE INDEX IF NOT EXISTS idx_vocabulary_usage_vocab ON vocabulary_usage(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_usage_created ON vocabulary_usage(created_at DESC);

CREATE TABLE IF NOT EXISTS vocabulary_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id TEXT NOT NULL,
    child_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL,
    strength REAL NOT NULL DEFAULT 1.0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES vocabulary_entries(id),
    FOREIGN KEY (child_id) REFERENCES vocabulary_entries(id),
    UNIQUE (parent_id, child_id, relationship_type)
);
CREATE INDEX IF NOT EXISTS idx_vocabulary_rel_parent ON vocabulary_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_rel_child ON vocabulary_relationships(child_id);

CREATE TABLE IF NOT EXISTS pattern_discoveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discovery_source TEXT NOT NULL,
    raw_pattern TEXT NOT NULL,
    processed_pattern TEXT,
    vocabulary_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    processing_error TEXT,
    created_at TEXT NOT NULL,
    processed_at TEXT,
    FOREIGN KEY (vocabulary_id) REFERENCES vocabulary_entries(id)
);
CREATE INDEX IF NOT EXISTS idx_pattern_discoveries_source ON pattern_discoveries(discovery_source);
CREATE INDEX IF NOT EXISTS idx_pattern_discoveries_status ON pattern_discoveries(status);
"""
