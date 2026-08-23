import { buildWeekGrid } from "../../src/utils/weekGrid";
import type { Lesson } from "../../src/data/models/Lesson";

const DAYS = ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21"];

function makeLesson(overrides: Partial<Lesson>): Lesson {
  return {
    id: `l_${Math.random()}`,
    date: "2026-08-17",
    startTime: "08:00",
    endTime: "08:45",
    period: 1,
    className: "10a",
    status: "normal",
    sourceId: "test",
    ...overrides,
  };
}

describe("buildWeekGrid", () => {
  it("only creates rows for periods that actually occur in the given lessons", () => {
    const grid = buildWeekGrid(DAYS, [makeLesson({ period: 1 }), makeLesson({ period: 3 })]);
    expect(grid.map((row) => row.period)).toEqual([1, 3]);
  });

  it("sorts rows ascending by period", () => {
    const grid = buildWeekGrid(DAYS, [makeLesson({ period: 5 }), makeLesson({ period: 2 })]);
    expect(grid.map((row) => row.period)).toEqual([2, 5]);
  });

  it("leaves out lessons without a period entirely, rather than forcing a row", () => {
    const grid = buildWeekGrid(DAYS, [makeLesson({ period: undefined })]);
    expect(grid).toHaveLength(0);
  });

  it("places a lesson in the cell for its own date, leaving other days empty", () => {
    const grid = buildWeekGrid(DAYS, [makeLesson({ date: "2026-08-19", period: 2 })]);
    const row = grid.find((r) => r.period === 2)!;
    expect(row.cellsByDate["2026-08-19"]).toHaveLength(1);
    expect(row.cellsByDate["2026-08-17"]).toEqual([]);
    expect(row.cellsByDate["2026-08-21"]).toEqual([]);
  });

  it("groups two parallel lessons in the same date+period into one cell group", () => {
    const a = makeLesson({ id: "a", date: "2026-08-18", period: 4, course: "SpJ" });
    const b = makeLesson({ id: "b", date: "2026-08-18", period: 4, course: "SpM" });
    const grid = buildWeekGrid(DAYS, [a, b]);
    const row = grid.find((r) => r.period === 4)!;
    expect(row.cellsByDate["2026-08-18"]).toEqual([[a, b]]);
  });

  it("keeps lessons on different dates in the same period as separate single-lesson cells", () => {
    const mon = makeLesson({ id: "mon", date: "2026-08-17", period: 1 });
    const tue = makeLesson({ id: "tue", date: "2026-08-18", period: 1 });
    const grid = buildWeekGrid(DAYS, [mon, tue]);
    const row = grid.find((r) => r.period === 1)!;
    expect(row.cellsByDate["2026-08-17"]).toEqual([[mon]]);
    expect(row.cellsByDate["2026-08-18"]).toEqual([[tue]]);
  });
});
