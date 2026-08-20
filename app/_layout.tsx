import { useEffect, useRef, useState } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { View, Image, Text, ActivityIndicator, AppState, AppStateStatus, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { queryClient } from "../src/query/queryClient";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { getDb } from "../src/data/database/db";
import { sync } from "../src/data/sync/SyncService";
import { resolveAdapter } from "../src/data/adapters/registry";
import { useSettingsStore } from "../src/stores/useSettingsStore";
import { useUiStore } from "../src/stores/useUiStore";
import { getLessonsForRange } from "../src/data/database/repositories/lessonRepository";
import { STUNDENPLAN24_SOURCE_ID } from "../src/data/constants";
import { defaultSyncRange, todayIsoDate, addDays, nowHHmm } from "../src/utils/date";
import { queryKeys } from "../src/query/keys";
import { useNetworkStatus } from "../src/hooks/useNetworkStatus";
import { LoginScreen } from "../src/components/onboarding/LoginScreen";
import { ClassSelectionScreen } from "../src/components/onboarding/ClassSelectionScreen";
import { spacing, typography } from "../src/theme/tokens";

// Keeps the native splash on screen until dbReady below explicitly hides it, so there's no gap
// between the native splash disappearing and the app having anything ready to show.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden/unsupported on this platform - nothing to do.
});

function RootNavigation() {
  const { palette, isDark } = useTheme();
  const [dbReady, setDbReady] = useState(false);
  const schoolConfig = useSettingsStore((s) => s.schoolConfig);
  const selectedClassName = useSettingsStore((s) => s.selectedClassName);
  const syncIntervalMinutes = useSettingsStore((s) => s.syncIntervalMinutes);
  const appState = useRef(AppState.currentState);

  const hasCredentials = Boolean(schoolConfig.stundenplan24?.schoolId && schoolConfig.stundenplan24?.credentialRef);
  const hasClass = Boolean(selectedClassName);

  useEffect(() => {
    getDb().then(() => setDbReady(true));
  }, []);

  useEffect(() => {
    if (dbReady) SplashScreen.hideAsync().catch(() => {});
  }, [dbReady]);

  const runSync = () => {
    if (!useNetworkStatus.getIsOnline()) return;
    if (useSettingsStore.getState().wifiOnlySync && !useNetworkStatus.getIsWifi()) return;
    const adapter = resolveAdapter(useSettingsStore.getState().schoolConfig);
    sync(adapter, defaultSyncRange()).then(() => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["substitutionLessons"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.syncMeta(STUNDENPLAN24_SOURCE_ID) });
    }).catch(() => {
      // Sync failures surface via SyncStatusBar / sync_meta, not a blocking error here.
    });
  };

  useEffect(() => {
    if (!dbReady || !hasCredentials) return;
    runSync();
  }, [dbReady, hasCredentials, schoolConfig]);

  // Periodic re-sync while the app stays open, using the user's configured interval.
  useEffect(() => {
    if (!dbReady || !hasCredentials) return;
    const id = setInterval(runSync, syncIntervalMinutes * 60 * 1000);
    return () => clearInterval(id);
  }, [dbReady, hasCredentials, syncIntervalMinutes]);

  // Re-sync whenever the app comes back to the foreground (was previously silent).
  useEffect(() => {
    if (!dbReady || !hasCredentials) return;
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === "active") {
        runSync();
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [dbReady, hasCredentials]);

  // Default the Plan tab to the next day once today's lessons are all over - runs once per app session.
  useEffect(() => {
    if (!dbReady || !hasClass) return;
    let cancelled = false;
    (async () => {
      const today = todayIsoDate();
      if (useUiStore.getState().selectedDate !== today) return;
      const lessons = await getLessonsForRange(STUNDENPLAN24_SOURCE_ID, today, today);
      const relevant = selectedClassName ? lessons.filter((l) => l.className === selectedClassName) : lessons;
      if (cancelled || relevant.length === 0) return;
      const now = nowHHmm();
      const isDayOver = relevant.every((l) => (l.endTime || l.startTime) < now);
      if (isDayOver) useUiStore.getState().setSelectedDate(addDays(today, 1));
    })();
    return () => {
      cancelled = true;
    };
  }, [dbReady, hasClass]);

  if (!dbReady) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: palette.background }]}>
        <Image source={require("../assets/android-icon-foreground.png")} style={styles.loadingLogo} resizeMode="contain" />
        <Text style={[styles.loadingAppName, { color: palette.accent }]}>FENYRA</Text>
        <Text style={[styles.loadingAppSub, { color: palette.textSecondary }]}>Plan</Text>
        <ActivityIndicator color={palette.accent} style={styles.loadingSpinner} />
      </View>
    );
  }

  if (!hasCredentials) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <LoginScreen />
      </>
    );
  }

  if (!hasClass) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ClassSelectionScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.background } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingLogo: {
    width: 72,
    height: 72,
    marginBottom: spacing.sm,
  },
  loadingAppName: {
    fontSize: typography.heading.fontSize,
    fontWeight: "800",
    letterSpacing: 3,
  },
  loadingAppSub: {
    fontSize: typography.subtitle.fontSize,
    fontWeight: "500",
    letterSpacing: 2,
    marginTop: 2,
  },
  loadingSpinner: {
    marginTop: spacing.xl,
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RootNavigation />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
