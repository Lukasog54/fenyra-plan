/** Auszug aus mobile/src/utils/date.ts - nur was die Website braucht. */

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

export function formatGermanDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}

/** "HH:mm" fuer die aktuelle Uhrzeit, lokal - vergleichbar mit Lesson.startTime/endTime. */
export function nowHHmm(): string {
  return new Date().toTimeString().slice(0, 5);
}

/** Montag der ISO-Woche, die das gegebene Datum enthaelt - portiert aus mobile/src/utils/date.ts. */
export function mondayOfWeek(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const weekday = d.getDay(); // 0 = Sonntag, 1 = Montag, ...
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  d.setDate(d.getDate() + diffToMonday);
  return toIsoDate(d);
}

const WEEKDAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function weekdayShort(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return WEEKDAY_SHORT[new Date(year, month - 1, day).getDay()];
}

export function dayOfMonth(isoDate: string): number {
  return Number(isoDate.split("-")[2]);
}

/** "23.08." - kompakt fuer Wochen-Kopfzeilen/Bereichsanzeigen. */
export function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}.${month}.`;
}

/** Fenster fuer den "Zeitraum"-Filter bei Vertretungen - identisch zu defaultSyncRange() in
 * mobile/src/utils/date.ts: eine Woche zurueck (fuer die Historie) bis drei Wochen voraus. */
export function defaultSyncRange(): { from: string; to: string } {
  const today = todayIsoDate();
  return { from: addDays(today, -7), to: addDays(today, 21) };
}
