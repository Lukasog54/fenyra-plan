import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DataSourceConfig, Stundenplan24SourceConfig } from "../data/models/SchoolDataSource";
import { STUNDENPLAN24_SOURCE_ID, STUNDENPLAN24_BASE_URL } from "../data/constants";

export type ThemePreference = "light" | "dark" | "amoled" | "system";

interface SettingsState {
  theme: ThemePreference;
  schoolConfig: DataSourceConfig;
  syncIntervalMinutes: number;
  /** Automatic sync (interval/resume/launch) only runs on Wi-Fi when true; manual sync is unaffected. */
  wifiOnlySync: boolean;
  selectedClassName: string | null;
  displayName: string;

  setTheme: (theme: ThemePreference) => void;
  /** baseUrl is always forced back to the fixed STUNDENPLAN24_BASE_URL - never user-editable. */
  updateSchoolConfig: (partial: Partial<Stundenplan24SourceConfig>) => void;
  setSyncIntervalMinutes: (minutes: number) => void;
  setWifiOnlySync: (enabled: boolean) => void;
  setSelectedClassName: (className: string | null) => void;
  setDisplayName: (name: string) => void;
}

const DEFAULT_SCHOOL_CONFIG: DataSourceConfig = {
  id: STUNDENPLAN24_SOURCE_ID,
  displayName: "Stundenplan24",
  kind: "stundenplan24",
  stundenplan24: { baseUrl: STUNDENPLAN24_BASE_URL, schoolId: "", username: "" },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      schoolConfig: DEFAULT_SCHOOL_CONFIG,
      syncIntervalMinutes: 30,
      wifiOnlySync: false,
      selectedClassName: null,
      displayName: "",

      setTheme: (theme) => set({ theme }),
      updateSchoolConfig: (partial) =>
        set((state) => {
          const current = state.schoolConfig.stundenplan24 ?? { baseUrl: STUNDENPLAN24_BASE_URL, schoolId: "" };
          return {
            schoolConfig: {
              ...state.schoolConfig,
              stundenplan24: {
                ...current,
                ...partial,
                baseUrl: STUNDENPLAN24_BASE_URL,
                schoolId: partial.schoolId ?? current.schoolId,
              },
            },
          };
        }),
      setSyncIntervalMinutes: (syncIntervalMinutes) => set({ syncIntervalMinutes }),
      setWifiOnlySync: (wifiOnlySync) => set({ wifiOnlySync }),
      setSelectedClassName: (selectedClassName) => set({ selectedClassName }),
      setDisplayName: (displayName) => set({ displayName }),
    }),
    {
      name: "fenyra-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
