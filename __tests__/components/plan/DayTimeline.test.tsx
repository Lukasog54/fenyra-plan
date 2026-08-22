import React from "react";
import { screen } from "@testing-library/react-native";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { DayTimeline } from "../../../src/components/plan/DayTimeline";
import type { Lesson } from "../../../src/data/models/Lesson";

function makeLesson(overrides: Partial<Lesson>): Lesson {
  return {
    id: `l_${Math.random()}`,
    date: "2026-08-17",
    startTime: "08:00",
    endTime: "08:45",
    period: 1,
    className: "10a",
    subject: "Mathe",
    status: "normal",
    sourceId: "test",
    ...overrides,
  };
}

describe("DayTimeline", () => {
  it("shows the 'never synced' empty state when there are no lessons and neverSynced is true", async () => {
    await renderWithProviders(<DayTimeline lessons={[]} neverSynced />);
    expect(screen.getByText("Noch keine Daten - bitte synchronisieren.")).toBeTruthy();
  });

  it("shows the generic empty state when there are no lessons and neverSynced is false", async () => {
    await renderWithProviders(<DayTimeline lessons={[]} />);
    expect(screen.getByText("Keine Stunden an diesem Tag.")).toBeTruthy();
  });

  it("renders one row per lesson when none are parallel", async () => {
    await renderWithProviders(
      <DayTimeline
        lessons={[
          makeLesson({ id: "a", subject: "Mathe", period: 1 }),
          makeLesson({ id: "b", subject: "Deutsch", period: 2 }),
        ]}
      />
    );

    expect(screen.getByText("Mathe")).toBeTruthy();
    expect(screen.getByText("Deutsch")).toBeTruthy();
  });

  it("groups parallel lessons (same date+className+period) into a single row", async () => {
    const a = makeLesson({ id: "a", subject: "Sport", period: 3, className: "10a", course: "SpJ" });
    const b = makeLesson({ id: "b", subject: "Sport", period: 3, className: "10a", course: "SpM" });
    await renderWithProviders(<DayTimeline lessons={[a, b]} />);

    // Both parallel lessons show up, and the row heading reflects the group count.
    expect(screen.getByText("2 PARALLELE GRUPPEN")).toBeTruthy();
  });

  it("keeps lessons from different classes at the same period as separate rows", async () => {
    const a = makeLesson({ id: "a", subject: "Mathe", period: 1, className: "10a" });
    const b = makeLesson({ id: "b", subject: "Englisch", period: 1, className: "10b" });
    await renderWithProviders(<DayTimeline lessons={[a, b]} />);

    expect(screen.getByText("Mathe")).toBeTruthy();
    expect(screen.getByText("Englisch")).toBeTruthy();
    expect(screen.queryByText(/PARALLELE GRUPPEN/)).toBeNull();
  });
});
