import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSettingsStore } from "../../../src/stores/useSettingsStore";
import { useSync, useSyncMeta } from "../../../src/query/hooks/useSync";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { Card } from "../../../src/components/common/Card";
import { Button } from "../../../src/components/common/Button";
import { radius, spacing, typography } from "../../../src/theme/tokens";

const INTERVAL_OPTIONS = [15, 30, 60, 120];

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "Noch nie";
  return new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function SynchronisierungScreen() {
  const { palette } = useTheme();
  const syncIntervalMinutes = useSettingsStore((s) => s.syncIntervalMinutes);
  const setSyncIntervalMinutes = useSettingsStore((s) => s.setSyncIntervalMinutes);
  const { data: meta } = useSyncMeta();
  const syncMutation = useSync();

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Card>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Zuletzt synchronisiert</Text>
        <Text style={[styles.value, { color: palette.text }]}>{formatTimestamp(meta?.lastSyncedAt)}</Text>
        {meta?.lastSyncStatus === "error" && meta.lastError ? (
          <Text style={[styles.errorText, { color: palette.danger }]}>{meta.lastError}</Text>
        ) : null}
        <Button label="Jetzt synchronisieren" onPress={() => syncMutation.mutate()} loading={syncMutation.isPending} style={{ marginTop: spacing.md }} />
      </Card>

      <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>SYNCHRONISATIONSINTERVALL</Text>
      <Card style={styles.optionsCard}>
        {INTERVAL_OPTIONS.map((minutes) => {
          const isActive = minutes === syncIntervalMinutes;
          return (
            <Pressable key={minutes} onPress={() => setSyncIntervalMinutes(minutes)} style={styles.optionRow}>
              <Text style={[styles.optionLabel, { color: palette.text }]}>{minutes} Minuten</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
