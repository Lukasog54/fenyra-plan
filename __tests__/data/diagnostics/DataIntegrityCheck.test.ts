import { checkDataIntegrity } from "../../../src/data/diagnostics/DataIntegrityCheck";
import * as lessonRepository from "../../../src/data/database/repositories/lessonRepository";
import type { SchoolDataSource } from "../../../src/data/models/SchoolDataSource";
import type { Lesson } from "../../../src/data/models/Lesson";

jest.mock("../../../src/data/database/repositories/lessonRepository");
const mockedLessonRepo = lessonRepository as jest.Mocked<typeof lessonRepository>;

const RANGE = { from: "2026-08-19", to: "2026-08-19" };

function makeLesson(overrides: Partial<Lesson>): Lesson {
  return {
    id: `l_${Math.random()}`,
    date: "2026-08-19",
    startTime: "08:00",
    endTime: "08:45",
    period: 1,
    subject: "Mathematik",
    teacher: "Mueller",
    room: "204",
    className: "10a",
    status: "normal",
    sourceId: "test",
    ...overrides,
  };
}

function makeAdapter(lessons: Lesson[]): SchoolDataSource {
  return {
    config: { id: "test", displayName: "Test", kind: "stundenplan24" },
    testConnection: async () => ({ ok: true }),
    fetchAvailableClasses: async () => [],
    fetchLessons: async () => ({
      lessons,
      syncMeta: { sourceId: "test", lastSyncedAt: null, lastSyncStatus: "success", syncIntervalMinutes: 30 },
    }),
  };
}

beforeEach(() => jest.clearAllMocks());

describe("checkDataIntegrity", () => {
  it("reports zero missing/extra/mismatch when source and Fenyra agree exactly", async () => {
    const lesson = makeLesson({ id: "l1" });
    mockedLessonRepo.getLessonsForRange.mockResolvedValue([lesson]);

    const report = await checkDataIntegrity(makeAdapter([lesson]), RANGE);

    expect(report.sourceRecordCount).toBe(1);
    expect(report.fenyraRecordCount).toBe(1);
    expect(report.missing).toHaveLength(0);
    expect(report.extra).toHaveLength(0);
    expect(report.mismatched).toHaveLength(0);
  });

  it("reports a lesson present in the source but not in Fenyra as missing", async () => {
    mockedLessonRepo.getLessonsForRange.mockResolvedValue([]);
    const sourceLesson = makeLesson({ id: "l1" });

    const report = await checkDataIntegrity(makeAdapter([sourceLesson]), RANGE);

    expect(report.missing).toEqual([sourceLesson]);
    expect(report.extra).toHaveLength(0);
  });

  it("reports a lesson present in Fenyra but not in the source as extra", async () => {
    const staleLesson = makeLesson({ id: "l1" });
    mockedLessonRepo.getLessonsForRange.mockResolvedValue([staleLesson]);

    const report = await checkDataIntegrity(makeAdapter([]), RANGE);

    expect(report.extra).toEqual([staleLesson]);
    expect(report.missing).toHaveLength(0);
  });

  it("reports a field-level mismatch for the same lesson id with a different value", async () => {
    const sourceLesson = makeLesson({ id: "l1", room: "301" });
    const fenyraLesson = makeLesson({ id: "l1", room: "204" });
    mockedLessonRepo.getLessonsForRange.mockResolvedValue([fenyraLesson]);

    const report = await checkDataIntegrity(makeAdapter([sourceLesson]), RANGE);

    expect(report.mismatched).toEqual([{ lessonId: "l1", field: "room", sourceValue: "301", fenyraValue: "204" }]);
  });

  it("does not compare fields that are purely local (id/sourceId/lastUpdated/rawData)", async () => {
    const sourceLesson = makeLesson({ id: "l1", lastUpdated: "2026-08-19T10:00:00.000Z" });
    const fenyraLesson = makeLesson({ id: "l1", lastUpdated: "2026-08-18T09:00:00.000Z" });
    mockedLessonRepo.getLessonsForRange.mockResolvedValue([fenyraLesson]);

    const report = await checkDataIntegrity(makeAdapter([sourceLesson]), RANGE);

    expect(report.mismatched).toHaveLength(0);
  });
});
