import type { SchoolDataSource } from "../models/SchoolDataSource";
import type { Lesson } from "../models/Lesson";
import { getLessonsForRange } from "../database/repositories/lessonRepository";

export interface FieldMismatch {
  lessonId: string;
  field: keyof Lesson;
  sourceValue: unknown;
  fenyraValue: unknown;
}

export interface DataIntegrityReport {
  range: { from: string; to: string };
  sourceRecordCount: number;
  fenyraRecordCount: number;
  /** Present in a fresh fetch from the source, absent from Fenyra's stored data. */
  missing: Lesson[];
  /** Present in Fenyra's stored data, absent from a fresh fetch from the source. */
  extra: Lesson[];
  /** Same lesson id in both, but a compared field differs. */
  mismatched: FieldMismatch[];
}

/**
 * The Stundenplan core fields (see docs/stundenplan24-investigation.md) plus status/note - anything
 * not in this list either isn't parsed from this source at all (see DataSourceDiagnostics) or is a
 * purely local concern (id/sourceId/lastUpdated/rawData), so comparing it wouldn't mean anything.
 */
const COMPARED_FIELDS: Array<keyof Lesson> = [
  "date",
  "period",
  "startTime",
  "endTime",
  "subject",
  "teacher",
  "room",
  "className",
  "course",
  "status",
  "note",
];

/**
 * Compares a fresh, independent fetch straight from the source (bypassing the database entirely)
 * against what Fenyra currently has stored for the same range. This is a live snapshot comparison,
 * not a diff against "what was stored at the last sync" - a genuine MISSING/EXTRA/MISMATCH can also
 * simply mean the source changed since the last sync, not that Fenyra processed anything
 * incorrectly. Callers should show `range` alongside the stored `lastSyncedAt` so that distinction
 * stays visible instead of being silently presented as a Fenyra bug.
 */
export async function checkDataIntegrity(adapter: SchoolDataSource, range: { from: string; to: string }): Promise<DataIntegrityReport> {
  const sourceResult = await adapter.fetchLessons(range);
  const sourceLessons = sourceResult.lessons;
  const fenyraLessons = await getLessonsForRange(adapter.config.id, range.from, range.to);

  const sourceById = new Map(sourceLessons.map((l) => [l.id, l]));
  const fenyraById = new Map(fenyraLessons.map((l) => [l.id, l]));

  const missing: Lesson[] = [];
  const mismatched: FieldMismatch[] = [];

  for (const [id, sourceLesson] of sourceById) {
    const fenyraLesson = fenyraById.get(id);
    if (!fenyraLesson) {
      missing.push(sourceLesson);
      continue;
    }
    for (const field of COMPARED_FIELDS) {
      const sourceValue = sourceLesson[field];
      const fenyraValue = fenyraLesson[field];
      if (sourceValue !== fenyraValue) {
        mismatched.push({ lessonId: id, field, sourceValue, fenyraValue });
      }
    }
  }

  const extra: Lesson[] = [];
  for (const [id, fenyraLesson] of fenyraById) {
    if (!sourceById.has(id)) extra.push(fenyraLesson);
  }

  return {
    range,
    sourceRecordCount: sourceLessons.length,
    fenyraRecordCount: fenyraLessons.length,
    missing,
    extra,
    mismatched,
  };
}
