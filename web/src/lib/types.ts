/** Portiert aus mobile/src/data/models/Lesson.ts - identisches Wire-Format wie die Backend-API. */
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
  rawData?: unknown;
}

/** Portiert aus mobile/src/theme/colors.ts (statusLabels) - CSS-Variablennamen statt Palette-Keys. */
export const statusLabels: Record<LessonStatus, string> = {
  normal: "Regulär",
  cancelled: "Fällt aus",
  substitution: "Vertretung",
  "room-change": "Raumänderung",
  "teacher-change": "Lehrerwechsel",
  "subject-change": "Fachänderung",
  moved: "Verlegt",
  unknown: "Unbekannt",
};

export const statusColorVar: Record<LessonStatus, string> = {
  normal: "var(--color-text-secondary)",
  cancelled: "var(--color-danger)",
  substitution: "var(--color-warning)",
  "room-change": "var(--color-warning)",
  "teacher-change": "var(--color-warning)",
  "subject-change": "var(--color-warning)",
  moved: "var(--color-violet)",
  unknown: "var(--color-muted)",
};
