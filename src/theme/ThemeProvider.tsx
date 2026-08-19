import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { useSettingsStore } from "../stores/useSettingsStore";
import { lightPalette, darkPalette, amoledPalette, type Palette } from "./colors";

interface ThemeContextValue {
  palette: Palette;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useSettingsStore((s) => s.theme);
  const systemScheme = useColorScheme();

  const value = useMemo<ThemeContextValue>(() => {
    const resolved = preference === "system" ? (systemScheme ?? "light") : preference;
    const palette = resolved === "amoled" ? amoledPalette : resolved === "dark" ? darkPalette : lightPalette;
    return { palette, isDark: resolved !== "light" };
  }, [preference, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
