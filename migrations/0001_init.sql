CREATE TABLE IF NOT EXISTS user_state (
  id TEXT PRIMARY KEY,
  surah INTEGER NOT NULL,
  start_ayah INTEGER NOT NULL,
  end_ayah INTEGER NOT NULL,
  mode TEXT NOT NULL DEFAULT 'test',
  pause_seconds REAL NOT NULL DEFAULT 5,
  step INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
