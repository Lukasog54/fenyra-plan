import { getDb } from "../db";

export async function saveRawSnapshot(sourceId: string, kind: string, payload: string, fetchedAt: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("INSERT INTO raw_snapshots (source_id, fetched_at, kind, payload) VALUES (?, ?, ?, ?)", [
    sourceId,
    fetchedAt,
    kind,
    payload,
  ]);
}
