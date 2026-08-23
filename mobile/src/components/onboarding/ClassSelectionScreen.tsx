import { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useTheme } from "../../theme/ThemeProvider";
import { useAvailableClasses } from "../../query/hooks/useAvailableClasses";
import { TextField } from "../common/TextField";
import { Button } from "../common/Button";
import { spacing, typography, radius } from "../../theme/tokens";

export function ClassSelectionScreen() {
  const { palette } = useTheme();
  const setSelectedClassName = useSettingsStore((s) => s.setSelectedClassName);
  const { data: availableClasses = [], isLoading, isError, refetch, isRefetching } = useAvailableClasses();
  const [manualClassName, setManualClassName] = useState("");

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.heading, { color: palette.text }]}>Klasse wählen</Text>
        <Text style={[styles.subheading, { color: palette.textSecondary }]}>
          Welche Klasse besuchst du? Das entscheidet, welche Stunden dir angezeigt werden.
        </Text>

        {isLoading ? (
          <ActivityIndicator color={palette.accent} style={styles.loading} />
        ) : isError || availableClasses.length === 0 ? (
          <View style={styles.errorBlock}>
            <Text style={[styles.errorText, { color: palette.warning }]}>
              Klassenliste konnte nicht geladen werden. Prüfe die Verbindung oder trage deine Klasse manuell ein.
            </Text>
            <Button label="Erneut versuchen" variant="secondary" onPress={() => refetch()} loading={isRefetching} style={styles.retryButton} />
          </View>
        ) : (
          <View style={styles.list}>
            {availableClasses.map((className) => (
              <Pressable
                key={className}
                onPress={() => setSelectedClassName(className)}
                style={({ pressed }) => [styles.row, { backgroundColor: palette.card, borderColor: palette.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.rowLabel, { color: palette.text }]}>{className}</Text>
                <Ionicons name="chevron-forward" size={18} color={palette.muted} />
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.manualLabel, { color: palette.textSecondary }]}>Klasse nicht dabei?</Text>
        <View style={styles.manualRow}>
          <TextField label="" value={manualClassName} onChangeText={setManualClassName} placeholder="Klasse manuell eintragen" containerStyle={styles.manualInput} />
          <Button label="OK" onPress={() => setSelectedClassName(manualClassName.trim())} disabled={!manualClassName.trim()} style={styles.manualButton} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    padding: spacing.xl,
    paddingTop: 72,
  },
  heading: {
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
    letterSpacing: typography.heading.letterSpacing,
  },
  subheading: {
    fontSize: typography.body.fontSize,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  loading: {
    marginTop: spacing.xl,
  },
  errorBlock: {
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: typography.caption.fontSize,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowLabel: {
    fontSize: typography.subtitle.fontSize,
    fontWeight: "600",
  },
  manualLabel: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  manualRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  manualInput: {
    flex: 1,
  },
  manualButton: {
    marginTop: 0,
  },
});
