import type { Lesson } from "../data/models/Lesson";

export interface LessonFieldDiff {
  label: string;
  from: string;
  to: string;
}

/** Human-readable "before -> after" lines for whichever tracked fields actually changed. */
export function describeLessonChanges(lesson: Lesson): LessonFieldDiff[] {
  const diffs: LessonFieldDiff[] = [];

  if (lesson.originalRoom && lesson.originalRoom !== lesson.room) {
    diffs.push({ label: "Raum", from: lesson.originalRoom, to: lesson.room ?? "?" });
  }
  if (lesson.originalTeacher && lesson.originalTeacher !== lesson.teacher) {
    diffs.push({ label: "Lehrer", from: lesson.originalTeacher, to: lesson.teacher ?? "?" });
  }
  if (lesson.originalSubject && lesson.originalSubject !== lesson.subject) {
    diffs.push({ label: "Fach", from: lesson.originalSubject, to: lesson.subject ?? "?" });
  }

  return diffs;
}
