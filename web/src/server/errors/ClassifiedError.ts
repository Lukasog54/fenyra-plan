/** Portiert aus mobile/src/data/errors/ClassifiedError.ts. */
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

/** HTTP-Status fuer eine Route-Handler-Antwort, passend zur Fehlerursache (Stundenplan24-Auth vs.
 * -Erreichbarkeit vs. ein echter Fenyra-Bug), statt alles pauschal als 500 zu melden. */
export function statusForClassifiedError(error: unknown): number {
  if (!(error instanceof ClassifiedError)) return 500;
  switch (error.type) {
    case "AUTH_ERROR":
      return 401;
    case "NETWORK_ERROR":
    case "SOURCE_ERROR":
      return 502;
    default:
      return 500;
  }
}
