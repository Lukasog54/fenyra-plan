import React from "react";
import { screen, fireEvent } from "@testing-library/react-native";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { resetStores } from "../../../test-utils/resetStores";
import { WeekTimeline } from "../../../src/components/plan/WeekTimeline";
import { useUiStore } from "../../../src/stores/useUiStore";
import type { Lesson } from "../../../src/data/models/Lesson";

// Monday of the week used across these tests.
const WEEK_START = "2026-08-17";

function makeLesson(overrides: Partial<Lesson>): Lesson {
  return {
    id: `l_${Math.random()}`,
    date: WEEK_START,
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

describe("WeekTimeline", () => {
  beforeEach(() => {
    resetStores();
  });

  it("shows the 'never synced' empty state when there are no lessons and neverSynced is true", async () => {
    await renderWithProviders(<WeekTimeline weekStart={WEEK_START} lessons={[]} neverSynced />);
    expect(screen.getByText("Noch keine Daten - bitte synchronisieren.")).toBeTruthy();
  });

  it("shows the generic empty state when there are no lessons and neverSynced is false", async () => {
    await renderWithProviders(<WeekTimeline weekStart={WEEK_START} lessons={[]} />);
    expect(screen.getByText("Keine Stunden in dieser Woche.")).toBeTruthy();
  });

  it("renders weekday header labels for all five school days", async () => {
    await renderWithProviders(<WeekTimeline weekStart={WEEK_START} lessons={[makeLesson({})]} />);

    // 2026-08-17 is a Monday, so the week runs Mon-Fri.
    expect(screen.getByText("Mo")).toBeTruthy();
    expect(screen.getByText("Di")).toBeTruthy();
    expect(screen.getByText("Mi")).toBeTruthy();
    expect(screen.getByText("Do")).toBeTruthy();
    expect(screen.getByText("Fr")).toBeTruthy();
  });

  it("renders a subject cell for a lesson placed via buildWeekGrid", async () => {
    await renderWithProviders(
      <WeekTimeline weekStart={WEEK_START} lessons={[makeLesson({ subject: "Physik", period: 2 })]} />
    );
    expect(screen.getByText("Physik")).toBeTruthy();
  });

  it("shows a +N suffix on the cell when a period has a parallel group", async () => {
    const a = makeLesson({ id: "a", subject: "Sport", period: 3, course: "SpJ" });
    const b = makeLesson({ id: "b", subject: "Sport", period: 3, course: "SpM" });
    await renderWithProviders(<WeekTimeline weekStart={WEEK_START} lessons={[a, b]} />);

    expect(screen.getByText("Sport +1")).toBeTruthy();
  });

  it("updates useUiStore's selectedDate and viewMode when a filled cell is tapped", async () => {
    await renderWithProviders(
      <WeekTimeline weekStart={WEEK_START} lessons={[makeLesson({ subject: "Mathe", period: 1, date: WEEK_START })]} />
    );

    fireEvent.press(screen.getByText("Mathe"));

    expect(useUiStore.getState().selectedDate).toBe(WEEK_START);
    expect(useUiStore.getState().viewMode).toBe("day");
  });

  it("does not render a subject in an empty cell for a day with no lesson at that period", async () => {
    // Only Monday has a lesson at period 1; Tuesday-Friday cells for period 1 should stay empty.
    await renderWithProviders(
      <WeekTimeline weekStart={WEEK_START} lessons={[makeLesson({ subject: "Mathe", period: 1, date: WEEK_START })]} />
    );

    expect(screen.getAllByText("Mathe")).toHaveLength(1);
  });
});
