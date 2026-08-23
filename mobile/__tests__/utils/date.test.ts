import {
  toIsoDate,
  todayIsoDate,
  addDays,
  mondayOfWeek,
  isDateInRange,
  compareDates,
  defaultSyncRange,
  parseCompactDate,
  nowHHmm,
} from "../../src/utils/date";

describe("toIsoDate", () => {
  it("formats year, month and day with zero-padding", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("addDays", () => {
  it("adds positive days, rolling over month boundaries", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
  });

  it("subtracts with negative days, rolling back over month boundaries", () => {
    expect(addDays("2026-02-01", -3)).toBe("2026-01-29");
  });

  it("returns the same date for 0 days", () => {
    expect(addDays("2026-08-17", 0)).toBe("2026-08-17");
  });
});

describe("mondayOfWeek", () => {
  it("returns the same date when given a Monday", () => {
    expect(mondayOfWeek("2026-08-17")).toBe("2026-08-17");
  });

  it("returns the prior Monday when given a mid-week date", () => {
    expect(mondayOfWeek("2026-08-20")).toBe("2026-08-17");
  });

  it("wraps a Sunday back to the Monday that started its week", () => {
    expect(mondayOfWeek("2026-08-23")).toBe("2026-08-17");
  });
});

describe("isDateInRange", () => {
  it("is inclusive of both boundaries", () => {
    expect(isDateInRange("2026-08-17", "2026-08-17", "2026-08-21")).toBe(true);
    expect(isDateInRange("2026-08-21", "2026-08-17", "2026-08-21")).toBe(true);
  });

  it("is false outside the range", () => {
    expect(isDateInRange("2026-08-22", "2026-08-17", "2026-08-21")).toBe(false);
  });
});

describe("compareDates", () => {
  it("orders ISO date strings lexicographically", () => {
    expect(compareDates("2026-08-17", "2026-08-21")).toBe(-1);
    expect(compareDates("2026-08-21", "2026-08-17")).toBe(1);
    expect(compareDates("2026-08-17", "2026-08-17")).toBe(0);
  });
});

describe("defaultSyncRange", () => {
  it("spans a week back through three weeks ahead of today", () => {
    const { from, to } = defaultSyncRange();
    const today = todayIsoDate();
    expect(from).toBe(addDays(today, -7));
    expect(to).toBe(addDays(today, 21));
  });
});

describe("parseCompactDate", () => {
  it("converts an 8-digit compact date to ISO format", () => {
    expect(parseCompactDate("20260817")).toBe("2026-08-17");
  });

  it("accepts a number input", () => {
    expect(parseCompactDate(20260817)).toBe("2026-08-17");
  });
});

describe("nowHHmm", () => {
  it("returns a 5-character HH:mm string", () => {
    expect(nowHHmm()).toMatch(/^\d{2}:\d{2}$/);
  });
});
