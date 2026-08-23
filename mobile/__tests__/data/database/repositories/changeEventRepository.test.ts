import { getDb } from "../../../../src/data/database/db";
import { saveChangeEvents, getChangeEventsForRange, markEventsNotified } from "../../../../src/data/database/repositories/changeEventRepository";
import { createFreshTestDb } from "../../../../test-utils/sqliteTestDb";
import type { SubstitutionChangeEvent } from "../../../../src/data/models/SubstitutionChangeEvent";

jest.mock("../../../../src/data/database/db");
const mockedGetDb = getDb as jest.Mock;

function makeEvent(overrides: Partial<SubstitutionChangeEvent>): SubstitutionChangeEvent {
  return {
    id: `evt_${Math.random()}`,
    lessonId: "l1",
    date: "2026-08-19",
    field: "status",
    previousValue: "normal",
    newValue: "cancelled",
    detectedAt: "2026-08-19T10:00:00.000Z",
    acknowledged: false,
    notified: false,
    ...overrides,
  };
}

beforeEach(() => {
  mockedGetDb.mockResolvedValue(createFreshTestDb());
});

describe("saveChangeEvents / getChangeEventsForRange", () => {
  it("round-trips an event including boolean flags and a null previousValue", async () => {
    await saveChangeEvents([makeEvent({ id: "e1", previousValue: null, className: "10a" })]);

    const [event] = await getChangeEventsForRange("2026-08-19", "2026-08-19");
    expect(event.previousValue).toBeNull();
    expect(event.className).toBe("10a");
    expect(event.acknowledged).toBe(false);
    expect(event.notified).toBe(false);
  });

  it("does nothing when given an empty array", async () => {
    await saveChangeEvents([]);
    const events = await getChangeEventsForRange("2026-08-01", "2026-08-31");
    expect(events).toHaveLength(0);
  });

  it("replaces (not duplicates) an event with the same id via INSERT OR REPLACE", async () => {
    await saveChangeEvents([makeEvent({ id: "e1", newValue: "cancelled" })]);
    await saveChangeEvents([makeEvent({ id: "e1", newValue: "room-change" })]);

    const events = await getChangeEventsForRange("2026-08-19", "2026-08-19");
    expect(events).toHaveLength(1);
    expect(events[0].newValue).toBe("room-change");
  });

  it("filters strictly by the given date range", async () => {
    await saveChangeEvents([
      makeEvent({ id: "before", date: "2026-08-01" }),
      makeEvent({ id: "inside", date: "2026-08-19" }),
      makeEvent({ id: "after", date: "2026-09-01" }),
    ]);

    const events = await getChangeEventsForRange("2026-08-15", "2026-08-25");
    expect(events.map((e) => e.id)).toEqual(["inside"]);
  });
});

describe("markEventsNotified", () => {
  it("flips notified to true only for the given ids, leaving others untouched", async () => {
    await saveChangeEvents([makeEvent({ id: "e1" }), makeEvent({ id: "e2" }), makeEvent({ id: "e3" })]);

    await markEventsNotified(["e1", "e3"]);

    const events = await getChangeEventsForRange("2026-08-19", "2026-08-19");
    const byId = Object.fromEntries(events.map((e) => [e.id, e.notified]));
    expect(byId).toEqual({ e1: true, e2: false, e3: true });
  });

  it("does nothing when given an empty ids array", async () => {
    await saveChangeEvents([makeEvent({ id: "e1" })]);
    await expect(markEventsNotified([])).resolves.toBeUndefined();

    const [event] = await getChangeEventsForRange("2026-08-19", "2026-08-19");
    expect(event.notified).toBe(false);
  });
});
