import type { CSSProperties, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  /** Entspricht Card.tsx (glowing) in der App: dezenter Akzent-Rand + Glow-Schatten fuer die
   * gerade laufende Stunde/einen aktiven Zustand. */
  glowing?: boolean;
}

export function Card({ children, style, glowing = false }: CardProps) {
  return (
    <div
      style={{
        background: "var(--color-card)",
        border: glowing ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-lg)",
        boxShadow: glowing ? "0 0 0 1px var(--color-glow), 0 8px 28px -8px var(--color-glow)" : "0 1px 2px rgba(0,0,0,0.06), 0 12px 32px -16px rgba(0,0,0,0.18)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
