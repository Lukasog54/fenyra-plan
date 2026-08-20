import type { Lesson } from "../data/models/Lesson";

/**
 * Groups lessons that share the same date+className+period - i.e. parallel elective/split-group
 * lessons happening at the same time (e.g. two simultaneous sports groups), confirmed to be a
 * real thing the source sends (see docs/stundenplan24-investigation.md). Preserves relative
 * order; a period with only one lesson still comes back as a group of length 1, so callers can
 * treat every slot uniformly.
 */
export function groupParallelLessons(lessons: Lesson[]): Lesson[][] {
  const order: string[] = [];
  const groups = new Map<string, Lesson[]>();
  for (const lesson of lessons) {
    const key = `${lesson.date}_${lesson.className ?? ""}_${lesson.period ?? lesson.id}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(lesson);
  }
  return order.map((key) => groups.get(key)!);
}
