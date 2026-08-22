import Database from "better-sqlite3";
import type * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL } from "../src/data/database/schema";

interface WithRaw {
  __raw: Database.Database;
}

/**
 * A real, in-memory SQLite database (via `better-sqlite3`, synchronous, pure Node - no native
 * expo-sqlite/JSI bindings needed) wrapped in just the subset of expo-sqlite's async
 * `SQLiteDatabase` API this project's repositories and `migrate()` actually use. Runs the
 * repositories' and migrations' real SQL strings for real, instead of a hand-rolled mock that only
 * checks which JS function got called with which arguments - exactly the gap that let the schema
 * migration bug (missing `notified` column) through undetected.
 *
 * Lives outside `__tests__/` on purpose: Jest's default testMatch treats every file under
 * `__tests__/` as a test file, and this one has no tests of its own.
 */
export function createTestDb(): SQLite.SQLiteDatabase {
  const raw = new Database(":memory:");

  const db: Record<string, unknown> = {
    __raw: raw,
    async execAsync(sql: string): Promise<void> {
      raw.exec(sql);
    },
    async getFirstAsync<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      const row = raw.prepare(sql).get(...params);
      return (row ?? null) as T | null;
    },
    async getAllAsync<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return raw.prepare(sql).all(...params) as T[];
    },
    async runAsync(sql: string, params: unknown[] = []) {
      const result = raw.prepare(sql).run(...params);
      return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
    },
    async withTransactionAsync(task: () => Promise<void>): Promise<void> {
      // better-sqlite3 is synchronous and in-memory - tests don't need real atomicity/rollback,
      // only that everything the callback does actually runs, same as the real transaction wrapper.
      await task();
    },
  };

  return db as unknown as SQLite.SQLiteDatabase;
}

/** A test DB with the current schema already created - for repository tests that don't care about migrations themselves. */
export function createFreshTestDb(): SQLite.SQLiteDatabase {
  const db = createTestDb();
  rawDb(db).exec(CREATE_TABLES_SQL);
  return db;
}

/** Escape hatch for tests that need to seed/inspect raw SQL directly (e.g. simulating an old schema). */
export function rawDb(db: SQLite.SQLiteDatabase): Database.Database {
  return (db as unknown as WithRaw).__raw;
}
