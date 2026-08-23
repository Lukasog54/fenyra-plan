import { View, Text, StyleSheet } from "react-native";
import type { LessonStatus } from "../../data/models/Lesson";
import { statusColors, statusLabels } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing, typography } from "../../theme/tokens";

export function StatusBadge({ status }: { status: LessonStatus }) {
  const { palette } = useTheme();
  if (status === "normal") return null;

  const color = palette[statusColors[status]];

  return (
    <View style={[styles.badge, { backgroundColor: color + "1F", borderColor: color + "55" }]}>
      <Text style={[styles.text, { color }]}>{statusLabels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: typography.caption.fontSize,
    fontWeight: "700",
  },
});
