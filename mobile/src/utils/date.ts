/** ISO "YYYY-MM-DD" for a given Date, in local time. */
export function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIsoDate(): string {
  return toIsoDate(new Date());
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Monday of the ISO week containing the given date (Mon=0 offset). */
export function mondayOfWeek(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const weekday = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  d.setDate(d.getDate() + diffToMonday);
  return toIsoDate(d);
}

export function isDateInRange(isoDate: string, from: string, to: string): boolean {
  return isoDate >= from && isoDate <= to;
}

export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Window synced by default: a week back (for the substitutions history) through three weeks ahead. */
export function defaultSyncRange(): { from: string; to: string } {
  const today = todayIsoDate();
  return { from: addDays(today, -7), to: addDays(today, 21) };
}

/** "YYYYMMDD" (Indiware's Kopf/Datum format) -> ISO "YYYY-MM-DD". */
export function parseCompactDate(compact: string | number): string {
  const digits = String(compact);
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

/** "HH:mm" for the current time, in local time - comparable against Lesson.startTime/endTime. */
export function nowHHmm(): string {
  return new Date().toTimeString().slice(0, 5);
}
