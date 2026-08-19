export type SyncStatus = "success" | "error" | "never";

export interface SyncMeta {
  sourceId: string;
  lastSyncedAt: string | null;
  lastSyncStatus: SyncStatus;
  lastError?: string | null;
  syncIntervalMinutes: number;
}
