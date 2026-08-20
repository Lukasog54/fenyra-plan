import { View, Text, StyleSheet } from "react-native";
import { useSettingsStore } from "../../../src/stores/useSettingsStore";
import { useSyncMeta } from "../../../src/query/hooks/useSync";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { Card } from "../../../src/components/common/Card";
import { spacing, typography } from "../../../src/theme/tokens";

export default function SchuleScreen() {
  const { palette } = useTheme();
  const schoolConfig = useSettingsStore((s) => s.schoolConfig);
  const selectedClassName = useSettingsStore((s) => s.selectedClassName);
  const { data: meta } = useSyncMeta();

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Card>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Schulname</Text>
        <Text style={[styles.value, { color: palette.text }]}>{meta?.schoolName || "—"}</Text>

        <Text style={[styles.label, { color: palette.textSecondary, marginTop: spacing.md }]}>Schulnummer</Text>
        <Text style={[styles.value, { color: palette.text }]}>{schoolConfig.stundenplan24?.schoolId || "—"}</Text>

        <Text style={[styles.label, { color: palette.textSecondary, marginTop: spacing.md }]}>Klasse</Text>
        <Text style={[styles.value, { color: palette.text }]}>{selectedClassName || "—"}</Text>

        <Text style={[styles.label, { color: palette.textSecondary, marginTop: spacing.md }]}>Stand der Daten (Quelle)</Text>
        <Text style={[styles.value, { color: palette.text }]}>{meta?.sourceGeneratedAt || "—"}</Text>
      </Card>

      <Text style={[styles.hint, { color: palette.textSecondary }]}>
        Schulnummer und Zugangsdaten werden unter „Datenquelle" verwaltet, die Klasse unter „Profil".
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
    textTransform: "uppercase",
  },
  value: {
    fontSize: typography.subtitle.fontSize,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  hint: {
    fontSize: typography.caption.fontSize,
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
