-- D1 schema for file status tracking
CREATE TABLE IF NOT EXISTS file_status (
  id TEXT PRIMARY KEY,
  partner TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'accepted',
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  error_summary TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_file_status_partner ON file_status(partner);
CREATE INDEX IF NOT EXISTS idx_file_status_created ON file_status(created_at DESC);
