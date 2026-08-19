import { Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing, typography } from "../../theme/tokens";

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
}

export function SettingsRow({ icon, label, value, onPress }: SettingsRowProps) {
  const { palette } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, { borderColor: palette.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.iconWrapper, { backgroundColor: palette.elevatedSurface }]}>
        <Ionicons name={icon} size={17} color={palette.accent} />
      </View>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      {value ? <Text style={[styles.value, { color: palette.textSecondary }]}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={palette.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  label: {
    flex: 1,
    fontSize: typography.body.fontSize,
    fontWeight: "500",
  },
  value: {
    fontSize: typography.caption.fontSize,
    marginRight: spacing.sm,
  },
});
