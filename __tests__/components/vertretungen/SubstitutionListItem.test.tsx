import React from "react";
import { screen } from "@testing-library/react-native";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { SubstitutionListItem } from "../../../src/components/vertretungen/SubstitutionListItem";
import type { Lesson, LessonStatus } from "../../../src/data/models/Lesson";

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: "l1",
    date: "2026-08-24",
    startTime: "08:00",
    endTime: "08:45",
    period: 1,
    className: "10a",
    subject: "Mathematik",
    status: "normal",
    ...overrides,
  };
}

describe("SubstitutionListItem", () => {
  it("renders className and period", async () => {
    await renderWithProviders(<SubstitutionListItem lessons={[makeLesson()]} />);
    expect(screen.getByText("10a")).toBeTruthy();
    expect(screen.getByText("1. Stunde")).toBeTruthy();
  });

  it("falls back to 'Unbekanntes Fach' when no subject is set", async () => {
    await renderWithProviders(<SubstitutionListItem lessons={[makeLesson({ subject: undefined })]} />);
    expect(screen.getByText("Unbekanntes Fach")).toBeTruthy();
  });

  it("shows 'Unterricht entfällt.' and no diffs for a cancelled lesson", async () => {
    await renderWithProviders(
      <SubstitutionListItem
        lessons={[makeLesson({ status: "cancelled", originalRoom: "A101", room: "A101" })]}
      />
    );
    expect(screen.getByText("AUSFALL")).toBeTruthy();
    expect(screen.getByText("Unterricht entfällt.")).toBeTruthy();
  });

  it.each<[LessonStatus, string]>([
    ["substitution", "VERTRETUNG"],
    ["room-change", "VERTRETUNG"],
    ["teacher-change", "VERTRETUNG"],
    ["subject-change", "VERTRETUNG"],
    ["moved", "VERLEGT"],
    ["unknown", "ÄNDERUNG"],
    ["normal", "REGULÄR"],
  ])("renders the '%s' status label as '%s'", async (status, label) => {
    await renderWithProviders(<SubstitutionListItem lessons={[makeLesson({ status })]} />);
    expect(screen.getByText(label)).toBeTruthy();
  });

  it("renders a from -> to diff row when a tracked field actually changed", async () => {
    const { toJSON } = await renderWithProviders(
      <SubstitutionListItem
        lessons={[makeLesson({ status: "room-change", originalRoom: "A101", room: "B202" })]}
      />
    );
    const rendered = JSON.stringify(toJSON());
    expect(rendered).toContain("Raum");
    expect(rendered).toContain("A101");
    expect(rendered).toContain("B202");
  });

  it("shows a note when present", async () => {
    await renderWithProviders(<SubstitutionListItem lessons={[makeLesson({ note: "Bitte Material mitbringen" })]} />);
    expect(screen.getByText("Bitte Material mitbringen")).toBeTruthy();
  });

  it("does not show the parallel-group heading for a single lesson", async () => {
    await renderWithProviders(<SubstitutionListItem lessons={[makeLesson()]} />);
    expect(screen.queryByText(/parallele Gruppen/)).toBeNull();
  });

  it("shows the parallel-group heading and each course label for multiple parallel lessons", async () => {
    await renderWithProviders(
      <SubstitutionListItem
        lessons={[
          makeLesson({ id: "l1", status: "cancelled", course: "Sport A" }),
          makeLesson({ id: "l2", status: "normal", course: "Sport B" }),
        ]}
      />
    );
    expect(screen.getByText("2 parallele Gruppen")).toBeTruthy();
    expect(screen.getByText(/Sport A/)).toBeTruthy();
    expect(screen.getByText(/Sport B/)).toBeTruthy();
  });

  it("falls back to 'Parallelgruppe' label when a parallel lesson has no course name", async () => {
    await renderWithProviders(
      <SubstitutionListItem
        lessons={[makeLesson({ id: "l1", course: undefined }), makeLesson({ id: "l2", course: undefined })]}
      />
    );
    expect(screen.getAllByText(/Parallelgruppe/).length).toBeGreaterThan(0);
  });
});
