import { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useOfflineStats } from "../../../src/query/hooks/useOfflineStats";
import { clearOfflineData } from "../../../src/data/database/db";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { Card } from "../../../src/components/common/Card";
import { Button } from "../../../src/components/common/Button";
import { spacing, typography } from "../../../src/theme/tokens";

export default function OfflineDatenScreen() {
  const { palette } = useTheme();
  const { data: stats, refetch } = useOfflineStats();
  const queryClient = useQueryClient();
  const [clearing, setClearing] = useState(false);

  async function handleClear() {
    setClearing(true);
    await clearOfflineData();
    await refetch();
    await queryClient.invalidateQueries();
    setClearing(false);
    Alert.alert("Offline-Daten gelöscht", "Beim nächsten Start wird erneut synchronisiert.");
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Card>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Gespeicherte Stunden</Text>
        <Text style={[styles.value, { color: palette.text }]}>{stats?.lessonCount ?? 0}</Text>

        <Text style={[styles.label, { color: palette.textSecondary, marginTop: spacing.md }]}>Rohdaten-Snapshots</Text>
        <Text style={[styles.value, { color: palette.text }]}>{stats?.rawSnapshotCount ?? 0}</Text>

        <Text style={[styles.label, { color: palette.textSecondary, marginTop: spacing.md }]}>Erkannte Änderungen</Text>
        <Text style={[styles.value, { color: palette.text }]}>{stats?.changeEventCount ?? 0}</Text>
      </Card>

      <Button label="Cache leeren" variant="danger" onPress={handleClear} loading={clearing} />

      <Text style={[styles.hint, { color: palette.textSecondary }]}>
        Löscht alle lokal gespeicherten Stunden, Rohdaten und Änderungsverläufe auf diesem Gerät. Beim nächsten
        Start wird neu synchronisiert.
      </Text>
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
  hint: {
    fontSize: typography.caption.fontSize,
    lineHeight: 18,
  },
});
