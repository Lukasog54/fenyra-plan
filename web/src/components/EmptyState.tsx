import type { ReactNode } from "react";

/** Deutlich vollere, weniger "eine Zeile grauer Text"-artige Leer-/Fehlerdarstellung - Icon,
 * Überschrift, Beschreibung, mittig statt einer dünnen linksbündigen Karte. */
const TONE_COLOR: Record<"neutral" | "success" | "danger", string> = {
  neutral: "var(--color-accent)",
  success: "var(--color-success)",
  danger: "var(--color-danger)",
};

export function EmptyState({
  icon,
  title,
  description,
  tone = "neutral",
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  tone?: "neutral" | "success" | "danger";
}) {
  const color = TONE_COLOR[tone];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "56px var(--space-xl)" }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "var(--radius-lg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "var(--space-lg)",
          color,
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>{title}</div>
      {description ? (
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: "var(--space-sm)", maxWidth: 380, lineHeight: 1.5 }}>{description}</p>
      ) : null}
    </div>
  );
}
