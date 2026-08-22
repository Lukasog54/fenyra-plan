import { useUiStore } from "../../src/stores/useUiStore";
import { resetStores } from "../../test-utils/resetStores";
import { todayIsoDate } from "../../src/utils/date";

beforeEach(() => {
  resetStores();
});

describe("useUiStore", () => {
  it("defaults selectedDate to today and viewMode to day", () => {
    expect(useUiStore.getState().selectedDate).toBe(todayIsoDate());
    expect(useUiStore.getState().viewMode).toBe("day");
  });

  it("setSelectedDate updates selectedDate", () => {
    useUiStore.getState().setSelectedDate("2026-08-19");
    expect(useUiStore.getState().selectedDate).toBe("2026-08-19");
  });

  it("resetToToday restores selectedDate to today", () => {
    useUiStore.getState().setSelectedDate("2026-08-19");
    useUiStore.getState().resetToToday();
    expect(useUiStore.getState().selectedDate).toBe(todayIsoDate());
  });

  it("setViewMode switches between day and week", () => {
    useUiStore.getState().setViewMode("week");
    expect(useUiStore.getState().viewMode).toBe("week");
  });
});
