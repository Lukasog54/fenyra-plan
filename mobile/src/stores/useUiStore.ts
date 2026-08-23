import { create } from "zustand";
import { todayIsoDate } from "../utils/date";

export type PlanViewMode = "day" | "week";

interface UiState {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  resetToToday: () => void;
  /** Plan tab view mode - defaults to the day view, a button switches to the week grid. */
  viewMode: PlanViewMode;
  setViewMode: (mode: PlanViewMode) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  selectedDate: todayIsoDate(),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  resetToToday: () => set({ selectedDate: todayIsoDate() }),
  viewMode: "day",
  setViewMode: (viewMode) => set({ viewMode }),
}));
