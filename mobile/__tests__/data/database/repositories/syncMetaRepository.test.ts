import { getDb } from "../../../../src/data/database/db";
import { getSyncMeta, saveSyncMeta } from "../../../../src/data/database/repositories/syncMetaRepository";
import { createFreshTestDb } from "../../../../test-utils/sqliteTestDb";
import type { SyncMeta } from "../../../../src/data/models/SyncMeta";

jest.mock("../../../../src/data/database/db");
const mockedGetDb = getDb as jest.Mock;

function makeMeta(overrides: Partial<SyncMeta>): SyncMeta {
  return {
    sourceId: "stundenplan24",
    lastSyncedAt: "2026-08-19T10:00:00.000Z",
    lastSyncStatus: "success",
    syncIntervalMinutes: 30,
    ...overrides,
  };
}

beforeEach(() => {
  mockedGetDb.mockResolvedValue(createFreshTestDb());
});

describe("getSyncMeta", () => {
  it("returns null when nothing has been saved for this source yet", async () => {
    expect(await getSyncMeta("stundenplan24")).toBeNull();
  });
});

describe("saveSyncMeta", () => {
  it("round-trips all fields, including the new lastErrorType", async () => {
    await saveSyncMeta(makeMeta({ lastSyncStatus: "error", lastError: "Verbindung fehlgeschlagen", lastErrorType: "NETWORK_ERROR", schoolName: "Testschule" }));

    const meta = await getSyncMeta("stundenplan24");
    expect(meta).toMatchObject({
      lastSyncStatus: "error",
      lastError: "Verbindung fehlgeschlagen",
      lastErrorType: "NETWORK_ERROR",
      schoolName: "Testschule",
    });
  });

  it("upserts (ON CONFLICT DO UPDATE) instead of creating a second row for the same sourceId", async () => {
    await saveSyncMeta(makeMeta({ lastSyncStatus: "success" }));
    await saveSyncMeta(makeMeta({ lastSyncStatus: "error", lastError: "Sync fehlgeschlagen", lastErrorType: "SOURCE_ERROR" }));

    const db = await getDb();
    const rows = await db.getAllAsync("SELECT * FROM sync_meta WHERE source_id = ?", ["stundenplan24"]);
    expect(rows).toHaveLength(1);

    const meta = await getSyncMeta("stundenplan24");
    expect(meta?.lastSyncStatus).toBe("error");
    expect(meta?.lastErrorType).toBe("SOURCE_ERROR");
  });

  it("keeps separate rows for different sourceIds", async () => {
    await saveSyncMeta(makeMeta({ sourceId: "source-a", schoolName: "Schule A" }));
    await saveSyncMeta(makeMeta({ sourceId: "source-b", schoolName: "Schule B" }));

    expect((await getSyncMeta("source-a"))?.schoolName).toBe("Schule A");
    expect((await getSyncMeta("source-b"))?.schoolName).toBe("Schule B");
  });
});
