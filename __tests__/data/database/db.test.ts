import { migrate } from "../../../src/data/database/db";
import { CREATE_TABLES_SQL } from "../../../src/data/database/schema";
import { createTestDb, rawDb } from "../../../test-utils/sqliteTestDb";

/** What CREATE_TABLES_SQL looked like at schema v1 - before school_name/source_generated_at,
 * notified, and last_error_type existed. Used to reproduce a device stuck on an old schema. */
const V1_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  period INTEGER,
  status TEXT NOT NULL,
  synced_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS raw_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sync_meta (
  source_id TEXT PRIMARY KEY,
  last_synced_at TEXT,
  last_sync_status TEXT NOT NULL DEFAULT 'never',
  last_error TEXT,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 30
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
  acknowledged INTEGER NOT NULL DEFAULT 0
);
PRAGMA user_version = 1;
`;

function columnsOf(db: ReturnType<typeof createTestDb>, table: string): string[] {
  return rawDb(db)
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((c) => (c as { name: string }).name);
}

function userVersionOf(db: ReturnType<typeof createTestDb>): number {
  return (rawDb(db).prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
}

describe("migrate", () => {
  it("regression: cascades through every intermediate migration for a device several versions behind, instead of only the first one", async () => {
    // Reproduces the exact production crash: a device stuck on schema v1 (before school_name/
    // source_generated_at, notified, and last_error_type existed) hitting "table change_events has
    // no column named notified" once code expecting the newer schema ran against it.
    const db = createTestDb();
    rawDb(db).exec(V1_SCHEMA_SQL);

    await migrate(db);

    expect(columnsOf(db, "sync_meta")).toEqual(
      expect.arrayContaining(["school_name", "source_generated_at", "last_error_type"])
    );
    expect(columnsOf(db, "change_events")).toContain("notified");
    expect(userVersionOf(db)).toBe(4);
  });

  it("self-heals a device already wrongly stamped at the latest version but actually missing columns", async () => {
    // Simulates a device that already hit the bug once: user_version says 4 (or 3, whatever the
    // installed build's SCHEMA_VERSION was), but the columns from the skipped steps were never
    // actually added - migrate() must not trust the stamped version blindly.
    const db = createTestDb();
    rawDb(db).exec(V1_SCHEMA_SQL);
    rawDb(db).exec("ALTER TABLE sync_meta ADD COLUMN school_name TEXT");
    rawDb(db).exec("ALTER TABLE sync_meta ADD COLUMN source_generated_at TEXT");
    rawDb(db).exec("PRAGMA user_version = 4"); // wrongly stamped as fully current

    await migrate(db);

    expect(columnsOf(db, "change_events")).toContain("notified");
    expect(columnsOf(db, "sync_meta")).toContain("last_error_type");
  });

  it("creates the fully current schema directly for a brand new database", async () => {
    const db = createTestDb();

    await migrate(db);

    expect(columnsOf(db, "sync_meta")).toEqual(
      expect.arrayContaining(["school_name", "source_generated_at", "last_error_type"])
    );
    expect(columnsOf(db, "change_events")).toContain("notified");
    expect(userVersionOf(db)).toBe(4);
  });

  it("does nothing when a database is already fully up to date", async () => {
    const db = createTestDb();
    rawDb(db).exec(CREATE_TABLES_SQL);
    rawDb(db).exec("PRAGMA user_version = 4");
    const execSpy = jest.spyOn(rawDb(db), "exec");

    await migrate(db);

    expect(execSpy).not.toHaveBeenCalledWith(expect.stringContaining("ALTER TABLE"));
    expect(execSpy).not.toHaveBeenCalledWith(expect.stringContaining("PRAGMA user_version ="));
  });
});
