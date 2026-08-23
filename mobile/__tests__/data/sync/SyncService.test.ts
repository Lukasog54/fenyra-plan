import * as Notifications from "expo-notifications";
import { sync } from "../../../src/data/sync/SyncService";
import * as lessonRepository from "../../../src/data/database/repositories/lessonRepository";
import * as syncMetaRepository from "../../../src/data/database/repositories/syncMetaRepository";
import { useSettingsStore } from "../../../src/stores/useSettingsStore";
import { ClassifiedError } from "../../../src/data/errors/ClassifiedError";

jest.mock("../../../src/data/database/repositories/lessonRepository");
jest.mock("../../../src/data/database/repositories/syncMetaRepository");
jest.mock("../../../src/data/database/repositories/snapshotRepository");
jest.mock("../../../src/data/database/repositories/changeEventRepository");

const mockedSchedule = Notifications.scheduleNotificationAsync as jest.Mock;

const mockedLessonRepo = lessonRepository as jest.Mocked<typeof lessonRepository>;
const mockedSyncMetaRepo = syncMetaRepository as jest.Mocked<typeof syncMetaRepository>;

let sourceCounter = 0;
/** Fresh sourceId per test - SyncService's in-flight-sync map is keyed by sourceId and lives at
 * module scope, so reusing one across tests would let one test's mocked sync leak into another. */
function nextSourceId(): string {
  sourceCounter += 1;
  return `test-source-${sourceCounter}`;
}

function makeLesson(sourceId: string, overrides: Partial<import("../../../src/data/models/Lesson").Lesson>) {
  return {
    id: `l_${Math.random()}`,
    date: "2026-08-19",
    startTime: "08:00",
    endTime: "08:45",
    status: "normal" as const,
    sourceId,
    ...overrides,
  };
}

function makeAdapter(sourceId: string, fetchLessons: import("../../../src/data/models/SchoolDataSource").SchoolDataSource["fetchLessons"]) {
  return {
    config: { id: sourceId, displayName: "Test", kind: "stundenplan24" as const },
    testConnection: async () => ({ ok: true }),
    fetchAvailableClasses: async () => [],
    fetchLessons,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedLessonRepo.getLessonsForRange.mockResolvedValue([]);
  mockedSyncMetaRepo.getSyncMeta.mockResolvedValue(null);
  mockedSyncMetaRepo.saveSyncMeta.mockResolvedValue(undefined);
  mockedLessonRepo.replaceLessonsForDates.mockResolvedValue(undefined);
  useSettingsStore.setState({
    notificationsEnabled: true,
    notificationCategories: {
      vertretungen: true,
      ausfaelle: true,
      raumaenderungen: true,
      lehreraenderungen: true,
      syncFehler: true,
      updates: true,
    },
  });
});

describe("SyncService.sync concurrency", () => {
  it("returns the same in-flight promise instead of starting a second overlapping sync", async () => {
    const sourceId = nextSourceId();
    let resolveFetch!: (value: Awaited<ReturnType<import("../../../src/data/models/SchoolDataSource").SchoolDataSource["fetchLessons"]>>) => void;
    const fetchLessons = jest.fn(
      () =>
        new Promise<Awaited<ReturnType<import("../../../src/data/models/SchoolDataSource").SchoolDataSource["fetchLessons"]>>>((resolve) => {
          resolveFetch = resolve;
        })
    );
    const adapter = makeAdapter(sourceId, fetchLessons);
    const range = { from: "2026-08-19", to: "2026-08-19" };

    const first = sync(adapter, range);
    const second = sync(adapter, range);

    // Let the pending getSyncMeta/getLessonsForRange mocks resolve so execution actually
    // reaches the adapter.fetchLessons() call (and assigns resolveFetch) before we use it.
    while (fetchLessons.mock.calls.length === 0) {
      await Promise.resolve();
    }

    resolveFetch({
      lessons: [makeLesson(sourceId, { date: "2026-08-19" })],
      syncMeta: { sourceId, lastSyncedAt: null, lastSyncStatus: "success", syncIntervalMinutes: 30 },
      datesFetched: ["2026-08-19"],
    });

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(fetchLessons).toHaveBeenCalledTimes(1);
    expect(firstResult).toBe(secondResult);
  });

  it("allows a new sync to start once the previous one has finished", async () => {
    const sourceId = nextSourceId();
    const fetchLessons = jest.fn().mockResolvedValue({
      lessons: [],
      syncMeta: { sourceId, lastSyncedAt: null, lastSyncStatus: "success", syncIntervalMinutes: 30 },
      datesFetched: [],
    });
    const adapter = makeAdapter(sourceId, fetchLessons);
    const range = { from: "2026-08-19", to: "2026-08-19" };

    await sync(adapter, range);
    await sync(adapter, range);

    expect(fetchLessons).toHaveBeenCalledTimes(2);
  });
});

describe("SyncService.sync partial-day safety", () => {
  it("only replaces the dates the adapter actually fetched, not the whole requested range", async () => {
    const sourceId = nextSourceId();
    const adapter = makeAdapter(sourceId, async () => ({
      lessons: [makeLesson(sourceId, { date: "2026-08-19" })],
      syncMeta: { sourceId, lastSyncedAt: null, lastSyncStatus: "success", syncIntervalMinutes: 30 },
      // Simulates a partial failure: only one of several requested days actually succeeded.
      datesFetched: ["2026-08-19"],
    }));

    await sync(adapter, { from: "2026-08-17", to: "2026-08-21" });

    expect(mockedLessonRepo.replaceLessonsForDates).toHaveBeenCalledWith(
      sourceId,
      ["2026-08-19"],
      expect.any(Array),
      expect.any(String)
    );
  });
});

describe("SyncService.sync progress reporting", () => {
  it("reports phases in order, ending with done, on a successful sync", async () => {
    const sourceId = nextSourceId();
    const adapter = makeAdapter(sourceId, async () => ({
      lessons: [],
      syncMeta: { sourceId, lastSyncedAt: null, lastSyncStatus: "success", syncIntervalMinutes: 30 },
      datesFetched: [],
    }));
    const phases: string[] = [];

    await sync(adapter, { from: "2026-08-19", to: "2026-08-19" }, (phase) => phases.push(phase));

    expect(phases).toEqual(["connecting", "fetching", "saving", "done"]);
  });

  it("does not report done when the sync fails", async () => {
    const sourceId = nextSourceId();
    const adapter = makeAdapter(sourceId, async () => {
      throw new Error("kaputt");
    });
    const phases: string[] = [];

    await expect(sync(adapter, { from: "2026-08-19", to: "2026-08-19" }, (phase) => phases.push(phase))).rejects.toThrow("kaputt");

    expect(phases).toEqual(["connecting", "fetching"]);
  });
});

describe("SyncService.sync error classification", () => {
  it("reclassifies a local-database failure as DATABASE_ERROR (not a Stundenplan24 problem)", async () => {
    const sourceId = nextSourceId();
    mockedLessonRepo.getLessonsForRange.mockRejectedValue(new Error("disk I/O error"));
    const adapter = makeAdapter(sourceId, async () => ({
      lessons: [],
      syncMeta: { sourceId, lastSyncedAt: null, lastSyncStatus: "success", syncIntervalMinutes: 30 },
      datesFetched: [],
    }));

    await expect(sync(adapter, { from: "2026-08-19", to: "2026-08-19" })).rejects.toThrow("disk I/O error");

    expect(mockedSyncMetaRepo.saveSyncMeta).toHaveBeenLastCalledWith(expect.objectContaining({ lastErrorType: "DATABASE_ERROR" }));
  });

  it("keeps the adapter's own classification (e.g. NETWORK_ERROR) instead of overwriting it with DATABASE_ERROR", async () => {
    const sourceId = nextSourceId();
    const adapter = makeAdapter(sourceId, async () => {
      throw new ClassifiedError("NETWORK_ERROR", "Verbindung fehlgeschlagen");
    });

    await expect(sync(adapter, { from: "2026-08-19", to: "2026-08-19" })).rejects.toThrow();

    expect(mockedSyncMetaRepo.saveSyncMeta).toHaveBeenLastCalledWith(expect.objectContaining({ lastErrorType: "NETWORK_ERROR" }));
  });

  it("falls back to SYNC_ERROR for an unclassified error", async () => {
    const sourceId = nextSourceId();
    const adapter = makeAdapter(sourceId, async () => {
      throw new Error("irgendwas Unerwartetes");
    });

    await expect(sync(adapter, { from: "2026-08-19", to: "2026-08-19" })).rejects.toThrow();

    expect(mockedSyncMetaRepo.saveSyncMeta).toHaveBeenLastCalledWith(expect.objectContaining({ lastErrorType: "SYNC_ERROR" }));
  });
});

describe("SyncService.sync notification wiring", () => {
  it("does not notify on the very first sync ever, even for a genuine substitution", async () => {
    const sourceId = nextSourceId();
    mockedSyncMetaRepo.getSyncMeta.mockResolvedValue(null); // never synced before
    const adapter = makeAdapter(sourceId, async () => ({
      lessons: [makeLesson(sourceId, { id: "l1", status: "cancelled" })],
      syncMeta: { sourceId, lastSyncedAt: null, lastSyncStatus: "success", syncIntervalMinutes: 30 },
      datesFetched: ["2026-08-19"],
    }));

    await sync(adapter, { from: "2026-08-19", to: "2026-08-19" });

    expect(mockedSchedule).not.toHaveBeenCalled();
  });

  it("notifies for a genuine substitution detected on a later sync (not the first)", async () => {
    const sourceId = nextSourceId();
    mockedSyncMetaRepo.getSyncMeta.mockResolvedValue({
      sourceId,
      lastSyncedAt: "2026-08-18T10:00:00.000Z",
      lastSyncStatus: "success",
      syncIntervalMinutes: 30,
    });
    mockedLessonRepo.getLessonsForRange.mockResolvedValue([makeLesson(sourceId, { id: "l1", status: "normal" })]);
    const adapter = makeAdapter(sourceId, async () => ({
      lessons: [makeLesson(sourceId, { id: "l1", status: "cancelled" })],
      syncMeta: { sourceId, lastSyncedAt: null, lastSyncStatus: "success", syncIntervalMinutes: 30 },
      datesFetched: ["2026-08-19"],
    }));

    await sync(adapter, { from: "2026-08-19", to: "2026-08-19" });

    expect(mockedSchedule).toHaveBeenCalledTimes(1);
  });

  it("notifies on a sync error only when the previous sync had succeeded (not repeated failures)", async () => {
    const sourceId = nextSourceId();
    mockedSyncMetaRepo.getSyncMeta.mockResolvedValue({
      sourceId,
      lastSyncedAt: "2026-08-18T10:00:00.000Z",
      lastSyncStatus: "success",
      syncIntervalMinutes: 30,
    });
    const adapter = makeAdapter(sourceId, async () => {
      throw new Error("Verbindung fehlgeschlagen");
    });

    await expect(sync(adapter, { from: "2026-08-19", to: "2026-08-19" })).rejects.toThrow();
    expect(mockedSchedule).toHaveBeenCalledTimes(1);

    // A second consecutive failure (previous status now "error") must not notify again.
    mockedSyncMetaRepo.getSyncMeta.mockResolvedValue({
      sourceId,
      lastSyncedAt: "2026-08-18T10:00:00.000Z",
      lastSyncStatus: "error",
      syncIntervalMinutes: 30,
    });
    await expect(sync(adapter, { from: "2026-08-19", to: "2026-08-19" })).rejects.toThrow();
    expect(mockedSchedule).toHaveBeenCalledTimes(1);
  });
});
