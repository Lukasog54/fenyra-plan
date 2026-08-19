import { Stundenplan24Adapter } from "../../../src/data/adapters/stundenplan24/adapter";
import { runDataSourceAudit } from "../../../src/data/diagnostics/DataSourceDiagnostics";
import type { SchoolDataSource } from "../../../src/data/models/SchoolDataSource";
import type { Lesson } from "../../../src/data/models/Lesson";

const RANGE = { from: "2026-08-17", to: "2026-08-21" };

function findCategory(report: Awaited<ReturnType<typeof runDataSourceAudit>>, key: string) {
  const entry = report.categories.find((c) => c.key === key);
  if (!entry) throw new Error(`category ${key} missing from report`);
  return entry;
}

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

/** A minimal in-test double covering every category so the report logic itself is exercised, independent of any real network/XML feed. */
const fullyWiredAdapter: SchoolDataSource = {
  config: { id: "test", displayName: "Test", kind: "stundenplan24" },
  testConnection: async () => ({ ok: true }),
  fetchAvailableClasses: async () => ["10a"],
  fetchLessons: async () => ({
    lessons: [
      makeLesson({ date: "2026-08-18", status: "normal" }),
      makeLesson({ date: "2026-08-19", period: 2, course: "Ek-GK-1" }),
      makeLesson({ date: "2026-08-19", period: 3, status: "cancelled", note: "fällt aus" }),
      makeLesson({ date: "2026-08-19", period: 4, status: "room-change", room: "301" }),
      makeLesson({ date: "2026-08-19", period: 5, status: "teacher-change", teacher: "Weber", originalTeacher: "Schmidt" }),
      makeLesson({ date: "2026-08-19", period: 6, status: "subject-change", subject: "Kunst", originalSubject: "Mathematik" }),
      makeLesson({ date: "2026-08-20", period: 1, status: "moved" }),
    ],
    syncMeta: { sourceId: "test", lastSyncedAt: null, lastSyncStatus: "success", syncIntervalMinutes: 30 },
  }),
};

describe("runDataSourceAudit against a fully-wired data source", () => {
  it("reports authentication and every fully-wired category as AVAILABLE", async () => {
    const report = await runDataSourceAudit(fullyWiredAdapter, RANGE);

    expect(report.authentication.status).toBe("AVAILABLE");
    expect(findCategory(report, "klassen").status).toBe("AVAILABLE");
    expect(findCategory(report, "kurse").status).toBe("AVAILABLE");
    expect(findCategory(report, "vertretungsplan").status).toBe("AVAILABLE");
    expect(findCategory(report, "raumaenderungen").status).toBe("AVAILABLE");
    expect(findCategory(report, "verlegungen").status).toBe("AVAILABLE");
  });

  it("reports categories with no source model as UNKNOWN, never fabricating AVAILABLE", async () => {
    const report = await runDataSourceAudit(fullyWiredAdapter, RANGE);
    expect(findCategory(report, "schulinformationen").status).toBe("UNKNOWN");
    expect(findCategory(report, "gruppen").status).toBe("UNKNOWN");
  });
});

describe("runDataSourceAudit against the unconfigured stundenplan24 adapter", () => {
  it("reports UNAVAILABLE auth and UNKNOWN for every data category instead of guessing", async () => {
    const adapter = new Stundenplan24Adapter({ id: "stundenplan24", displayName: "Stundenplan24", kind: "stundenplan24" });
    const report = await runDataSourceAudit(adapter, RANGE);

    expect(report.authentication.status).toBe("UNAVAILABLE");
    expect(findCategory(report, "klassen").status).toBe("UNKNOWN");
    expect(findCategory(report, "kurse").status).toBe("UNKNOWN");
  });
});
