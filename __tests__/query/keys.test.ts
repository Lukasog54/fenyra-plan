import { queryKeys } from "../../src/query/keys";

describe("queryKeys", () => {
  it("builds a lessons key from sourceId, from, to and className", () => {
    expect(queryKeys.lessons("stundenplan24", "2026-08-17", "2026-08-21", "10a")).toEqual([
      "lessons",
      "stundenplan24",
      "2026-08-17",
      "2026-08-21",
      "10a",
    ]);
  });

  it("builds a lessons key with a null className", () => {
    expect(queryKeys.lessons("stundenplan24", "2026-08-17", "2026-08-21", null)).toEqual([
      "lessons",
      "stundenplan24",
      "2026-08-17",
      "2026-08-21",
      null,
    ]);
  });

  it("builds a substitutions key from from/to", () => {
    expect(queryKeys.substitutions("2026-08-17", "2026-08-21")).toEqual(["substitutions", "2026-08-17", "2026-08-21"]);
  });

  it("builds a syncMeta key from sourceId", () => {
    expect(queryKeys.syncMeta("stundenplan24")).toEqual(["syncMeta", "stundenplan24"]);
  });

  it("produces distinct keys for different sourceIds", () => {
    expect(queryKeys.syncMeta("a")).not.toEqual(queryKeys.syncMeta("b"));
  });
});
