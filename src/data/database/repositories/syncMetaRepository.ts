import { getDb } from "../db";
import type { SyncMeta, SyncStatus } from "../../models/SyncMeta";
import type { SyncErrorType } from "../../errors/ClassifiedError";

interface SyncMetaRow {
  source_id: string;
  last_synced_at: string | null;
  last_sync_status: SyncStatus;
  last_error: string | null;
  last_error_type: SyncErrorType | null;
  sync_interval_minutes: number;
  school_name: string | null;
  source_generated_at: string | null;
}

function rowToSyncMeta(row: SyncMetaRow): SyncMeta {
  return {
    sourceId: row.source_id,
    lastSyncedAt: row.last_synced_at,
    lastSyncStatus: row.last_sync_status,
    lastError: row.last_error ?? undefined,
    lastErrorType: row.last_error_type ?? undefined,
    syncIntervalMinutes: row.sync_interval_minutes,
    schoolName: row.school_name ?? undefined,
    sourceGeneratedAt: row.source_generated_at ?? undefined,
  };
}

export async function getSyncMeta(sourceId: string): Promise<SyncMeta | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SyncMetaRow>("SELECT * FROM sync_meta WHERE source_id = ?", [sourceId]);
  return row ? rowToSyncMeta(row) : null;
}

export async function saveSyncMeta(meta: SyncMeta): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO sync_meta (source_id, last_synced_at, last_sync_status, last_error, last_error_type, sync_interval_minutes, school_name, source_generated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(source_id) DO UPDATE SET
       last_synced_at = excluded.last_synced_at,
       last_sync_status = excluded.last_sync_status,
       last_error = excluded.last_error,
       last_error_type = excluded.last_error_type,
       sync_interval_minutes = excluded.sync_interval_minutes,
       school_name = excluded.school_name,
       source_generated_at = excluded.source_generated_at`,
    [
      meta.sourceId,
      meta.lastSyncedAt,
      meta.lastSyncStatus,
      meta.lastError ?? null,
      meta.lastErrorType ?? null,
      meta.syncIntervalMinutes,
      meta.schoolName ?? null,
      meta.sourceGeneratedAt ?? null,
    ]
  );
}
