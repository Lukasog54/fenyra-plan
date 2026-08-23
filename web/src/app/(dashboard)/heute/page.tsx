"use client";

import { useEffect, useState } from "react";
import { loadSession } from "@/lib/auth";
import * as backend from "@/lib/backendClient";
import { todayIsoDate, formatGermanDate, nowHHmm } from "@/lib/date";
import { groupParallelLessons } from "@/lib/lessonGroups";
import { LessonsTable } from "@/components/LessonsTable";
import { NextLessonCard } from "@/components/NextLessonCard";
import { TimelineLessonRow } from "@/components/TimelineLessonRow";
import { EmptyState } from "@/components/EmptyState";
import { IconCalendarOff, IconAlertTriangle } from "@/components/icons";
import { Card } from "@/components/Card";
import type { Lesson } from "@/lib/types";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Guten Morgen";
  if (hour < 17) return "Guten Tag";
  return "Guten Abend";
}

export default function HeutePage() {
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    const today = todayIsoDate();
    backend.fetchLessons(session.schoolId, session.username, session.password, today, today, session.selectedClassName ?? undefined).then((result) => {
      if (result.ok && result.data) {
        setLessons([...result.data.lessons].sort((a, b) => (a.period ?? 0) - (b.period ?? 0)));
      } else {
        setError(result.error ?? "Stundenplan konnte nicht geladen werden.");
      }
    });
  }, []);

  const now = nowHHmm();
  const upcoming = (lessons ?? []).filter((l) => (l.endTime || l.startTime) >= now);
  const upcomingGroups = groupParallelLessons(upcoming);
  const nextGroup = upcomingGroups[0];
  const restOfDayGroups = upcomingGroups.slice(1);
  const isCurrentlyHappening = nextGroup?.some((l) => Boolean(l.startTime) && l.startTime <= now) ?? false;

  return (
    <div>
      {/* Desktop: kompakte Kopfzeile + Tabelle. */}
      <div className="desktop-only" style={{ marginBottom: "var(--space-xl)" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Heute</h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 4 }}>{formatGermanDate(todayIsoDate())}</p>
      </div>

      {/* Mobile: 1:1 wie die App - Begrüßung, "nächste Stunde"-Karte, "Rest des Tages". */}
      <div className="mobile-only" style={{ marginBottom: "var(--space-xl)" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5 }}>{greeting()}</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-xl)" }}>{formatGermanDate(todayIsoDate())}</p>

        {lessons && nextGroup ? (
          <div style={{ marginBottom: "var(--space-xl)" }}>
            <NextLessonCard lessons={nextGroup} isCurrent={isCurrentlyHappening} />
          </div>
        ) : null}

        {restOfDayGroups.length > 0 ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--color-text-secondary)", marginBottom: "var(--space-md)" }}>
              REST DES TAGES
            </div>
            {restOfDayGroups.map((group) => (
              <TimelineLessonRow key={group.map((l) => l.id).join("+")} lessons={group} />
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <Card>
          <EmptyState icon={<IconAlertTriangle />} title="Stundenplan konnte nicht geladen werden" description={error} tone="danger" />
        </Card>
      ) : null}

      {lessons === null && !error ? <p style={{ color: "var(--color-text-secondary)" }}>Lädt…</p> : null}

      {lessons && lessons.length === 0 ? (
        <Card>
          <EmptyState icon={<IconCalendarOff />} title="Heute keine Stunden" description="Für heute ist kein Unterricht eingetragen - schau im Plan nach anderen Tagen." />
        </Card>
      ) : null}

      {lessons && lessons.length > 0 ? (
        <div className="desktop-only">
          <Card style={{ padding: 0, overflowX: "auto" }}>
            <LessonsTable lessons={lessons} highlightCurrent />
          </Card>
        </div>
      ) : null}
    </div>
  );
}
