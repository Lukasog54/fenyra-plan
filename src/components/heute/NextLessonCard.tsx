import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Lesson } from "../../data/models/Lesson";
import { Card } from "../common/Card";
import { StatusBadge } from "../common/StatusBadge";
import { useTheme } from "../../theme/ThemeProvider";
import { describeLessonChanges } from "../../utils/lessonDiff";
import { spacing, typography } from "../../theme/tokens";

function LessonSection({ lesson, isParallel }: { lesson: Lesson; isParallel: boolean }) {
  const { palette } = useTheme();
  const isCancelled = lesson.status === "cancelled";
  const diffs = describeLessonChanges(lesson);

  return (
    <View style={isParallel ? styles.parallelSection : undefined}>
      {isParallel ? (
        <Text style={[styles.parallelLabel, { color: palette.muted }]}>{lesson.course ?? "Parallelgruppe"}</Text>
      ) : null}
      <Text
        style={[
          styles.subject,
          isParallel && styles.subjectParallel,
          { color: isCancelled ? palette.danger : palette.text, textDecorationLine: isCancelled ? "line-through" : "none" },
        ]}
      >
        {lesson.subject ?? "Unbekanntes Fach"}
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
    </View>
  );
}

/**
 * `lessons` is normally a single-item array; when the next period has parallel elective/split
 * groups (e.g. two simultaneous sports groups), it holds all of them so both are visible here,
 * each with its own status - otherwise only one would show as "next" and the other would be
 * easy to miss further down in the day's list.
 */
export function NextLessonCard({ lessons }: { lessons: Lesson[] }) {
  const { palette } = useTheme();
  const first = lessons[0];
  const isParallel = lessons.length > 1;

  return (
    <Card glowing style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.eyebrow, { color: palette.accent }]}>NÄCHSTE STUNDE</Text>
        <Ionicons name="arrow-forward-circle" size={22} color={palette.accent} />
      </View>

      <Text style={[styles.time, { color: palette.textSecondary }]}>
        {first.startTime}
        {first.endTime ? ` – ${first.endTime}` : ""}
        {first.period !== undefined ? `  ·  ${first.period}. Stunde` : ""}
        {isParallel ? `  ·  ${lessons.length} parallele Gruppen` : ""}
      </Text>

      {lessons.map((lesson) => (
        <LessonSection key={lesson.id} lesson={lesson} isParallel={isParallel} />
      ))}
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
  subjectParallel: {
    fontSize: typography.title.fontSize,
  },
  time: {
    fontSize: typography.body.fontSize,
  },
  parallelSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.25)",
  },
  parallelLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 2,
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
