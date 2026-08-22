/**
 * Which stage of the pipeline (Quelle -> Auth -> Rohdaten -> Parser -> Validierung -> Mapper ->
 * SQLite -> App-State -> UI) an error actually originated in, so a Stundenplan24 problem is never
 * shown as a Fenyra bug and a real Fenyra bug is never hidden behind "Quelle nicht verfügbar".
 *
 * Only types with a real, honestly-distinguishable throw site are used - see the call sites in
 * `stundenplan24/adapter.ts` and `sync/SyncService.ts`. PARSER_ERROR/MAPPING_ERROR/UI_ERROR are
 * deliberately not wired in yet: a single day's parse/mapping failure is currently tolerated as a
 * skipped day rather than aborting the sync (see `fetchDayLessons`'s catch), so there is no real
 * top-level throw site for them to classify - inventing one would be fabricated precision.
 */
export type SyncErrorType = "NETWORK_ERROR" | "AUTH_ERROR" | "SOURCE_ERROR" | "DATABASE_ERROR" | "SYNC_ERROR";

export class ClassifiedError extends Error {
  readonly type: SyncErrorType;

  constructor(type: SyncErrorType, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ClassifiedError";
    this.type = type;
  }
}

export function classifiedTypeOf(error: unknown): SyncErrorType {
  return error instanceof ClassifiedError ? error.type : "SYNC_ERROR";
}
