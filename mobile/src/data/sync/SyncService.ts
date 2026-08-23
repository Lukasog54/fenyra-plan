import type { SchoolDataSource, FetchLessonsParams } from "../models/SchoolDataSource";
import type { SubstitutionChangeEvent } from "../models/SubstitutionChangeEvent";
import type { SyncMeta } from "../models/SyncMeta";
import { getLessonsForRange, replaceLessonsForDates } from "../database/repositories/lessonRepository";
import { saveRawSnapshot } from "../database/repositories/snapshotRepository";
import { getSyncMeta, saveSyncMeta } from "../database/repositories/syncMetaRepository";
import { saveChangeEvents } from "../database/repositories/changeEventRepository";
import { detectChanges } from "./ChangeDetector";
import { notifyNewChangeEvents, notifySyncError } from "../notifications/NotificationService";
import { ClassifiedError, classifiedTypeOf } from "../errors/ClassifiedError";

export interface SyncResult {
  events: SubstitutionChangeEvent[];
  syncMeta: SyncMeta;
}

/**
 * Coarse phases only - the adapter fetches Stundenplan+Vertretungen together per day internally,
 * so those two can't be reported as separate ticks without changing the SchoolDataSource
 * interface itself. "connecting" covers reading local sync state before any network call.
 */
export type SyncPhase = "connecting" | "fetching" | "saving" | "done";
export type SyncProgressCallback = (phase: SyncPhase) => void;

// Keyed by sourceId - a sync already in flight for that source is returned as-is instead of
// starting a second, overlapping one (the periodic timer, app-resume, and a manual button press
// can otherwise all fire close together with no coordination between them). Only the caller that
// actually started the in-flight sync gets progress callbacks; a caller that joins an already
// in-flight sync just awaits the same result without its own progress ticks.
const inFlightSyncs = new Map<string, Promise<SyncResult>>();

export function sync(adapter: SchoolDataSource, range: FetchLessonsParams, onProgress?: SyncProgressCallback): Promise<SyncResult> {
  const sourceId = adapter.config.id;
  const existing = inFlightSyncs.get(sourceId);
  if (existing) return existing;

  const promise = performSync(adapter, range, onProgress).finally(() => {
    inFlightSyncs.delete(sourceId);
  });
  inFlightSyncs.set(sourceId, promise);
  return promise;
}

/** Runs a local-database step and, if it fails, reclassifies the failure as DATABASE_ERROR - unless
 * it's already a ClassifiedError (e.g. one that bubbled up from elsewhere), which is left as-is. */
async function asDatabaseStep<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ClassifiedError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new ClassifiedError("DATABASE_ERROR", message, { cause: error });
  }
}

async function performSync(adapter: SchoolDataSource, range: FetchLessonsParams, onProgress?: SyncProgressCallback): Promise<SyncResult> {
  const sourceId = adapter.config.id;
  const now = new Date().toISOString();
  onProgress?.("connecting");
  const existingMeta = await asDatabaseStep(() => getSyncMeta(sourceId));
  const intervalMinutes = existingMeta?.syncIntervalMinutes ?? 30;

  try {
    const previous = await asDatabaseStep(() => getLessonsForRange(sourceId, range.from, range.to));
    onProgress?.("fetching");
    // Not wrapped in asDatabaseStep: failures here are already classified by the adapter itself
    // (NETWORK_ERROR/AUTH_ERROR/SOURCE_ERROR) - reclassifying them as DATABASE_ERROR would hide
    // a genuine Stundenplan24 problem behind the wrong category.
    const result = await adapter.fetchLessons(range);

    onProgress?.("saving");
    const events = await asDatabaseStep(async () => {
      for (const raw of result.rawPayloads ?? []) {
        await saveRawSnapshot(sourceId, raw.kind, raw.payload, now);
      }

      const detected = detectChanges(previous, result.lessons, now);

      // Only the dates actually fetched this time get replaced - a day that failed to fetch (but
      // wasn't part of a total-range failure, see the adapter's own all-days-failed guard) keeps
      // whatever was already cached for it instead of being silently deleted.
      await replaceLessonsForDates(sourceId, result.datesFetched ?? [], result.lessons, now);
      await saveChangeEvents(detected);
      return detected;
    });

    const syncMeta: SyncMeta = {
      sourceId,
      lastSyncedAt: now,
      lastSyncStatus: "success",
      lastError: null,
      lastErrorType: null,
      syncIntervalMinutes: intervalMinutes,
      // Fall back to the previously stored value so a sync that succeeds but happens not to
      // touch today's file (edge case) doesn't blank out an already-known school name/timestamp.
      schoolName: result.syncMeta.schoolName ?? existingMeta?.schoolName ?? null,
      sourceGeneratedAt: result.syncMeta.sourceGeneratedAt ?? existingMeta?.sourceGeneratedAt ?? null,
    };
    await asDatabaseStep(() => saveSyncMeta(syncMeta));
    onProgress?.("done");

    // Never notify from the very first sync ever: it diffs against an empty `previous` set, so
    // every already-existing lesson (including perfectly normal ones) looks like it "appeared" -
    // categoryForEvent() already filters out plain "normal" appearances, but real substitutions
    // that merely predate the user's first sync would still wrongly look brand new otherwise.
    if (existingMeta !== null) {
      await notifyNewChangeEvents(events);
    }

    return { events, syncMeta };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const errorType = classifiedTypeOf(error);
    const syncMeta: SyncMeta = {
      sourceId,
      lastSyncedAt: existingMeta?.lastSyncedAt ?? null,
      lastSyncStatus: "error",
      lastError: message,
      lastErrorType: errorType,
      syncIntervalMinutes: intervalMinutes,
      schoolName: existingMeta?.schoolName ?? null,
      sourceGeneratedAt: existingMeta?.sourceGeneratedAt ?? null,
    };
    await saveSyncMeta(syncMeta);
    // Only notify on the transition from working to broken, not on every repeated failure -
    // otherwise a prolonged outage would send a notification on every single retry.
    if (existingMeta?.lastSyncStatus === "success") {
      await notifySyncError(message);
    }
    throw error;
  }
}
