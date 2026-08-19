import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Lesson } from "../../data/models/Lesson";
import { Card } from "../common/Card";
import { StatusBadge } from "../common/StatusBadge";
import { useTheme } from "../../theme/ThemeProvider";
import { describeLessonChanges } from "../../utils/lessonDiff";
import { spacing, typography } from "../../theme/tokens";

export function NextLessonCard({ lesson }: { lesson: Lesson }) {
  const { palette } = useTheme();
  const isCancelled = lesson.status === "cancelled";
  const diffs = describeLessonChanges(lesson);

  return (
    <Card glowing style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.eyebrow, { color: palette.accent }]}>NÄCHSTE STUNDE</Text>
        <Ionicons name="arrow-forward-circle" size={22} color={palette.accent} />
      </View>

      <Text
        style={[
          styles.subject,
          { color: isCancelled ? palette.danger : palette.text, textDecorationLine: isCancelled ? "line-through" : "none" },
        ]}
      >
        {lesson.subject ?? "Unbekanntes Fach"}
      </Text>
      <Text style={[styles.time, { color: palette.textSecondary }]}>
        {lesson.startTime}
        {lesson.endTime ? ` – ${lesson.endTime}` : ""}
        {lesson.period !== undefined ? `  ·  ${lesson.period}. Stunde` : ""}
      </Text>

      <View style={styles.metaRow}>
        {lesson.teacher ? (
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={14} color={palette.muted} />
            <Text style={[styles.metaText, { color: palette.textSecondary }]}>{lesson.teacher}</Text>
          </View>
        ) : null}
        {lesson.room ? (
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={palette.muted} />
            <Text style={[styles.metaText, { color: palette.textSecondary }]}>Raum {lesson.room}</Text>
          </View>
        ) : null}
      </View>

      {diffs.map((diff) => (
        <Text key={diff.label} style={[styles.diff, { color: palette.warning }]}>
          {diff.label}: {diff.from} → {diff.to}
        </Text>
      ))}
      <View style={styles.badgeRow}>
        <StatusBadge status={lesson.status} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  eyebrow: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
  },
  subject: {
    fontSize: typography.display.fontSize - 4,
    fontWeight: typography.display.fontWeight,
  },
  time: {
    fontSize: typography.body.fontSize,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: typography.caption.fontSize,
  },
  diff: {
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  badgeRow: {
    marginTop: spacing.sm,
  },
});
