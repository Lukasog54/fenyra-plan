import type { SchoolDataSource, FetchLessonsParams } from "../models/SchoolDataSource";
import type { SubstitutionChangeEvent } from "../models/SubstitutionChangeEvent";
import type { SyncMeta } from "../models/SyncMeta";
import { getLessonsForRange, replaceLessonsForDates } from "../database/repositories/lessonRepository";
import { saveRawSnapshot } from "../database/repositories/snapshotRepository";
import { getSyncMeta, saveSyncMeta } from "../database/repositories/syncMetaRepository";
import { saveChangeEvents } from "../database/repositories/changeEventRepository";
import { detectChanges } from "./ChangeDetector";

export interface SyncResult {
  events: SubstitutionChangeEvent[];
  syncMeta: SyncMeta;
}

// Keyed by sourceId - a sync already in flight for that source is returned as-is instead of
// starting a second, overlapping one (the periodic timer, app-resume, and a manual button press
// can otherwise all fire close together with no coordination between them).
const inFlightSyncs = new Map<string, Promise<SyncResult>>();

export function sync(adapter: SchoolDataSource, range: FetchLessonsParams): Promise<SyncResult> {
  const sourceId = adapter.config.id;
  const existing = inFlightSyncs.get(sourceId);
  if (existing) return existing;

  const promise = performSync(adapter, range).finally(() => {
    inFlightSyncs.delete(sourceId);
  });
  inFlightSyncs.set(sourceId, promise);
  return promise;
}

async function performSync(adapter: SchoolDataSource, range: FetchLessonsParams): Promise<SyncResult> {
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

    // Only the dates actually fetched this time get replaced - a day that failed to fetch (but
    // wasn't part of a total-range failure, see the adapter's own all-days-failed guard) keeps
    // whatever was already cached for it instead of being silently deleted.
    await replaceLessonsForDates(sourceId, result.datesFetched ?? [], result.lessons, now);
    await saveChangeEvents(events);

    const syncMeta: SyncMeta = {
      sourceId,
      lastSyncedAt: now,
      lastSyncStatus: "success",
      lastError: null,
      syncIntervalMinutes: intervalMinutes,
      // Fall back to the previously stored value so a sync that succeeds but happens not to
      // touch today's file (edge case) doesn't blank out an already-known school name/timestamp.
      schoolName: result.syncMeta.schoolName ?? existingMeta?.schoolName ?? null,
      sourceGeneratedAt: result.syncMeta.sourceGeneratedAt ?? existingMeta?.sourceGeneratedAt ?? null,
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
      schoolName: existingMeta?.schoolName ?? null,
      sourceGeneratedAt: existingMeta?.sourceGeneratedAt ?? null,
    };
    await saveSyncMeta(syncMeta);
    throw error;
  }
}
