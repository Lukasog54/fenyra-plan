import React from "react";
import { screen } from "@testing-library/react-native";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { NextLessonCard } from "../../../src/components/heute/NextLessonCard";
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

describe("NextLessonCard", () => {
  it("renders the subject, time and period of a normal lesson", async () => {
    await renderWithProviders(<NextLessonCard lessons={[makeLesson({ subject: "Mathe", period: 3 })]} />);

    expect(screen.getByText("Mathe")).toBeTruthy();
    expect(screen.getByText(/3\. Stunde/)).toBeTruthy();
  });

  it("shows NÄCHSTE STUNDE eyebrow when not current, and JETZT when current", async () => {
    const { rerender } = await renderWithProviders(<NextLessonCard lessons={[makeLesson({})]} />);
    expect(screen.getByText("NÄCHSTE STUNDE")).toBeTruthy();
    expect(screen.queryByText("JETZT")).toBeNull();

    await rerender(<NextLessonCard lessons={[makeLesson({})]} isCurrent />);
    expect(screen.getByText("JETZT")).toBeTruthy();
    expect(screen.queryByText("NÄCHSTE STUNDE")).toBeNull();
  });

  it("strikes through the subject and shows a status badge when cancelled", async () => {
    await renderWithProviders(
      <NextLessonCard lessons={[makeLesson({ subject: "Physik", status: "cancelled" })]} />
    );

    const subject = screen.getByText("Physik");
    const flatStyle = Array.isArray(subject.props.style) ? Object.assign({}, ...subject.props.style) : subject.props.style;
    expect(flatStyle.textDecorationLine).toBe("line-through");
    expect(screen.getByText("Fällt aus")).toBeTruthy();
  });

  it("does not strike through the subject for a normal lesson", async () => {
    await renderWithProviders(<NextLessonCard lessons={[makeLesson({ subject: "Chemie", status: "normal" })]} />);

    const subject = screen.getByText("Chemie");
    const flatStyle = Array.isArray(subject.props.style) ? Object.assign({}, ...subject.props.style) : subject.props.style;
    expect(flatStyle.textDecorationLine).toBe("none");
  });

  it("shows a parallel-group label and count when given more than one lesson", async () => {
    const a = makeLesson({ id: "a", subject: "Sport", course: "SpJ" });
    const b = makeLesson({ id: "b", subject: "Sport", course: "SpM" });
    await renderWithProviders(<NextLessonCard lessons={[a, b]} />);

    expect(screen.getByText("SpJ")).toBeTruthy();
    expect(screen.getByText("SpM")).toBeTruthy();
    expect(screen.getByText(/2 parallele Gruppen/)).toBeTruthy();
  });

  it("falls back to 'Parallelgruppe' label when a parallel lesson has no course name", async () => {
    const a = makeLesson({ id: "a", course: undefined });
    const b = makeLesson({ id: "b", course: undefined });
    await renderWithProviders(<NextLessonCard lessons={[a, b]} />);

    expect(screen.getAllByText("Parallelgruppe")).toHaveLength(2);
  });

  it("renders diff lines for changed fields (room change)", async () => {
    await renderWithProviders(
      <NextLessonCard lessons={[makeLesson({ originalRoom: "A101", room: "B203" })]} />
    );

    expect(screen.getByText("Raum: A101 → B203")).toBeTruthy();
  });

  it("renders no diff lines when nothing changed from the original", async () => {
    await renderWithProviders(<NextLessonCard lessons={[makeLesson({})]} />);

    expect(screen.queryByText(/→/)).toBeNull();
  });
});
