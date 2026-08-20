import type { Lesson } from "../models/Lesson";
import type { ChangeField, SubstitutionChangeEvent } from "../models/SubstitutionChangeEvent";
import { generateId } from "../../utils/id";

const COMPARED_FIELDS: Array<{ field: ChangeField; read: (lesson: Lesson) => string | null }> = [
  { field: "room", read: (l) => l.room ?? null },
  { field: "teacher", read: (l) => l.teacher ?? null },
  { field: "subject", read: (l) => l.subject ?? null },
  { field: "status", read: (l) => l.status },
  { field: "note", read: (l) => l.note ?? null },
];

function makeEvent(
  lesson: Lesson,
  field: ChangeField,
  previousValue: string | null,
  newValue: string | null,
  detectedAt: string
): SubstitutionChangeEvent {
  return {
    id: generateId("evt"),
    lessonId: lesson.id,
    date: lesson.date,
    className: lesson.className,
    field,
    previousValue,
    newValue,
    detectedAt,
    acknowledged: false,
    notified: false,
  };
}

/**
 * Diffs two normalized lesson sets for the same date range and produces one
 * event per changed field, plus events for lessons that appeared or
 * disappeared entirely.
 */
export function detectChanges(previous: Lesson[], next: Lesson[], detectedAt: string = new Date().toISOString()): SubstitutionChangeEvent[] {
  const previousById = new Map(previous.map((lesson) => [lesson.id, lesson]));
  const nextById = new Map(next.map((lesson) => [lesson.id, lesson]));
  const events: SubstitutionChangeEvent[] = [];

  for (const [id, nextLesson] of nextById) {
    const previousLesson = previousById.get(id);

    if (!previousLesson) {
      events.push(makeEvent(nextLesson, "status", null, nextLesson.status, detectedAt));
      continue;
    }

    for (const { field, read } of COMPARED_FIELDS) {
      const before = read(previousLesson);
      const after = read(nextLesson);
      if (before !== after) {
        events.push(makeEvent(nextLesson, field, before, after, detectedAt));
      }
    }
  }

  for (const [id, previousLesson] of previousById) {
    if (!nextById.has(id)) {
      events.push(makeEvent(previousLesson, "status", previousLesson.status, null, detectedAt));
    }
  }

  return events;
}
