export const SCHEMA_VERSION = 3;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  period INTEGER,
  week_type TEXT,
  subject TEXT,
  teacher TEXT,
  room TEXT,
  class_name TEXT,
  course TEXT,
  original_subject TEXT,
  original_teacher TEXT,
  original_room TEXT,
  status TEXT NOT NULL,
  note TEXT,
  is_exam INTEGER DEFAULT 0,
  exam_info TEXT,
  moved_from TEXT,
  moved_to TEXT,
  last_updated TEXT,
  raw_data TEXT,
  synced_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lessons_date ON lessons(date);
CREATE INDEX IF NOT EXISTS idx_lessons_class_date ON lessons(class_name, date);
CREATE INDEX IF NOT EXISTS idx_lessons_source ON lessons(source_id);

CREATE TABLE IF NOT EXISTS raw_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_raw_snapshots_source ON raw_snapshots(source_id, fetched_at);

CREATE TABLE IF NOT EXISTS sync_meta (
  source_id TEXT PRIMARY KEY,
  last_synced_at TEXT,
  last_sync_status TEXT NOT NULL DEFAULT 'never',
  last_error TEXT,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 30,
  school_name TEXT,
  source_generated_at TEXT
);

CREATE TABLE IF NOT EXISTS change_events (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  date TEXT NOT NULL,
  class_name TEXT,
  field TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  detected_at TEXT NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  notified INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_change_events_date ON change_events(date);
`;

/** v1 -> v2: adds schoolName/sourceGeneratedAt to sync_meta. CREATE TABLE IF NOT EXISTS above
 * already includes them for fresh installs, so this only runs for pre-existing databases. */
export const MIGRATE_V1_TO_V2_SQL = `
ALTER TABLE sync_meta ADD COLUMN school_name TEXT;
ALTER TABLE sync_meta ADD COLUMN source_generated_at TEXT;
`;

/** v2 -> v3: adds "already sent a push notification for this" tracking, distinct from
 * `acknowledged` (reserved for a possible future in-app "mark as read", never written to yet). */
export const MIGRATE_V2_TO_V3_SQL = `
ALTER TABLE change_events ADD COLUMN notified INTEGER NOT NULL DEFAULT 0;
`;
