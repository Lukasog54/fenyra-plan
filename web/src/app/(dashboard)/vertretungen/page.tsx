"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { loadSession } from "@/lib/auth";
import * as backend from "@/lib/backendClient";
import { addDays, todayIsoDate, formatGermanDate, defaultSyncRange } from "@/lib/date";
import { groupParallelLessons } from "@/lib/lessonGroups";
import { LessonsTable } from "@/components/LessonsTable";
import { SubstitutionListItem } from "@/components/SubstitutionListItem";
import { EmptyState } from "@/components/EmptyState";
import { IconCheckCircle, IconAlertTriangle } from "@/components/icons";
import { Card } from "@/components/Card";
import type { Lesson, LessonStatus } from "@/lib/types";

type DateFilter = "today" | "tomorrow" | "custom" | "range";
type TypeFilterKey = Extract<LessonStatus, "cancelled" | "room-change" | "teacher-change" | "subject-change" | "moved">;

const TYPE_FILTERS: Array<{ key: TypeFilterKey; label: string }> = [
  { key: "cancelled", label: "Ausfälle" },
  { key: "room-change", label: "Raumänderungen" },
  { key: "teacher-change", label: "Lehreränderungen" },
  { key: "subject-change", label: "Fachänderungen" },
  { key: "moved", label: "Verlegungen" },
];

const DATE_FILTERS: Array<{ key: DateFilter; label: string }> = [
  { key: "today", label: "Heute" },
  { key: "tomorrow", label: "Morgen" },
  { key: "custom", label: "Datum" },
  { key: "range", label: "Zeitraum" },
];

/** Entspricht groupByDate() in mobile/src/components/vertretungen/SubstitutionList.tsx. */
function groupByDate(groups: Lesson[][]): Array<[string, Lesson[][]]> {
  const byDate = new Map<string, Lesson[][]>();
  for (const group of groups) {
    const date = group[0].date;
    byDate.set(date, [...(byDate.get(date) ?? []), group]);
  }
  return [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

export default function VertretungenPage() {
  const [onlyMyClass, setOnlyMyClass] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("range");
  const [customDate, setCustomDate] = useState(todayIsoDate());
  const [typeFilters, setTypeFilters] = useState<Set<TypeFilterKey>>(new Set());
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    if (dateFilter === "today") return { from: todayIsoDate(), to: todayIsoDate() };
    if (dateFilter === "tomorrow") {
      const tomorrow = addDays(todayIsoDate(), 1);
      return { from: tomorrow, to: tomorrow };
    }
    if (dateFilter === "custom") return { from: customDate, to: customDate };
    return defaultSyncRange();
  }, [dateFilter, customDate]);

  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    setLessons(null);
    setError(null);

    const className = onlyMyClass ? (session.selectedClassName ?? undefined) : undefined;

    backend.fetchLessons(session.schoolId, session.username, session.password, range.from, range.to, className).then((result) => {
      if (result.ok && result.data) {
        const sorted = [...result.data.lessons].sort((a, b) => a.date.localeCompare(b.date) || (a.period ?? 0) - (b.period ?? 0));
        const changed = groupParallelLessons(sorted)
          .filter((group) => group.some((l) => l.status !== "normal"))
          .flat();
        setLessons(changed);
      } else {
        setError(result.error ?? "Vertretungen konnten nicht geladen werden.");
      }
    });
  }, [onlyMyClass, range.from, range.to]);

  // Eine ganze Gruppe bleibt erhalten, wenn IRGENDEINE Lesson darin zum Typ-Filter passt - die
  // unbetroffene Parallelgruppe bleibt so als Kontext sichtbar (gleiche Logik wie in der App).
  const filteredLessons = useMemo(() => {
    if (!lessons) return null;
    if (typeFilters.size === 0) return lessons;
    const groups = groupParallelLessons(lessons).filter((group) => group.some((l) => typeFilters.has(l.status as TypeFilterKey)));
    return groups.flat();
  }, [lessons, typeFilters]);

  function toggleTypeFilter(key: TypeFilterKey) {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const groupsByDate = filteredLessons ? groupByDate(groupParallelLessons(filteredLessons)) : [];

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: "var(--space-lg)" }}>Vertretungen</h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", marginBottom: "var(--space-sm)" }}>
        <button onClick={() => setOnlyMyClass(true)} style={chipStyle(onlyMyClass)}>
          Meine Klasse
        </button>
        <button onClick={() => setOnlyMyClass(false)} style={chipStyle(!onlyMyClass)}>
          Alle Klassen
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", marginBottom: "var(--space-sm)" }}>
        {DATE_FILTERS.map((option) => (
          <button
            key={option.key}
            onClick={() => {
              if (option.key === "custom") setCustomDate(todayIsoDate());
              setDateFilter(option.key);
            }}
            style={chipStyle(dateFilter === option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {dateFilter === "custom" ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-md)", maxWidth: 360 }}>
          <button onClick={() => setCustomDate(addDays(customDate, -1))} style={navButtonStyle} aria-label="Vorheriger Tag">
            ←
          </button>
          <span style={{ fontWeight: 700, textTransform: "capitalize" }}>{formatGermanDate(customDate)}</span>
          <button onClick={() => setCustomDate(addDays(customDate, 1))} style={navButtonStyle} aria-label="Nächster Tag">
            →
          </button>
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", marginBottom: "var(--space-xl)" }}>
        {TYPE_FILTERS.map((option) => (
          <button key={option.key} onClick={() => toggleTypeFilter(option.key)} style={chipStyle(typeFilters.has(option.key))}>
            {option.label}
          </button>
        ))}
      </div>

      {error ? (
        <Card>
          <EmptyState icon={<IconAlertTriangle />} title="Vertretungen konnten nicht geladen werden" description={error} tone="danger" />
        </Card>
      ) : null}

      {filteredLessons === null && !error ? <p style={{ color: "var(--color-text-secondary)" }}>Lädt…</p> : null}

      {filteredLessons && filteredLessons.length === 0 ? (
        <Card>
          <EmptyState icon={<IconCheckCircle />} title="Keine Vertretungen" description="Im ausgewählten Zeitraum ist nichts geändert - alles läuft nach Plan." tone="success" />
        </Card>
      ) : null}

      {filteredLessons && filteredLessons.length > 0 ? (
        <>
          <div className="desktop-only">
            <Card style={{ padding: 0, overflowX: "auto" }}>
              <LessonsTable lessons={filteredLessons} showDate showClass={!onlyMyClass} />
            </Card>
          </div>
          <div className="mobile-only">
            {groupsByDate.map(([date, dateGroups]) => (
              <div key={date} style={{ marginBottom: "var(--space-lg)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: "var(--space-sm)" }}>
                  {formatGermanDate(date)}
                </div>
                {dateGroups.map((group) => (
                  <SubstitutionListItem key={group.map((l) => l.id).join("+")} lessons={group} />
                ))}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

const navButtonStyle: CSSProperties = {
  background: "var(--color-elevated-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "8px 14px",
  color: "var(--color-text)",
  fontSize: 16,
};

function chipStyle(active: boolean): CSSProperties {
  return {
    border: `1.5px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
    borderRadius: "var(--radius-pill)",
    padding: "8px 16px",
    background: active ? "color-mix(in srgb, var(--color-accent) 12%, transparent)" : "transparent",
    color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
    fontWeight: 600,
    fontSize: 13,
  };
}
