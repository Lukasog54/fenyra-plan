import { create } from "zustand";
import { todayIsoDate } from "../utils/date";

interface UiState {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  resetToToday: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  selectedDate: todayIsoDate(),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  resetToToday: () => set({ selectedDate: todayIsoDate() }),
}));
