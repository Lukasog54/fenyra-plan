import React from "react";
import { screen } from "@testing-library/react-native";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { SubstitutionList } from "../../../src/components/vertretungen/SubstitutionList";
import type { Lesson } from "../../../src/data/models/Lesson";

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: "l1",
    date: "2026-08-24",
    startTime: "08:00",
    endTime: "08:45",
    period: 1,
    className: "10a",
    subject: "Mathematik",
    status: "cancelled",
    ...overrides,
  };
}

describe("SubstitutionList", () => {
  it("shows the never-synced message when there are no groups and neverSynced is true", async () => {
    await renderWithProviders(<SubstitutionList groups={[]} neverSynced />);
    expect(screen.getByText("Noch keine Daten - bitte synchronisieren.")).toBeTruthy();
  });

  it("shows the generic empty message when there are no groups and neverSynced is false", async () => {
    await renderWithProviders(<SubstitutionList groups={[]} />);
    expect(screen.getByText("Keine Vertretungen im ausgewählten Zeitraum.")).toBeTruthy();
  });

  it("renders one item per group and a date heading per distinct date", async () => {
    const groups: Lesson[][] = [
      [makeLesson({ id: "a1", date: "2026-08-24", className: "10a" })],
      [makeLesson({ id: "b1", date: "2026-08-25", className: "10b" })],
    ];
    await renderWithProviders(<SubstitutionList groups={groups} />);
    expect(screen.getByText("10a")).toBeTruthy();
    expect(screen.getByText("10b")).toBeTruthy();
  });

  it("groups multiple lesson-groups under a single date heading when dates match", async () => {
    const groups: Lesson[][] = [
      [makeLesson({ id: "a1", date: "2026-08-24", className: "10a", period: 1 })],
      [makeLesson({ id: "a2", date: "2026-08-24", className: "10b", period: 2 })],
    ];
    await renderWithProviders(<SubstitutionList groups={groups} />);
    // Monday heading (2026-08-24 is a Monday) should appear exactly once even though there
    // are two groups on that date.
    expect(screen.getAllByText(/Montag/).length).toBe(1);
    expect(screen.getByText("10a")).toBeTruthy();
    expect(screen.getByText("10b")).toBeTruthy();
  });

  it("sorts date headings chronologically", async () => {
    const groups: Lesson[][] = [
      [makeLesson({ id: "later", date: "2026-08-26", className: "later-class" })],
      [makeLesson({ id: "earlier", date: "2026-08-24", className: "earlier-class" })],
    ];
    const { toJSON } = await renderWithProviders(<SubstitutionList groups={groups} />);
    const rendered = JSON.stringify(toJSON());
    expect(rendered.indexOf("earlier-class")).toBeLessThan(rendered.indexOf("later-class"));
  });

  it("renders a parallel-group item when a group has more than one lesson", async () => {
    const groups: Lesson[][] = [
      [
        makeLesson({ id: "p1", date: "2026-08-24", status: "cancelled" }),
        makeLesson({ id: "p2", date: "2026-08-24", status: "normal" }),
      ],
    ];
    await renderWithProviders(<SubstitutionList groups={groups} />);
    expect(screen.getByText("2 parallele Gruppen")).toBeTruthy();
  });
});
