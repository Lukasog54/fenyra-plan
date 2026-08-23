import { getDb } from "../db";
import type { Lesson, LessonStatus } from "../../models/Lesson";

interface LessonRow {
  id: string;
  source_id: string;
  date: string;
  start_time: string;
  end_time: string;
  period: number | null;
  week_type: string | null;
  subject: string | null;
  teacher: string | null;
  room: string | null;
  class_name: string | null;
  course: string | null;
  original_subject: string | null;
  original_teacher: string | null;
  original_room: string | null;
  status: string;
  note: string | null;
  is_exam: number;
  exam_info: string | null;
  moved_from: string | null;
  moved_to: string | null;
  last_updated: string | null;
  raw_data: string | null;
  synced_at: string;
}

function rowToLesson(row: LessonRow): Lesson {
  return {
    id: row.id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    period: row.period ?? undefined,
    weekType: (row.week_type as Lesson["weekType"]) ?? undefined,
    subject: row.subject ?? undefined,
    teacher: row.teacher ?? undefined,
    room: row.room ?? undefined,
    className: row.class_name ?? undefined,
    course: row.course ?? undefined,
    originalSubject: row.original_subject ?? undefined,
    originalTeacher: row.original_teacher ?? undefined,
    originalRoom: row.original_room ?? undefined,
    status: row.status as LessonStatus,
    note: row.note ?? undefined,
    isExam: row.is_exam === 1,
    examInfo: row.exam_info ?? undefined,
    movedFrom: row.moved_from ? JSON.parse(row.moved_from) : undefined,
    movedTo: row.moved_to ? JSON.parse(row.moved_to) : undefined,
    lastUpdated: row.last_updated ?? undefined,
    sourceId: row.source_id,
    rawData: row.raw_data ? JSON.parse(row.raw_data) : undefined,
  };
}

export async function getLessonsForRange(sourceId: string, from: string, to: string): Promise<Lesson[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LessonRow>(
    "SELECT * FROM lessons WHERE source_id = ? AND date >= ? AND date <= ? ORDER BY date ASC, period ASC",
    [sourceId, from, to]
  );
  return rows.map(rowToLesson);
}

async function insertLesson(db: Awaited<ReturnType<typeof getDb>>, sourceId: string, lesson: Lesson, syncedAt: string): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO lessons (
      id, source_id, date, start_time, end_time, period, week_type,
      subject, teacher, room, class_name, course,
      original_subject, original_teacher, original_room,
      status, note, is_exam, exam_info, moved_from, moved_to,
      last_updated, raw_data, synced_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      lesson.id,
      sourceId,
      lesson.date,
      lesson.startTime,
      lesson.endTime,
      lesson.period ?? null,
      lesson.weekType ?? null,
      lesson.subject ?? null,
      lesson.teacher ?? null,
      lesson.room ?? null,
      lesson.className ?? null,
      lesson.course ?? null,
      lesson.originalSubject ?? null,
      lesson.originalTeacher ?? null,
      lesson.originalRoom ?? null,
      lesson.status,
      lesson.note ?? null,
      lesson.isExam ? 1 : 0,
      lesson.examInfo ?? null,
      lesson.movedFrom ? JSON.stringify(lesson.movedFrom) : null,
      lesson.movedTo ? JSON.stringify(lesson.movedTo) : null,
      lesson.lastUpdated ?? null,
      lesson.rawData !== undefined ? JSON.stringify(lesson.rawData) : null,
      syncedAt,
    ]
  );
}

/**
 * Replaces lesson rows only for the given `dates` (not a from/to range) - so a day that failed to
 * fetch this sync (and so isn't in `dates`) keeps whatever was already cached for it, instead of
 * being silently wiped by a blanket range delete. `dates` should be exactly the dates the adapter
 * actually fetched successfully; `lessons` may span a subset of those dates (e.g. a day with
 * genuinely zero lessons for the selected class).
 */
export async function replaceLessonsForDates(sourceId: string, dates: string[], lessons: Lesson[], syncedAt: string): Promise<void> {
  if (dates.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const placeholders = dates.map(() => "?").join(",");
    await db.runAsync(`DELETE FROM lessons WHERE source_id = ? AND date IN (${placeholders})`, [sourceId, ...dates]);

    for (const lesson of lessons) {
      await insertLesson(db, sourceId, lesson, syncedAt);
    }
  });
}
