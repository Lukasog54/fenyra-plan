import type { SyncErrorType } from "../errors/ClassifiedError";

export type SyncStatus = "success" | "error" | "never";

export interface SyncMeta {
  sourceId: string;
  lastSyncedAt: string | null;
  lastSyncStatus: SyncStatus;
  lastError?: string | null;
  /** Which pipeline stage `lastError` came from (NETWORK_ERROR/AUTH_ERROR/SOURCE_ERROR/DATABASE_ERROR/
   * SYNC_ERROR) - null when there's no error, or for errors saved before this field existed. */
  lastErrorType?: SyncErrorType | null;
  syncIntervalMinutes: number;
  /** From the source's own Vertretungsplan-Kopf (<schulname>) - not user-entered, not invented. */
  schoolName?: string | null;
  /**
   * The source's own "as of" timestamp for the plan (mobil <Kopf><zeitstempel>), in whatever
   * format the source sends it (observed: German "DD.MM.YYYY, HH:mm") - kept as-is, not
   * reparsed/reformatted, since the exact timezone/format convention isn't documented anywhere.
   * Distinct from lastSyncedAt, which is when Fenyra itself last fetched.
   */
  sourceGeneratedAt?: string | null;
}
