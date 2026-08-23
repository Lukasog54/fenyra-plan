import type { Lesson } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { PulsingDot } from "./PulsingDot";
import { IconPerson, IconLocation } from "./icons";
import { describeLessonChanges } from "@/lib/lessonDiff";
import { todayIsoDate, nowHHmm } from "@/lib/date";

function isLessonNow(lesson: Lesson, today: string, now: string): boolean {
  return lesson.date === today && Boolean(lesson.startTime) && Boolean(lesson.endTime) && lesson.startTime <= now && now < lesson.endTime;
}

function LessonBlock({ lesson, isParallel, isNow }: { lesson: Lesson; isParallel: boolean; isNow: boolean }) {
  const isCancelled = lesson.status === "cancelled";
  const isChanged = lesson.status !== "normal";
  const diffs = describeLessonChanges(lesson);
  const accentColor = isNow ? "var(--color-accent)" : isChanged ? "var(--color-warning)" : "var(--color-border)";

  return (
    <div
      className={isNow ? "timeline-content is-now" : "timeline-content"}
      style={{ borderColor: accentColor }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="timeline-period-badge">{lesson.period !== undefined ? String(lesson.period).padStart(2, "0") : "–"}</span>
          {isParallel ? (
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--color-muted)" }}>
              {lesson.course ?? "Parallelgruppe"}
            </span>
          ) : null}
        </div>
        {isNow ? (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <PulsingDot color="var(--color-accent)" size={6} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "var(--color-accent)" }}>JETZT</span>
          </span>
        ) : null}
      </div>

      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          marginTop: 6,
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
        {lesson.course ? (
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{lesson.course}</span>
        ) : null}
      </div>

      {diffs.map((diff) => (
        <div key={diff.label} style={{ fontSize: 13, fontWeight: 600, color: "var(--color-warning)", marginTop: 4 }}>
          {diff.label}: {diff.from} → {diff.to}
        </div>
      ))}
      {lesson.note ? <div style={{ fontSize: 13, fontStyle: "italic", color: "var(--color-text-secondary)", marginTop: 4 }}>{lesson.note}</div> : null}

      <div style={{ marginTop: 8 }}>
        <StatusBadge status={lesson.status} />
      </div>
    </div>
  );
}

/** 1:1-Portierung von mobile/src/components/plan/TimelineLessonRow.tsx - Zeitspalte (Uhrzeit + Punkt +
 * Linie) links, Inhalts-Karte rechts. Verwendet fuer Heutes "Rest des Tages" und Plans Tagesansicht. */
export function TimelineLessonRow({ lessons }: { lessons: Lesson[] }) {
  const today = todayIsoDate();
  const now = nowHHmm();
  const first = lessons[0];
  const isParallel = lessons.length > 1;
  const isNowAny = lessons.some((l) => isLessonNow(l, today, now));
  const anyChanged = lessons.some((l) => l.status !== "normal");
  const dotColor = isNowAny ? "var(--color-accent)" : anyChanged ? "var(--color-warning)" : "var(--color-border)";

  return (
    <div style={{ display: "flex", marginBottom: 4 }}>
      <div style={{ width: 52, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>{first.startTime}</span>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: dotColor, margin: "8px 0" }} />
        <span style={{ flex: 1, width: 1, minHeight: 24, background: "var(--color-border)" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {isParallel ? (
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--color-text-secondary)" }}>
            {lessons.length} PARALLELE GRUPPEN
          </div>
        ) : null}
        {lessons.map((lesson) => (
          <LessonBlock key={lesson.id} lesson={lesson} isParallel={isParallel} isNow={isLessonNow(lesson, today, now)} />
        ))}
      </div>
    </div>
  );
}
