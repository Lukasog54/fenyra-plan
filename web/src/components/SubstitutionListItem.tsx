import type { Lesson, LessonStatus } from "@/lib/types";
import { Card } from "./Card";
import { describeLessonChanges } from "@/lib/lessonDiff";
import { IconCheckCircle, IconCloseCircleFilled, IconFlashFilled, IconArrowRedoOutline, IconHelpCircleOutline } from "./icons";

const STATUS_META: Record<LessonStatus, { label: string; Icon: (props: { size?: number }) => React.JSX.Element; colorVar: string }> = {
  normal: { label: "Regulär", Icon: IconCheckCircle, colorVar: "var(--color-muted)" },
  cancelled: { label: "Ausfall", Icon: IconCloseCircleFilled, colorVar: "var(--color-danger)" },
  substitution: { label: "Vertretung", Icon: IconFlashFilled, colorVar: "var(--color-warning)" },
  "room-change": { label: "Vertretung", Icon: IconFlashFilled, colorVar: "var(--color-warning)" },
  "teacher-change": { label: "Vertretung", Icon: IconFlashFilled, colorVar: "var(--color-warning)" },
  "subject-change": { label: "Vertretung", Icon: IconFlashFilled, colorVar: "var(--color-warning)" },
  moved: { label: "Verlegt", Icon: IconArrowRedoOutline, colorVar: "var(--color-violet)" },
  unknown: { label: "Änderung", Icon: IconHelpCircleOutline, colorVar: "var(--color-muted)" },
};

function LessonEntry({ lesson, isParallel }: { lesson: Lesson; isParallel: boolean }) {
  const meta = STATUS_META[lesson.status];
  const diffs = describeLessonChanges(lesson);

  return (
    <div style={isParallel ? { marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--color-border)" } : undefined}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: meta.colorVar }}>
        <meta.Icon />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>{meta.label.toUpperCase()}</span>
        {isParallel ? (
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-muted)" }}>· {lesson.course ?? "Parallelgruppe"}</span>
        ) : null}
      </div>

      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          marginTop: 4,
          color: "var(--color-text)",
          textDecoration: lesson.status === "cancelled" ? "line-through" : "none",
        }}
      >
        {lesson.subject ?? "Unbekanntes Fach"}
      </div>

      {lesson.status === "cancelled" ? (
        <p style={{ fontSize: 15, color: "var(--color-text-secondary)", marginTop: 4 }}>Unterricht entfällt.</p>
      ) : (
        diffs.map((diff) => (
          <div key={diff.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--color-muted)" }}>{diff.label}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)" }}>
              {diff.from} <span style={{ color: meta.colorVar }}>→</span> {diff.to}
            </span>
          </div>
        ))
      )}

      {lesson.note ? <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--color-text-secondary)", marginTop: 4 }}>{lesson.note}</p> : null}
    </div>
  );
}

/** 1:1-Portierung von mobile/src/components/vertretungen/SubstitutionListItem.tsx. `lessons` ist
 * normalerweise ein einzelnes Element; bei parallelen Kurs-/Gruppen-Stunden enthaelt es alle, damit
 * klar ist, welche konkret betroffen ist. */
export function SubstitutionListItem({ lessons }: { lessons: Lesson[] }) {
  const first = lessons[0];
  const isParallel = lessons.length > 1;
  const primary = lessons.find((l) => l.status === "cancelled") ?? lessons.find((l) => l.status !== "normal") ?? first;
  const borderColor = STATUS_META[primary.status].colorVar;

  return (
    <Card style={{ marginBottom: "var(--space-md)", borderColor: `color-mix(in srgb, ${borderColor} 40%, var(--color-border))`, display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {first.className ? <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>{first.className}</span> : null}
        {first.period !== undefined ? <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{first.period}. Stunde</span> : null}
      </div>
      {isParallel ? (
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--color-text-secondary)" }}>{lessons.length} parallele Gruppen</div>
      ) : null}
      {lessons.map((lesson) => (
        <LessonEntry key={lesson.id} lesson={lesson} isParallel={isParallel} />
      ))}
    </Card>
  );
}
