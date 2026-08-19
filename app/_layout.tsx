import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { queryClient } from "../src/query/queryClient";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { getDb } from "../src/data/database/db";
import { sync } from "../src/data/sync/SyncService";
import { resolveAdapter } from "../src/data/adapters/registry";
import { useSettingsStore } from "../src/stores/useSettingsStore";
import { defaultSyncRange } from "../src/utils/date";
import { LoginScreen } from "../src/components/onboarding/LoginScreen";
import { ClassSelectionScreen } from "../src/components/onboarding/ClassSelectionScreen";

function RootNavigation() {
  const { palette, isDark } = useTheme();
  const [dbReady, setDbReady] = useState(false);
  const schoolConfig = useSettingsStore((s) => s.schoolConfig);
  const selectedClassName = useSettingsStore((s) => s.selectedClassName);

  const hasCredentials = Boolean(schoolConfig.stundenplan24?.schoolId && schoolConfig.stundenplan24?.credentialRef);
  const hasClass = Boolean(selectedClassName);

  useEffect(() => {
    getDb().then(() => setDbReady(true));
  }, []);

  useEffect(() => {
    if (!dbReady || !hasCredentials) return;
    const adapter = resolveAdapter(schoolConfig);
    sync(adapter, defaultSyncRange()).catch(() => {
      // Sync-on-launch failures surface via SyncStatusBar / sync_meta, not a blocking error here.
    });
  }, [dbReady, hasCredentials, schoolConfig]);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.accent} />
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

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RootNavigation />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
