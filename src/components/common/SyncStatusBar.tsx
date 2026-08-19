import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSync, useSyncMeta } from "../../query/hooks/useSync";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "noch nie";
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export function SyncStatusBar() {
  const { palette } = useTheme();
  const { data: meta } = useSyncMeta();
  const syncMutation = useSync();

  const isError = meta?.lastSyncStatus === "error";
  const isSyncing = syncMutation.isPending;

  const statusColor = isSyncing ? palette.accent : isError ? palette.danger : palette.textSecondary;
  const statusText = isSyncing
    ? "Synchronisierung..."
    : isError
      ? "Offline · letzte Daten werden angezeigt"
      : `Aktualisiert ${formatTime(meta?.lastSyncedAt)}`;

  return (
    <Pressable
      onPress={() => syncMutation.mutate()}
      disabled={isSyncing}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel="Jetzt synchronisieren"
    >
      {isSyncing ? (
        <ActivityIndicator size="small" color={palette.accent} />
      ) : (
        <Ionicons
          name={isError ? "cloud-offline-outline" : "checkmark-circle"}
          size={14}
          color={statusColor}
        />
      )}
      <Text style={[styles.label, { color: statusColor }]}>{statusText}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  label: {
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
  },
});
