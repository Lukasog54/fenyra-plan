import { getDb } from "../db";
import type { ChangeField, SubstitutionChangeEvent } from "../../models/SubstitutionChangeEvent";

interface ChangeEventRow {
  id: string;
  lesson_id: string;
  date: string;
  class_name: string | null;
  field: ChangeField;
  previous_value: string | null;
  new_value: string | null;
  detected_at: string;
  acknowledged: number;
}

function rowToEvent(row: ChangeEventRow): SubstitutionChangeEvent {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    date: row.date,
    className: row.class_name ?? undefined,
    field: row.field,
    previousValue: row.previous_value,
    newValue: row.new_value,
    detectedAt: row.detected_at,
    acknowledged: row.acknowledged === 1,
  };
}

export async function saveChangeEvents(events: SubstitutionChangeEvent[]): Promise<void> {
  if (events.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const event of events) {
      await db.runAsync(
        `INSERT OR REPLACE INTO change_events
          (id, lesson_id, date, class_name, field, previous_value, new_value, detected_at, acknowledged)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          event.id,
          event.lessonId,
          event.date,
          event.className ?? null,
          event.field,
          event.previousValue,
          event.newValue,
          event.detectedAt,
          event.acknowledged ? 1 : 0,
        ]
      );
    }
  });
}

export async function getChangeEventsForRange(from: string, to: string): Promise<SubstitutionChangeEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ChangeEventRow>(
    "SELECT * FROM change_events WHERE date >= ? AND date <= ? ORDER BY detected_at DESC",
    [from, to]
  );
  return rows.map(rowToEvent);
}
