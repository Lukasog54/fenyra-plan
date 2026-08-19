import type { Lesson } from "./Lesson";
import type { SyncMeta } from "./SyncMeta";

export interface Stundenplan24SourceConfig {
  baseUrl: string;
  schoolId: string;
  username?: string;
  /**
   * Reference to a credential held in secure storage (Android Keystore / iOS
   * Keychain). Never a plaintext secret — secure-storage wiring lands in a
   * later pass, this field only reserves the shape.
   */
  credentialRef?: string;
}

export interface DataSourceConfig {
  id: string;
  displayName: string;
  kind: "stundenplan24";
  stundenplan24?: Stundenplan24SourceConfig;
}

export interface FetchLessonsParams {
  /** ISO date, inclusive */
  from: string;
  /** ISO date, inclusive */
  to: string;
  className?: string;
}

export interface FetchLessonsResult {
  lessons: Lesson[];
  syncMeta: SyncMeta;
  /** Raw payload(s) as received from the source, for raw-snapshot persistence. Never shown in the UI. */
  rawPayloads?: Array<{ kind: string; payload: string }>;
}

export interface ConnectionTestResult {
  ok: boolean;
  message?: string;
}

/**
 * The single seam the rest of the app depends on. UI and the sync layer
 * only ever talk to this interface — never to XML/JSON shapes directly.
 * Mirrors how Stundenplan24's "mobil" feeds actually authenticate (HTTP
 * Basic Auth sent per request, no separate login/logout call) rather than
 * inventing a session API the real source doesn't have.
 */
export interface SchoolDataSource {
  readonly config: DataSourceConfig;
  fetchLessons(params: FetchLessonsParams): Promise<FetchLessonsResult>;
  fetchAvailableClasses(): Promise<string[]>;
  testConnection(): Promise<ConnectionTestResult>;
}
