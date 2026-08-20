import { groupParallelLessons } from "../../src/utils/lessonGroups";
import type { Lesson } from "../../src/data/models/Lesson";

function makeLesson(overrides: Partial<Lesson>): Lesson {
  return {
    id: `l_${Math.random()}`,
    date: "2026-08-20",
    startTime: "11:05",
    endTime: "11:50",
    period: 5,
    className: "5a",
    status: "normal",
    sourceId: "test",
    ...overrides,
  };
}

describe("groupParallelLessons", () => {
  it("keeps a single lesson per period as a group of one", () => {
    const lessons = [makeLesson({ id: "a", period: 1 }), makeLesson({ id: "b", period: 2 })];
    const groups = groupParallelLessons(lessons);
    expect(groups).toEqual([[lessons[0]], [lessons[1]]]);
  });

  it("groups two simultaneous elective-group lessons in the same class+period together", () => {
    const spj = makeLesson({ id: "spj", period: 5, course: "SpJ", teacher: "Ju", status: "normal" });
    const spm = makeLesson({ id: "spm", period: 5, course: "SpM", teacher: "Bl", status: "cancelled" });
    const groups = groupParallelLessons([spj, spm]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual([spj, spm]);
  });

  it("does not group the same period across different classes", () => {
    const a = makeLesson({ id: "a", period: 3, className: "5a" });
    const b = makeLesson({ id: "b", period: 3, className: "5b" });
    const groups = groupParallelLessons([a, b]);
    expect(groups).toEqual([[a], [b]]);
  });

  it("does not group the same class+period across different dates", () => {
    const a = makeLesson({ id: "a", period: 3, date: "2026-08-20" });
    const b = makeLesson({ id: "b", period: 3, date: "2026-08-21" });
    const groups = groupParallelLessons([a, b]);
    expect(groups).toEqual([[a], [b]]);
  });
});
