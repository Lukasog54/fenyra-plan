import type { Lesson } from "@/lib/types";
import { addDays, weekdayShort, dayOfMonth, todayIsoDate } from "@/lib/date";
import { groupParallelLessons } from "@/lib/lessonGroups";
import { statusColorVar } from "@/lib/types";

/** Nur Montag-Freitag, wie WeekTimeline.tsx in der App ("kein Schulbetrieb am Wochenende"). */
const SCHOOL_WEEK_LENGTH = 5;

/**
 * 1:1-Portierung von mobile/src/components/plan/WeekTimeline.tsx fuer die Handy-Website: kompaktes
 * Raster statt einer Tagesliste - genau wie in der App zeigt jede Zelle nur Fach+Raum, ein Tap
 * springt in die volle Tagesansicht (siehe onDaySelect).
 */
export function WeekGridCompact({ weekStart, lessons, onDaySelect }: { weekStart: string; lessons: Lesson[]; onDaySelect: (date: string) => void }) {
  const today = todayIsoDate();
  const days = Array.from({ length: SCHOOL_WEEK_LENGTH }, (_, i) => addDays(weekStart, i));
  const periods = [...new Set(lessons.map((l) => l.period).filter((p): p is number => p != null))].sort((a, b) => a - b);

  const byCell = new Map<string, Lesson[][]>();
  for (const day of days) {
    const dayLessons = lessons.filter((l) => l.date === day);
    const groups = groupParallelLessons(dayLessons);
    for (const group of groups) {
      const period = group[0].period;
      if (period == null) continue;
      byCell.set(`${day}_${period}`, [...(byCell.get(`${day}_${period}`) ?? []), group]);
    }
  }

  if (periods.length === 0) return null;

  return (
    <table className="week-compact">
      <thead>
        <tr>
          <th className="week-compact-period" />
          {days.map((day) => (
            <th key={day} className={day === today ? "is-today" : undefined}>
              <div>{weekdayShort(day)}</div>
              <div className="week-compact-daynum">{dayOfMonth(day)}</div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {periods.map((period) => (
          <tr key={period}>
            <td className="week-compact-period">{period}</td>
            {days.map((day) => {
              const cellGroups = byCell.get(`${day}_${period}`) ?? [];
              const group = cellGroups[0];
              if (!group) {
                return <td key={day} />;
              }
              const primary = group[0];
              const extraCount = group.length - 1;
              const isCancelled = primary.status === "cancelled";
              const color = primary.status === "normal" ? "var(--color-text)" : statusColorVar[primary.status];
              return (
                <td key={day}>
                  <button className="week-compact-cell" onClick={() => onDaySelect(day)} type="button">
                    <span className="week-compact-subject" style={{ color, textDecoration: isCancelled ? "line-through" : "none" }}>
                      {primary.subject ?? "?"}
                      {extraCount > 0 ? ` +${extraCount}` : ""}
                    </span>
                    {primary.room ? <span className="week-compact-room">{primary.room}</span> : null}
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
