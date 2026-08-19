export type ChangeField = "room" | "teacher" | "subject" | "status" | "note";

export interface SubstitutionChangeEvent {
  id: string;
  lessonId: string;
  date: string;
  className?: string;
  field: ChangeField;
  previousValue: string | null;
  newValue: string | null;
  detectedAt: string;
  acknowledged: boolean;
}
