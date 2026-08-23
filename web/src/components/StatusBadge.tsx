import { statusLabels, statusColorVar, type LessonStatus } from "@/lib/types";

/** Entspricht mobile/src/components/common/StatusBadge.tsx: getoentes Pill-Badge (Hintergrund ~12%,
 * Rand ~33% der Statusfarbe), nicht nur eine Umrandung. */
export function StatusBadge({ status }: { status: LessonStatus }) {
  if (status === "normal") return null;
  const color = statusColorVar[status];
  return (
    <span
      style={{
        display: "inline-block",
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
        borderRadius: "var(--radius-pill)",
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {statusLabels[status]}
    </span>
  );
}
