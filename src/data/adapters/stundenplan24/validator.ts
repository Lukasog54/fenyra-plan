import { RawMobilDocumentSchema, RawVplanDocumentSchema, type RawMobilDocument, type RawVplanDocument } from "./models";

export class Stundenplan24ValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: unknown
  ) {
    super(message);
    this.name = "Stundenplan24ValidationError";
  }
}

export function validateMobil(raw: unknown): RawMobilDocument {
  const result = RawMobilDocumentSchema.safeParse(raw);
  if (!result.success) {
    throw new Stundenplan24ValidationError("Indiware-mobil-Antwort entspricht nicht dem erwarteten Format.", result.error.issues);
  }
  return result.data;
}

export function validateVplan(raw: unknown): RawVplanDocument {
  const result = RawVplanDocumentSchema.safeParse(raw);
  if (!result.success) {
    throw new Stundenplan24ValidationError("Vertretungsplan-Antwort entspricht nicht dem erwarteten Format.", result.error.issues);
  }
  return result.data;
}
