import { getDb } from "../../../../src/data/database/db";
import { saveRawSnapshot } from "../../../../src/data/database/repositories/snapshotRepository";
import { createFreshTestDb } from "../../../../test-utils/sqliteTestDb";

jest.mock("../../../../src/data/database/db");
const mockedGetDb = getDb as jest.Mock;

beforeEach(() => {
  mockedGetDb.mockResolvedValue(createFreshTestDb());
});

describe("saveRawSnapshot", () => {
  it("inserts a row with the given source, kind, payload and timestamp", async () => {
    await saveRawSnapshot("stundenplan24", "mobil", "<VpMobil></VpMobil>", "2026-08-19T10:00:00.000Z");

    const db = await getDb();
    const rows = await db.getAllAsync<{ source_id: string; kind: string; payload: string; fetched_at: string }>(
      "SELECT * FROM raw_snapshots WHERE source_id = ?",
      ["stundenplan24"]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      source_id: "stundenplan24",
      kind: "mobil",
      payload: "<VpMobil></VpMobil>",
      fetched_at: "2026-08-19T10:00:00.000Z",
    });
  });

  it("keeps every snapshot (no overwrite) - each call is a separate row, unlike lessons/sync_meta", async () => {
    await saveRawSnapshot("stundenplan24", "mobil", "first", "2026-08-19T10:00:00.000Z");
    await saveRawSnapshot("stundenplan24", "mobil", "second", "2026-08-19T11:00:00.000Z");

    const db = await getDb();
    const rows = await db.getAllAsync("SELECT * FROM raw_snapshots WHERE source_id = ?", ["stundenplan24"]);
    expect(rows).toHaveLength(2);
  });
});
