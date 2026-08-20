import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing, typography } from "../../theme/tokens";

interface ToggleRowProps {
  label: string;
  hint?: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function ToggleRow({ label, hint, value, onToggle, disabled }: ToggleRowProps) {
  const { palette } = useTheme();
  return (
    <Pressable onPress={onToggle} disabled={disabled} style={[styles.row, { opacity: disabled ? 0.5 : 1 }]}>
      <View style={styles.textWrapper}>
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: palette.textSecondary }]}>{hint}</Text> : null}
      </View>
      <View style={[styles.track, { backgroundColor: value ? palette.accent : palette.border }]}>
        <View style={[styles.thumb, { backgroundColor: palette.background, alignSelf: value ? "flex-end" : "flex-start" }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  textWrapper: {
    flex: 1,
    paddingRight: spacing.md,
  },
  label: {
    fontSize: typography.body.fontSize,
  },
  hint: {
    fontSize: typography.caption.fontSize,
    marginTop: 2,
    lineHeight: 15,
  },
  track: {
    width: 40,
    height: 24,
    borderRadius: radius.pill,
    padding: 3,
    justifyContent: "center",
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
  },
});
