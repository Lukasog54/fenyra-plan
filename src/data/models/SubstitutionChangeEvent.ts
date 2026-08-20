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
  /** Whether a push notification has already been sent for this event - distinct from
   * `acknowledged` (reserved for a possible future in-app "mark as read", never written yet). */
  notified: boolean;
}
