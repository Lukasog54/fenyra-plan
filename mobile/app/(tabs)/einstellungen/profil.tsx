import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useSettingsStore } from "../../../src/stores/useSettingsStore";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { TextField } from "../../../src/components/common/TextField";
import { useAvailableClasses } from "../../../src/query/hooks/useAvailableClasses";
import { spacing, typography, radius } from "../../../src/theme/tokens";

export default function ProfilScreen() {
  const { palette } = useTheme();
  const displayName = useSettingsStore((s) => s.displayName);
  const setDisplayName = useSettingsStore((s) => s.setDisplayName);
  const selectedClassName = useSettingsStore((s) => s.selectedClassName);
  const setSelectedClassName = useSettingsStore((s) => s.setSelectedClassName);
  const { data: availableClasses = [], isLoading: classesLoading } = useAvailableClasses();

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <TextField label="Name" value={displayName} onChangeText={setDisplayName} placeholder="Dein Name" />

      <Text style={[styles.label, { color: palette.textSecondary }]}>KLASSE</Text>

      {classesLoading ? (
        <ActivityIndicator color={palette.accent} style={styles.loading} />
      ) : availableClasses.length > 0 ? (
        <View style={styles.chipRow}>
          {availableClasses.map((className) => {
            const isSelected = className === selectedClassName;
            return (
              <Pressable
                key={className}
                onPress={() => setSelectedClassName(className)}
                style={[
                  styles.chip,
                  { borderColor: isSelected ? palette.accent : palette.border, backgroundColor: isSelected ? palette.accent + "1F" : "transparent" },
                ]}
              >
                <Text style={{ color: isSelected ? palette.accent : palette.textSecondary, fontWeight: "600" }}>{className}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={[styles.hint, { color: palette.textSecondary, marginBottom: spacing.md }]}>
          Klassenliste noch nicht verfügbar (erst nach der ersten Synchronisierung) — Klasse manuell eintragen:
        </Text>
      )}

      <TextField
        label={availableClasses.length > 0 ? "Andere Klasse" : ""}
        value={selectedClassName ?? ""}
        onChangeText={(text) => setSelectedClassName(text || null)}
        placeholder="z. B. 10a"
      />

      <Text style={[styles.hint, { color: palette.textSecondary }]}>
        Diese Angaben bleiben nur lokal auf deinem Gerät gespeichert und filtern, welche Stunden dir angezeigt werden.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  label: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    marginBottom: spacing.sm,
  },
  loading: {
    marginBottom: spacing.md,
    alignSelf: "flex-start",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  hint: {
    fontSize: typography.caption.fontSize,
    marginTop: spacing.md,
    lineHeight: 18,
  },
});
