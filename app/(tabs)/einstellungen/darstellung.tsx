import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSettingsStore, type ThemePreference } from "../../../src/stores/useSettingsStore";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { Card } from "../../../src/components/common/Card";
import { radius, spacing, typography } from "../../../src/theme/tokens";

const OPTIONS: Array<{ id: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "system", label: "System", icon: "phone-portrait-outline" },
  { id: "light", label: "Hell", icon: "sunny-outline" },
  { id: "dark", label: "Dunkel", icon: "moon-outline" },
  { id: "amoled", label: "AMOLED", icon: "contrast-outline" },
];

export default function DarstellungScreen() {
  const { palette } = useTheme();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Card style={styles.card}>
        {OPTIONS.map((option) => {
          const isActive = option.id === theme;
          return (
            <Pressable key={option.id} onPress={() => setTheme(option.id)} style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name={option.icon} size={18} color={isActive ? palette.accent : palette.muted} />
                <Text style={[styles.label, { color: palette.text }]}>{option.label}</Text>
              </View>
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
  },
  card: {
    padding: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  label: {
    fontSize: typography.body.fontSize,
    fontWeight: "500",
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
});
