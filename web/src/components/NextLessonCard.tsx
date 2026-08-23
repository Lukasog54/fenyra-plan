import type { Lesson } from "@/lib/types";
import { Card } from "./Card";
import { StatusBadge } from "./StatusBadge";
import { PulsingDot } from "./PulsingDot";
import { IconPerson, IconLocation, IconPlayCircle, IconArrowForwardCircle } from "./icons";
import { describeLessonChanges } from "@/lib/lessonDiff";

/** 1:1-Portierung von mobile/src/components/heute/NextLessonCard.tsx - "NÄCHSTE STUNDE"/"JETZT"-Karte
 * oben auf der Heute-Seite. Nur mobil verwendet (Desktop hat die Tabellen-Ansicht). */
export function NextLessonCard({ lessons, isCurrent = false }: { lessons: Lesson[]; isCurrent?: boolean }) {
  const first = lessons[0];
  const isParallel = lessons.length > 1;

  return (
    <Card glowing={isCurrent} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isCurrent ? <PulsingDot color="var(--color-accent)" size={6} /> : null}
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--color-accent)" }}>
            {isCurrent ? "JETZT" : "NÄCHSTE STUNDE"}
          </span>
        </div>
        <span style={{ color: "var(--color-accent)" }}>{isCurrent ? <IconPlayCircle /> : <IconArrowForwardCircle />}</span>
      </div>

      <div style={{ fontSize: 15, color: "var(--color-text-secondary)" }}>
        {first.startTime}
        {first.endTime ? ` – ${first.endTime}` : ""}
        {first.period !== undefined ? `  ·  ${first.period}. Stunde` : ""}
        {isParallel ? `  ·  ${lessons.length} parallele Gruppen` : ""}
      </div>

      {lessons.map((lesson, index) => {
        const isCancelled = lesson.status === "cancelled";
        const diffs = describeLessonChanges(lesson);
        return (
          <div
            key={lesson.id}
            style={index > 0 ? { marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border)" } : undefined}
          >
            {isParallel ? (
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 2 }}>
                {lesson.course ?? "Parallelgruppe"}
              </div>
            ) : null}
            <div
              style={{
                fontSize: isParallel ? 18 : 28,
                fontWeight: 800,
                color: isCancelled ? "var(--color-danger)" : "var(--color-text)",
                textDecoration: isCancelled ? "line-through" : "none",
              }}
            >
              {lesson.subject ?? "Unbekanntes Fach"}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
              {lesson.teacher ? (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--color-text-secondary)" }}>
                  <IconPerson /> {lesson.teacher}
                </span>
              ) : null}
              {lesson.room ? (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--color-text-secondary)" }}>
                  <IconLocation /> Raum {lesson.room}
                </span>
              ) : null}
            </div>

            {diffs.map((diff) => (
              <div key={diff.label} style={{ fontSize: 13, fontWeight: 600, color: "var(--color-warning)", marginTop: 4 }}>
                {diff.label}: {diff.from} → {diff.to}
              </div>
            ))}

            <div style={{ marginTop: 8 }}>
              <StatusBadge status={lesson.status} />
            </div>
          </div>
        );
      })}
    </Card>
  );
}
