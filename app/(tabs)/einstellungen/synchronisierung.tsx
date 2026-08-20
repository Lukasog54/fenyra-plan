import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSettingsStore } from "../../../src/stores/useSettingsStore";
import { useSync, useSyncMeta } from "../../../src/query/hooks/useSync";
import type { SyncPhase } from "../../../src/data/sync/SyncService";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { Card } from "../../../src/components/common/Card";
import { Button } from "../../../src/components/common/Button";
import { ToggleRow } from "../../../src/components/common/ToggleRow";
import { radius, spacing, typography } from "../../../src/theme/tokens";

const INTERVAL_OPTIONS = [5, 10, 15, 30, 60, 180, 360];

function formatInterval(minutes: number): string {
  if (minutes < 60) return `${minutes} Minuten`;
  const hours = minutes / 60;
  return hours === 1 ? "1 Stunde" : `${hours} Stunden`;
}

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "Noch nie";
  return new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const PROGRESS_STEPS: Array<{ key: SyncPhase; label: string }> = [
  { key: "connecting", label: "Verbindung" },
  { key: "fetching", label: "Stundenplan & Vertretungen abrufen" },
  { key: "saving", label: "Speichern" },
  { key: "done", label: "Fertig" },
];

function ProgressChecklist({ progress }: { progress: SyncPhase | null }) {
  const { palette } = useTheme();
  if (!progress) return null;

  const currentIndex = PROGRESS_STEPS.findIndex((s) => s.key === progress);
  // Only render steps reached so far - each one fades in as progress gets to it, instead of
  // showing all four greyed-out steps upfront.
  const visibleSteps = PROGRESS_STEPS.slice(0, currentIndex + 1);

  return (
    <View style={styles.progressList}>
      {visibleSteps.map((step, index) => {
        const isDone = index < currentIndex || progress === "done";
        return (
          <Animated.View key={step.key} entering={FadeIn.duration(150)} style={styles.progressRow}>
            {isDone ? (
              <Ionicons name="checkmark-circle" size={16} color={palette.success} />
            ) : (
              <Ionicons name="ellipse-outline" size={16} color={palette.accent} />
            )}
            <Text style={[styles.progressLabel, { color: palette.text }]}>{step.label}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

export default function SynchronisierungScreen() {
  const { palette } = useTheme();
  const syncIntervalMinutes = useSettingsStore((s) => s.syncIntervalMinutes);
  const setSyncIntervalMinutes = useSettingsStore((s) => s.setSyncIntervalMinutes);
  const wifiOnlySync = useSettingsStore((s) => s.wifiOnlySync);
  const setWifiOnlySync = useSettingsStore((s) => s.setWifiOnlySync);
  const { data: meta } = useSyncMeta();
  const syncMutation = useSync();

  return (
    <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={styles.container}>
      <Card>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Zuletzt synchronisiert</Text>
        <Text style={[styles.value, { color: palette.text }]}>{formatTimestamp(meta?.lastSyncedAt)}</Text>
        {meta?.lastSyncStatus === "error" && meta.lastError ? (
          <Text style={[styles.errorText, { color: palette.danger }]}>{meta.lastError}</Text>
        ) : null}
        <Button label="Jetzt synchronisieren" onPress={() => syncMutation.mutate()} loading={syncMutation.isPending} style={{ marginTop: spacing.md }} />
        <ProgressChecklist progress={syncMutation.progress} />
      </Card>

      <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>SYNCHRONISATIONSINTERVALL</Text>
      <Card style={styles.optionsCard}>
        {INTERVAL_OPTIONS.map((minutes) => {
          const isActive = minutes === syncIntervalMinutes;
          return (
            <Pressable key={minutes} onPress={() => setSyncIntervalMinutes(minutes)} style={styles.optionRow}>
              <Text style={[styles.optionLabel, { color: palette.text }]}>{formatInterval(minutes)}</Text>
              <View
                style={[
                  styles.radio,
                  { borderColor: isActive ? palette.accent : palette.border, backgroundColor: isActive ? palette.accent : "transparent" },
                ]}
              />
            </Pressable>
          );
        })}
      </Card>

      <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>DATENVERBRAUCH</Text>
      <Card style={styles.optionsCard}>
        <ToggleRow
          label="Nur über WLAN synchronisieren"
          hint="Betrifft automatische Synchronisierung (Intervall, Start, Wiederherstellung) - der Jetzt-synchronisieren-Button oben funktioniert immer."
          value={wifiOnlySync}
          onToggle={() => setWifiOnlySync(!wifiOnlySync)}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  label: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    textTransform: "uppercase",
  },
  value: {
    fontSize: typography.subtitle.fontSize,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: typography.caption.fontSize,
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  sectionHeading: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
  },
  optionsCard: {
    padding: spacing.xs,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  optionLabel: {
    fontSize: typography.body.fontSize,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
  progressList: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  progressLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
  },
});
