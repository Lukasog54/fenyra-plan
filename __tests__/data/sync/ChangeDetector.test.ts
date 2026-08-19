import { detectChanges } from "../../../src/data/sync/ChangeDetector";
import type { Lesson } from "../../../src/data/models/Lesson";

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: "demo_2026-08-19_10a_3",
    date: "2026-08-19",
    startTime: "09:40",
    endTime: "10:25",
    period: 3,
    subject: "Mathematik",
    teacher: "Müller",
    room: "204",
    className: "10a",
    status: "normal",
    ...overrides,
  };
}

describe("ChangeDetector.detectChanges", () => {
  it("emits exactly one room event when only the room changes", () => {
    const previous = [makeLesson({ room: "204" })];
    const next = [makeLesson({ room: "301" })];

    const events = detectChanges(previous, next, "2026-08-19T12:00:00.000Z");

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      field: "room",
      previousValue: "204",
      newValue: "301",
    });
  });

  it("emits no events for an unchanged lesson", () => {
    const lesson = makeLesson();
    const events = detectChanges([lesson], [{ ...lesson }]);
    expect(events).toHaveLength(0);
  });

  it("emits an appearance event for a lesson only present in next", () => {
    const next = [makeLesson({ id: "demo_2026-08-19_10a_6", period: 6 })];
    const events = detectChanges([], next);

    expect(events).toHaveLength(1);
    expect(events[0].previousValue).toBeNull();
  });

  it("emits a removal event for a lesson only present in previous", () => {
    const previous = [makeLesson()];
    const events = detectChanges(previous, []);

    expect(events).toHaveLength(1);
    expect(events[0].newValue).toBeNull();
  });
});
