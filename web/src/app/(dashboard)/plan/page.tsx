"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { loadSession } from "@/lib/auth";
import * as backend from "@/lib/backendClient";
import { addDays, todayIsoDate, formatGermanDate, mondayOfWeek, formatShortDate } from "@/lib/date";
import { LessonsView } from "@/components/LessonsView";
import { WeekView } from "@/components/WeekView";
import { EmptyState } from "@/components/EmptyState";
import { IconCalendarOff, IconAlertTriangle } from "@/components/icons";
import { Card } from "@/components/Card";
import type { Lesson } from "@/lib/types";

type ViewMode = "tag" | "woche";

export default function PlanPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("tag");
  const [date, setDate] = useState(todayIsoDate());
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const weekStart = mondayOfWeek(date);
  const weekEnd = addDays(weekStart, 6);
  const [from, to] = viewMode === "woche" ? [weekStart, weekEnd] : [date, date];

  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    setLessons(null);
    setError(null);
    backend.fetchLessons(session.schoolId, session.username, session.password, from, to, session.selectedClassName ?? undefined).then((result) => {
      if (result.ok && result.data) {
        setLessons([...result.data.lessons].sort((a, b) => a.date.localeCompare(b.date) || (a.period ?? 0) - (b.period ?? 0)));
      } else {
        setError(result.error ?? "Stundenplan konnte nicht geladen werden.");
      }
    });
  }, [from, to]);

  const isToday = date === todayIsoDate();
  const isThisWeek = weekStart === mondayOfWeek(todayIsoDate());
  const step = viewMode === "woche" ? 7 : 1;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-lg)", flexWrap: "wrap", gap: "var(--space-md)" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Plan</h1>
          <p style={{ color: "var(--color-text-secondary)", marginTop: 4 }}>
            {viewMode === "woche" ? `${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)}` : formatGermanDate(date)}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, background: "var(--color-elevated-surface)", padding: 4, borderRadius: "var(--radius-md)" }}>
            <button onClick={() => setViewMode("tag")} style={modeButtonStyle(viewMode === "tag")}>
              Tag
            </button>
            <button onClick={() => setViewMode("woche")} style={modeButtonStyle(viewMode === "woche")}>
              Woche
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
            <button onClick={() => setDate(addDays(date, -step))} style={navButtonStyle} aria-label="Zurück">
              ←
            </button>
            <button
              onClick={() => setDate(todayIsoDate())}
              style={todayButtonStyle(viewMode === "woche" ? isThisWeek : isToday)}
              disabled={viewMode === "woche" ? isThisWeek : isToday}
            >
              {viewMode === "woche" ? "Diese Woche" : "Heute"}
            </button>
            <button onClick={() => setDate(addDays(date, step))} style={navButtonStyle} aria-label="Vor">
              →
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <Card>
          <EmptyState icon={<IconAlertTriangle />} title="Stundenplan konnte nicht geladen werden" description={error} tone="danger" />
        </Card>
      ) : null}

      {lessons === null && !error ? <p style={{ color: "var(--color-text-secondary)" }}>Lädt…</p> : null}

      {lessons && lessons.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconCalendarOff />}
            title={viewMode === "woche" ? "Kein Unterricht in dieser Woche" : "Kein Unterricht an diesem Tag"}
            description="Für diesen Zeitraum ist nichts eingetragen - z. B. Wochenende oder Ferien."
          />
        </Card>
      ) : null}

      {lessons && lessons.length > 0 && viewMode === "tag" ? <LessonsView lessons={lessons} highlightCurrent={isToday} /> : null}

      {lessons && lessons.length > 0 && viewMode === "woche" ? (
        <WeekView
          weekStart={weekStart}
          lessons={lessons}
          onDaySelect={(selected) => {
            setDate(selected);
            setViewMode("tag");
          }}
        />
      ) : null}
    </div>
  );
}

const navButtonStyle: CSSProperties = {
  background: "var(--color-elevated-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "10px 14px",
  color: "var(--color-text)",
  fontSize: 16,
};

function todayButtonStyle(disabled: boolean): CSSProperties {
  return {
    background: "none",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "10px 14px",
    color: disabled ? "var(--color-muted)" : "var(--color-accent)",
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
    whiteSpace: "nowrap",
  };
}

function modeButtonStyle(active: boolean): CSSProperties {
  return {
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding: "8px 16px",
    background: active ? "var(--color-card)" : "transparent",
    color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
    fontWeight: 700,
    fontSize: 13,
    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
  };
}
