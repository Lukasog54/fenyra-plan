export type LessonStatus =
  | "normal"
  | "cancelled"
  | "substitution"
  | "room-change"
  | "teacher-change"
  | "subject-change"
  | "moved"
  | "unknown";

export interface LessonPointer {
  date: string;
  period?: number;
}

export interface Lesson {
  id: string;

  date: string;
  startTime: string;
  endTime: string;
  period?: number;
  weekType?: "A" | "B" | null;

  subject?: string;
  teacher?: string;
  room?: string;

  className?: string;
  course?: string;

  originalSubject?: string;
  originalTeacher?: string;
  originalRoom?: string;

  status: LessonStatus;

  note?: string;

  isExam?: boolean;
  examInfo?: string;

  movedFrom?: LessonPointer | null;
  movedTo?: LessonPointer | null;

  lastUpdated?: string;
  sourceId?: string;

  /** Unmapped/unrecognized fields from the source feed, preserved as-is. */
  rawData?: unknown;
}
