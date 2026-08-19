import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Lesson, LessonStatus } from "../../data/models/Lesson";
import { useTheme } from "../../theme/ThemeProvider";
import { Card } from "../common/Card";
import { describeLessonChanges } from "../../utils/lessonDiff";
import { radius, spacing, typography } from "../../theme/tokens";
import type { Palette } from "../../theme/colors";

const STATUS_META: Record<LessonStatus, { label: string; icon: keyof typeof Ionicons.glyphMap; color: keyof Palette }> = {
  normal: { label: "Regulär", icon: "checkmark-circle-outline", color: "muted" },
  cancelled: { label: "Ausfall", icon: "close-circle", color: "danger" },
  substitution: { label: "Vertretung", icon: "flash", color: "warning" },
  "room-change": { label: "Vertretung", icon: "flash", color: "warning" },
  "teacher-change": { label: "Vertretung", icon: "flash", color: "warning" },
  "subject-change": { label: "Vertretung", icon: "flash", color: "warning" },
  moved: { label: "Verlegt", icon: "arrow-redo-outline", color: "violet" },
  unknown: { label: "Änderung", icon: "help-circle-outline", color: "muted" },
};

export function SubstitutionListItem({ lesson }: { lesson: Lesson }) {
  const { palette } = useTheme();
  const meta = STATUS_META[lesson.status];
  const color = palette[meta.color];
  const diffs = describeLessonChanges(lesson);

  return (
    <Card style={[styles.card, { borderColor: color + "40" }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name={meta.icon} size={15} color={color} />
          <Text style={[styles.statusLabel, { color }]}>{meta.label.toUpperCase()}</Text>
        </View>
        {lesson.className ? <Text style={[styles.className, { color: palette.textSecondary }]}>{lesson.className}</Text> : null}
      </View>

      <Text style={[styles.subject, { color: palette.text, textDecorationLine: lesson.status === "cancelled" ? "line-through" : "none" }]}>
        {lesson.subject ?? "Unbekanntes Fach"}
      </Text>
      {lesson.period !== undefined ? (
        <Text style={[styles.period, { color: palette.textSecondary }]}>{lesson.period}. Stunde</Text>
      ) : null}

      {lesson.status === "cancelled" ? (
        <Text style={[styles.cancelledText, { color: palette.textSecondary }]}>Unterricht entfällt.</Text>
      ) : (
        diffs.map((diff) => (
          <View key={diff.label} style={styles.diffRow}>
            <Text style={[styles.diffLabel, { color: palette.muted }]}>{diff.label}</Text>
            <Text style={[styles.diffValue, { color: palette.text }]}>
              {diff.from} <Text style={{ color }}>→</Text> {diff.to}
            </Text>
          </View>
        ))
      )}

      {lesson.note ? <Text style={[styles.note, { color: palette.textSecondary }]}>{lesson.note}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statusLabel: {
    fontSize: typography.label.fontSize,
    fontWeight: "800",
    letterSpacing: 1,
  },
  className: {
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
  },
  subject: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    marginTop: spacing.xs,
  },
  period: {
    fontSize: typography.caption.fontSize,
  },
  cancelledText: {
    fontSize: typography.body.fontSize,
    marginTop: spacing.xs,
  },
  diffRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  diffLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  diffValue: {
    fontSize: typography.body.fontSize,
    fontWeight: "600",
  },
  note: {
    fontSize: typography.caption.fontSize,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
});
