import type { Lesson } from "./types";

/** Portiert aus mobile/src/utils/lessonGroups.ts - gruppiert Lessons mit gleichem Datum+Klasse+Stunde
 * (parallele Kurs-/Gruppen-Lessons), damit z.B. ein Ausfall einer von zwei parallelen Gruppen nicht so
 * aussieht, als fiele die ganze Stunde aus. */
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

/** Ob eine Lesson gerade jetzt laeuft - gemeinsame Logik fuer LessonsTable (Desktop) und LessonCard
 * (Mobile), damit beide Ansichten dieselbe Stunde hervorheben. */
export function isCurrentLesson(lesson: Lesson, today: string, nowHHmm: string): boolean {
  return lesson.date === today && Boolean(lesson.startTime) && Boolean(lesson.endTime) && lesson.startTime <= nowHHmm && nowHHmm < lesson.endTime;
}
