import * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL, MIGRATE_V1_TO_V2_SQL, MIGRATE_V2_TO_V3_SQL, MIGRATE_V3_TO_V4_SQL, SCHEMA_VERSION } from "./schema";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Adds `column` to `table` if it isn't already there, regardless of what PRAGMA user_version
 * claims. Self-healing safety net for the exact bug fixed below: on a device that already got
 * stamped with a too-high user_version while skipping an intermediate ALTER TABLE, the versioned
 * migration steps below would never run again, permanently missing that column. This check runs
 * every launch, is idempotent, and repairs an already-broken device without wiping its data.
 */
async function ensureColumn(db: SQLite.SQLiteDatabase, table: string, column: string, ddl: string): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

export async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const startVersion = result?.user_version ?? 0;
  // Tracks the version as migrations actually run, so a device that's several versions behind
  // cascades through every intermediate step instead of only the first one. The previous version
  // of this function checked each step against the original, never-updated `currentVersion` -
  // jumping from v1 straight to the latest SCHEMA_VERSION only ran the v1->v2 step, then stamped
  // user_version as fully current anyway, permanently skipping v2->v3 (the `notified` column) and
  // v3->v4 (`last_error_type`) for that device. That's the exact crash this fixes:
  // "table change_events has no column named notified".
  let version = startVersion;

  if (version < 1) {
    await db.execAsync(CREATE_TABLES_SQL);
    version = SCHEMA_VERSION; // CREATE_TABLES_SQL always creates the fully current schema already.
  }
  if (version < 2) {
    await db.execAsync(MIGRATE_V1_TO_V2_SQL);
    version = 2;
  }
  if (version < 3) {
    await db.execAsync(MIGRATE_V2_TO_V3_SQL);
    version = 3;
  }
  if (version < 4) {
    await db.execAsync(MIGRATE_V3_TO_V4_SQL);
    version = 4;
  }

  // Safety net for devices already stuck with a wrongly-advanced user_version from the bug above.
  await ensureColumn(db, "sync_meta", "school_name", "school_name TEXT");
  await ensureColumn(db, "sync_meta", "source_generated_at", "source_generated_at TEXT");
  await ensureColumn(db, "change_events", "notified", "notified INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "sync_meta", "last_error_type", "last_error_type TEXT");

  if (version !== startVersion) {
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync("fenyra.db");
      await db.execAsync("PRAGMA journal_mode = WAL");
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

export interface OfflineStats {
  lessonCount: number;
  rawSnapshotCount: number;
  changeEventCount: number;
}

export async function getOfflineStats(): Promise<OfflineStats> {
  const db = await getDb();
  const [lessons, snapshots, events] = await Promise.all([
    db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM lessons"),
    db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM raw_snapshots"),
    db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM change_events"),
  ]);
  return {
    lessonCount: lessons?.count ?? 0,
    rawSnapshotCount: snapshots?.count ?? 0,
    changeEventCount: events?.count ?? 0,
  };
}

/** Clears all locally cached data (lessons, raw snapshots, change events, sync timestamps). */
export async function clearOfflineData(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync("DELETE FROM lessons");
    await db.execAsync("DELETE FROM raw_snapshots");
    await db.execAsync("DELETE FROM change_events");
    await db.execAsync("DELETE FROM sync_meta");
  });
}
