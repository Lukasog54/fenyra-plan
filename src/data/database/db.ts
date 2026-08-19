import * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from "./schema";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < SCHEMA_VERSION) {
    await db.execAsync(CREATE_TABLES_SQL);
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
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
