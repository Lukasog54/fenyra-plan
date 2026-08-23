import { describeLessonChanges } from "../../src/utils/lessonDiff";
import type { Lesson } from "../../src/data/models/Lesson";

function makeLesson(overrides: Partial<Lesson>): Lesson {
  return {
    id: "l1",
    date: "2026-08-17",
    startTime: "08:00",
    endTime: "08:45",
    period: 1,
    status: "normal",
    ...overrides,
  };
}

describe("describeLessonChanges", () => {
  it("returns an empty array when nothing changed", () => {
    const lesson = makeLesson({ room: "101", teacher: "Mül", subject: "Ma" });
    expect(describeLessonChanges(lesson)).toEqual([]);
  });

  it("returns an empty array when there are no original* fields at all", () => {
    const lesson = makeLesson({ room: "101", teacher: "Mül", subject: "Ma" });
    expect(describeLessonChanges(lesson)).toEqual([]);
  });

  it("reports a room change", () => {
    const lesson = makeLesson({ originalRoom: "101", room: "202" });
    expect(describeLessonChanges(lesson)).toEqual([{ label: "Raum", from: "101", to: "202" }]);
  });

  it("reports a teacher change", () => {
    const lesson = makeLesson({ originalTeacher: "Mül", teacher: "Sch" });
    expect(describeLessonChanges(lesson)).toEqual([{ label: "Lehrer", from: "Mül", to: "Sch" }]);
  });

  it("reports a subject change", () => {
    const lesson = makeLesson({ originalSubject: "Ma", subject: "De" });
    expect(describeLessonChanges(lesson)).toEqual([{ label: "Fach", from: "Ma", to: "De" }]);
  });

  it("does not report a field as changed when it equals its original value", () => {
    const lesson = makeLesson({ originalRoom: "101", room: "101" });
    expect(describeLessonChanges(lesson)).toEqual([]);
  });

  it("does not report a field when only original is set and current is missing (falls back to '?')", () => {
    const lesson = makeLesson({ originalRoom: "101", room: undefined });
    expect(describeLessonChanges(lesson)).toEqual([{ label: "Raum", from: "101", to: "?" }]);
  });

  it("combines multiple simultaneous changes in a fixed order (Raum, Lehrer, Fach)", () => {
    const lesson = makeLesson({
      originalRoom: "101",
      room: "202",
      originalTeacher: "Mül",
      teacher: "Sch",
      originalSubject: "Ma",
      subject: "De",
    });
    expect(describeLessonChanges(lesson)).toEqual([
      { label: "Raum", from: "101", to: "202" },
      { label: "Lehrer", from: "Mül", to: "Sch" },
      { label: "Fach", from: "Ma", to: "De" },
    ]);
  });

  it("ignores an empty-string original value (falsy, not treated as a real original)", () => {
    const lesson = makeLesson({ originalRoom: "", room: "202" });
    expect(describeLessonChanges(lesson)).toEqual([]);
  });
});
