import { getDb } from "../../../../src/data/database/db";
import { getLessonsForRange, replaceLessonsForDates } from "../../../../src/data/database/repositories/lessonRepository";
import { createFreshTestDb } from "../../../../test-utils/sqliteTestDb";
import type { Lesson } from "../../../../src/data/models/Lesson";

jest.mock("../../../../src/data/database/db");
const mockedGetDb = getDb as jest.Mock;

function makeLesson(overrides: Partial<Lesson>): Lesson {
  return {
    id: `l_${Math.random()}`,
    date: "2026-08-19",
    startTime: "08:00",
    endTime: "08:45",
    status: "normal",
    ...overrides,
  };
}

beforeEach(() => {
  mockedGetDb.mockResolvedValue(createFreshTestDb());
});

describe("getLessonsForRange", () => {
  it("returns only lessons for the given source and date range, ordered by date then period", async () => {
    await replaceLessonsForDates(
      "src-a",
      ["2026-08-17", "2026-08-19"],
      [
        makeLesson({ id: "a2", date: "2026-08-19", period: 2 }),
        makeLesson({ id: "a1", date: "2026-08-19", period: 1 }),
        makeLesson({ id: "b1", date: "2026-08-17", period: 1 }),
      ],
      "2026-08-19T10:00:00.000Z"
    );
    await replaceLessonsForDates("src-b", ["2026-08-19"], [makeLesson({ id: "other-source", date: "2026-08-19" })], "2026-08-19T10:00:00.000Z");

    const result = await getLessonsForRange("src-a", "2026-08-17", "2026-08-19");

    expect(result.map((l) => l.id)).toEqual(["b1", "a1", "a2"]);
  });

  it("round-trips all mapped fields correctly (row -> Lesson)", async () => {
    await replaceLessonsForDates(
      "src-a",
      ["2026-08-19"],
      [
        makeLesson({
          id: "full",
          teacher: "Müller",
          room: "204",
          className: "10a",
          course: "ch1",
          status: "room-change",
          originalRoom: undefined,
          note: "Vertretung",
          isExam: true,
          examInfo: "Klausur",
          movedFrom: { date: "2026-08-18", period: 3 },
          rawData: { foo: "bar" },
        }),
      ],
      "2026-08-19T10:00:00.000Z"
    );

    const [lesson] = await getLessonsForRange("src-a", "2026-08-19", "2026-08-19");

    expect(lesson.teacher).toBe("Müller");
    expect(lesson.isExam).toBe(true);
    expect(lesson.examInfo).toBe("Klausur");
    expect(lesson.movedFrom).toEqual({ date: "2026-08-18", period: 3 });
    expect(lesson.rawData).toEqual({ foo: "bar" });
  });
});

describe("replaceLessonsForDates", () => {
  it("only deletes/replaces the given dates, leaving other cached dates untouched (partial-sync safety)", async () => {
    await replaceLessonsForDates("src-a", ["2026-08-17", "2026-08-18"], [makeLesson({ id: "day17", date: "2026-08-17" }), makeLesson({ id: "day18", date: "2026-08-18" })], "t1");

    // A second sync only re-fetched 2026-08-18 successfully (2026-08-17 failed this time) - day17
    // must survive untouched, matching the exact bug this repository function was built to prevent.
    await replaceLessonsForDates("src-a", ["2026-08-18"], [makeLesson({ id: "day18-updated", date: "2026-08-18" })], "t2");

    const result = await getLessonsForRange("src-a", "2026-08-17", "2026-08-18");
    expect(result.map((l) => l.id)).toEqual(["day17", "day18-updated"]);
  });

  it("does nothing when given an empty dates array (no-op, not a full wipe)", async () => {
    await replaceLessonsForDates("src-a", ["2026-08-19"], [makeLesson({ id: "keep-me", date: "2026-08-19" })], "t1");

    await replaceLessonsForDates("src-a", [], [], "t2");

    const result = await getLessonsForRange("src-a", "2026-08-19", "2026-08-19");
    expect(result.map((l) => l.id)).toEqual(["keep-me"]);
  });

  it("replaces (not duplicates) a lesson with the same id via INSERT OR REPLACE", async () => {
    await replaceLessonsForDates("src-a", ["2026-08-19"], [makeLesson({ id: "l1", date: "2026-08-19", subject: "Deutsch" })], "t1");
    await replaceLessonsForDates("src-a", ["2026-08-19"], [makeLesson({ id: "l1", date: "2026-08-19", subject: "Mathe" })], "t2");

    const result = await getLessonsForRange("src-a", "2026-08-19", "2026-08-19");
    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe("Mathe");
  });

  it("preserves two parallel lessons in the same period with distinct ids (no silent overwrite)", async () => {
    await replaceLessonsForDates(
      "src-a",
      ["2026-08-19"],
      [
        makeLesson({ id: "10b_2026-08-19_3_454", date: "2026-08-19", period: 3, className: "10b", subject: "Russisch" }),
        makeLesson({ id: "10b_2026-08-19_3_456", date: "2026-08-19", period: 3, className: "10b", subject: "Biologie" }),
      ],
      "t1"
    );

    const result = await getLessonsForRange("src-a", "2026-08-19", "2026-08-19");
    expect(result).toHaveLength(2);
    expect(result.map((l) => l.subject).sort()).toEqual(["Biologie", "Russisch"]);
  });
});
