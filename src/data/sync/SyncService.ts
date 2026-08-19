import type { SchoolDataSource, FetchLessonsParams } from "../models/SchoolDataSource";
import type { SubstitutionChangeEvent } from "../models/SubstitutionChangeEvent";
import type { SyncMeta } from "../models/SyncMeta";
import { getLessonsForRange, replaceLessonsForRange } from "../database/repositories/lessonRepository";
import { saveRawSnapshot } from "../database/repositories/snapshotRepository";
import { getSyncMeta, saveSyncMeta } from "../database/repositories/syncMetaRepository";
import { saveChangeEvents } from "../database/repositories/changeEventRepository";
import { detectChanges } from "./ChangeDetector";

export interface SyncResult {
  events: SubstitutionChangeEvent[];
  syncMeta: SyncMeta;
}

export async function sync(adapter: SchoolDataSource, range: FetchLessonsParams): Promise<SyncResult> {
  const sourceId = adapter.config.id;
  const now = new Date().toISOString();
  const existingMeta = await getSyncMeta(sourceId);
  const intervalMinutes = existingMeta?.syncIntervalMinutes ?? 30;

  try {
    const previous = await getLessonsForRange(sourceId, range.from, range.to);
    const result = await adapter.fetchLessons(range);

    for (const raw of result.rawPayloads ?? []) {
      await saveRawSnapshot(sourceId, raw.kind, raw.payload, now);
    }

    const events = detectChanges(previous, result.lessons, now);

    await replaceLessonsForRange(sourceId, range.from, range.to, result.lessons, now);
    await saveChangeEvents(events);

    const syncMeta: SyncMeta = {
      sourceId,
      lastSyncedAt: now,
      lastSyncStatus: "success",
      lastError: null,
      syncIntervalMinutes: intervalMinutes,
    };
    await saveSyncMeta(syncMeta);

    return { events, syncMeta };
  } catch (error) {
    const syncMeta: SyncMeta = {
      sourceId,
      lastSyncedAt: existingMeta?.lastSyncedAt ?? null,
      lastSyncStatus: "error",
      lastError: error instanceof Error ? error.message : String(error),
      syncIntervalMinutes: intervalMinutes,
    };
    await saveSyncMeta(syncMeta);
    throw error;
  }
}
