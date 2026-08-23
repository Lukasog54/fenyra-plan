import type { Lesson } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { formatGermanDate, todayIsoDate, nowHHmm } from "@/lib/date";
import { isCurrentLesson } from "@/lib/lessonGroups";

export interface LessonsViewProps {
  lessons: Lesson[];
  /** Zeigt eine Datumsspalte an (z.B. Vertretungen über mehrere Tage) statt implizit "heute/dieser Tag". */
  showDate?: boolean;
  /** Zeigt eine Klassenspalte an (z.B. "alle Klassen"-Filter bei Vertretungen). */
  showClass?: boolean;
  /** Hebt die gerade laufende Stunde hervor (nur sinnvoll für den heutigen Tag). */
  highlightCurrent?: boolean;
}

export function LessonsTable({ lessons, showDate = false, showClass = false, highlightCurrent = false }: LessonsViewProps) {
  const today = todayIsoDate();
  const now = nowHHmm();

  return (
    <table className="lessons-table">
      <thead>
        <tr>
          {showDate ? <th style={{ width: 140 }}>Datum</th> : null}
          <th style={{ width: 90 }}>Stunde</th>
          <th>Fach</th>
          <th>Lehrer</th>
          <th>Raum</th>
          {showClass ? <th style={{ width: 90 }}>Klasse</th> : null}
          <th style={{ width: 140 }}>Status</th>
        </tr>
      </thead>
      <tbody>
        {lessons.map((lesson) => {
          const isCancelled = lesson.status === "cancelled";
          const isCurrent = highlightCurrent && isCurrentLesson(lesson, today, now);
          return (
            <tr key={lesson.id} className={isCurrent ? "is-current" : undefined}>
              {showDate ? (
                <td data-label="Datum" style={{ color: "var(--color-text-secondary)" }}>
                  {formatGermanDate(lesson.date).split(",")[0]}
                </td>
              ) : null}
              <td data-label="Stunde">
                <div style={{ fontWeight: 700 }}>{lesson.period != null ? lesson.period : "—"}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{lesson.startTime}</div>
              </td>
              <td data-label="Fach">
                <div
                  style={{
                    fontWeight: 700,
                    textDecoration: isCancelled ? "line-through" : "none",
                    color: isCancelled ? "var(--color-text-secondary)" : "var(--color-text)",
                  }}
                >
                  {lesson.subject ?? "—"}
                </div>
                {lesson.note ? <div style={{ fontSize: 12, color: "var(--color-warning)", marginTop: 2 }}>{lesson.note}</div> : null}
              </td>
              <td data-label="Lehrer" style={{ color: "var(--color-text-secondary)" }}>
                {lesson.teacher ?? "—"}
              </td>
              <td data-label="Raum" style={{ color: "var(--color-text-secondary)" }}>
                {lesson.room ?? "—"}
              </td>
              {showClass ? (
                <td data-label="Klasse" style={{ color: "var(--color-text-secondary)" }}>
                  {lesson.className ?? "—"}
                </td>
              ) : null}
              <td data-label="Status">
                <StatusBadge status={lesson.status} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
