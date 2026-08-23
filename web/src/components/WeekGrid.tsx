import type { Lesson } from "@/lib/types";
import { weekdayShort, dayOfMonth, todayIsoDate } from "@/lib/date";
import { statusColorVar } from "@/lib/types";

/** Echtes Stundenraster (Wochentage als Spalten, Stunden als Zeilen) - der klassische
 * "Wochenplan"-Blick, den man von einem Stundenplan am PC erwartet. Nur Desktop (siehe WeekView). */
export function WeekGrid({ lessons }: { lessons: Lesson[] }) {
  const today = todayIsoDate();
  const days = [...new Set(lessons.map((l) => l.date))].sort();
  const periods = [...new Set(lessons.map((l) => l.period).filter((p): p is number => p != null))].sort((a, b) => a - b);

  const byCell = new Map<string, Lesson[]>();
  for (const lesson of lessons) {
    if (lesson.period == null) continue;
    const key = `${lesson.date}_${lesson.period}`;
    byCell.set(key, [...(byCell.get(key) ?? []), lesson]);
  }

  if (days.length === 0 || periods.length === 0) return null;

  return (
    <table className="week-grid">
      <thead>
        <tr>
          <th className="week-grid-period-col" />
          {days.map((day) => (
            <th key={day} className={day === today ? "is-today" : undefined}>
              <div>{weekdayShort(day)}</div>
              <div className="week-grid-daynum">{dayOfMonth(day)}</div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {periods.map((period) => (
          <tr key={period}>
            <td className="week-grid-period-col">{period}</td>
            {days.map((day) => {
              const cellLessons = byCell.get(`${day}_${period}`) ?? [];
              return (
                <td key={day} className={day === today ? "is-today" : undefined}>
                  {cellLessons.map((lesson) => (
                    <div key={lesson.id} className="week-cell-lesson" style={{ borderLeftColor: statusColorVar[lesson.status] }}>
                      <div
                        className="week-cell-subject"
                        style={{ textDecoration: lesson.status === "cancelled" ? "line-through" : "none" }}
                      >
                        {lesson.subject ?? "—"}
                      </div>
                      <div className="week-cell-room">{lesson.room ?? ""}</div>
                    </div>
                  ))}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
