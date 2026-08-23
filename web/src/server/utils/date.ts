/** Portiert aus mobile/src/utils/date.ts (reine Funktionen, keine RN-Abhaengigkeit). */

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

/** Fenster, das pro Poll abgerufen wird: eine Woche zurueck bis drei Wochen voraus. */
export function defaultSyncRange(): { from: string; to: string } {
  const today = todayIsoDate();
  return { from: addDays(today, -7), to: addDays(today, 21) };
}
