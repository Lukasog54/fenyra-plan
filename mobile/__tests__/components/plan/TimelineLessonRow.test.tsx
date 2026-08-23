import React from "react";
import { screen } from "@testing-library/react-native";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { TimelineLessonRow } from "../../../src/components/plan/TimelineLessonRow";
import { todayIsoDate } from "../../../src/utils/date";
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

describe("TimelineLessonRow", () => {
  it("renders subject, period, teacher and room for a single lesson", async () => {
    await renderWithProviders(
      <TimelineLessonRow
        lessons={[makeLesson({ subject: "Deutsch", period: 4, teacher: "Frau Muller", room: "204" })]}
      />
    );

    expect(screen.getByText("Deutsch")).toBeTruthy();
    expect(screen.getByText("04")).toBeTruthy();
    expect(screen.getByText("Frau Muller")).toBeTruthy();
    expect(screen.getByText("Raum 204")).toBeTruthy();
  });

  it("shows a dash placeholder when a lesson has no period", async () => {
    await renderWithProviders(<TimelineLessonRow lessons={[makeLesson({ period: undefined })]} />);
    expect(screen.getByText("–")).toBeTruthy();
  });

  it("strikes through the subject and shows a status badge when cancelled", async () => {
    await renderWithProviders(<TimelineLessonRow lessons={[makeLesson({ subject: "Physik", status: "cancelled" })]} />);

    const subject = screen.getByText("Physik");
    const flatStyle = Array.isArray(subject.props.style) ? Object.assign({}, ...subject.props.style) : subject.props.style;
    expect(flatStyle.textDecorationLine).toBe("line-through");
    expect(screen.getByText("Fällt aus")).toBeTruthy();
  });

  it("shows the JETZT indicator when the lesson is happening right now today", async () => {
    // Spans the whole day so "now" always falls inside it, regardless of the current hour -
    // avoids a midnight-wraparound flake from picking a narrower window.
    const today = todayIsoDate();

    await renderWithProviders(
      <TimelineLessonRow lessons={[makeLesson({ date: today, startTime: "00:00", endTime: "23:59" })]} />
    );

    expect(screen.getByText("JETZT")).toBeTruthy();
  });

  it("does not show the JETZT indicator for a lesson on a different day", async () => {
    await renderWithProviders(
      <TimelineLessonRow lessons={[makeLesson({ date: "2020-01-01", startTime: "00:00", endTime: "23:59" })]} />
    );

    expect(screen.queryByText("JETZT")).toBeNull();
  });

  it("shows a parallel-groups heading and course label when given more than one lesson", async () => {
    const a = makeLesson({ id: "a", subject: "Sport", course: "SpJ" });
    const b = makeLesson({ id: "b", subject: "Sport", course: "SpM" });
    await renderWithProviders(<TimelineLessonRow lessons={[a, b]} />);

    expect(screen.getByText("2 PARALLELE GRUPPEN")).toBeTruthy();
    // "SpJ"/"SpM" each appear twice: once as the parallel-group label, once again in the lesson's
    // own meta row (which also shows `course`) - so assert presence via getAllByText, not getByText.
    expect(screen.getAllByText("SpJ").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SpM").length).toBeGreaterThan(0);
  });

  it("does not show a parallel-groups heading for a single lesson", async () => {
    await renderWithProviders(<TimelineLessonRow lessons={[makeLesson({})]} />);
    expect(screen.queryByText(/PARALLELE GRUPPEN/)).toBeNull();
  });

  it("renders a diff line for a changed field", async () => {
    await renderWithProviders(
      <TimelineLessonRow lessons={[makeLesson({ originalTeacher: "Herr Schmidt", teacher: "Frau Muller" })]} />
    );
    expect(screen.getByText("Lehrer: Herr Schmidt → Frau Muller")).toBeTruthy();
  });

  it("renders the note text when present", async () => {
    await renderWithProviders(<TimelineLessonRow lessons={[makeLesson({ note: "Bitte Turnhalle 2 nutzen" })]} />);
    expect(screen.getByText("Bitte Turnhalle 2 nutzen")).toBeTruthy();
  });

  it("does not render a note when absent", async () => {
    await renderWithProviders(<TimelineLessonRow lessons={[makeLesson({ note: undefined })]} />);
    // No note text should be present; nothing specific to assert beyond no crash + no stray text node.
    expect(screen.queryByText("undefined")).toBeNull();
  });
});
