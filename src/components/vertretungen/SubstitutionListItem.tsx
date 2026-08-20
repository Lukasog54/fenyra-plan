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

function LessonEntry({ lesson, isParallel }: { lesson: Lesson; isParallel: boolean }) {
  const { palette } = useTheme();
  const meta = STATUS_META[lesson.status];
  const color = palette[meta.color];
  const diffs = describeLessonChanges(lesson);

  return (
    <View style={isParallel ? styles.parallelEntry : undefined}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name={meta.icon} size={15} color={color} />
          <Text style={[styles.statusLabel, { color }]}>{meta.label.toUpperCase()}</Text>
          {isParallel ? (
            <Text style={[styles.parallelLabel, { color: palette.muted }]}>· {lesson.course ?? "Parallelgruppe"}</Text>
          ) : null}
        </View>
      </View>

      <Text style={[styles.subject, { color: palette.text, textDecorationLine: lesson.status === "cancelled" ? "line-through" : "none" }]}>
        {lesson.subject ?? "Unbekanntes Fach"}
      </Text>

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
    </View>
  );
}

/**
 * `lessons` is normally a single-item array; when a class has parallel elective/split-group
 * lessons at the same period and only one of them is actually affected (e.g. one of two
 * simultaneous sports groups cancelled), it holds all of them together so it's clear which
 * specific one is cancelled/changed and which runs normally - instead of showing only the
 * affected one, which reads as if the whole period were cancelled.
 */
export function SubstitutionListItem({ lessons }: { lessons: Lesson[] }) {
  const { palette } = useTheme();
  const first = lessons[0];
  const isParallel = lessons.length > 1;
  // Border reflects the most severe status in the group so a parallel card with one Ausfall
  // still reads as attention-worthy even though the other entry is normal.
  const primary = lessons.find((l) => l.status === "cancelled") ?? lessons.find((l) => l.status !== "normal") ?? first;
  const borderColor = palette[STATUS_META[primary.status].color];

  return (
    <Card style={[styles.card, { borderColor: borderColor + "40" }]}>
      <View style={styles.topRow}>
        {first.className ? <Text style={[styles.className, { color: palette.textSecondary }]}>{first.className}</Text> : null}
        {first.period !== undefined ? <Text style={[styles.period, { color: palette.textSecondary }]}>{first.period}. Stunde</Text> : null}
      </View>
      {isParallel ? (
        <Text style={[styles.groupHeading, { color: palette.textSecondary }]}>{lessons.length} parallele Gruppen</Text>
      ) : null}
      {lessons.map((lesson) => (
        <LessonEntry key={lesson.id} lesson={lesson} isParallel={isParallel} />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  className: {
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
  },
  period: {
    fontSize: typography.caption.fontSize,
  },
  groupHeading: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
  },
  parallelEntry: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.25)",
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
  parallelLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
  },
  subject: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    marginTop: spacing.xs,
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
