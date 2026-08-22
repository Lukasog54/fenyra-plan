import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Lesson } from "../../data/models/Lesson";
import { StatusBadge } from "../common/StatusBadge";
import { PulsingDot } from "../common/PulsingDot";
import { useTheme } from "../../theme/ThemeProvider";
import { describeLessonChanges } from "../../utils/lessonDiff";
import { nowHHmm, todayIsoDate } from "../../utils/date";
import { radius, spacing, typography } from "../../theme/tokens";

function isLessonNow(lesson: Lesson): boolean {
  if (lesson.date !== todayIsoDate() || !lesson.startTime || !lesson.endTime) return false;
  const now = nowHHmm();
  return lesson.startTime <= now && now < lesson.endTime;
}

function LessonBlock({ lesson, isParallel }: { lesson: Lesson; isParallel: boolean }) {
  const { palette } = useTheme();
  const isCancelled = lesson.status === "cancelled";
  const isChanged = lesson.status !== "normal";
  const isNow = isLessonNow(lesson);
  const diffs = describeLessonChanges(lesson);

  const accentColor = isNow ? palette.accent : isChanged ? palette.warning : palette.border;

  return (
    <View
      style={[
        styles.content,
        {
          backgroundColor: palette.card,
          borderColor: accentColor,
          borderWidth: isNow ? 1.5 : StyleSheet.hairlineWidth,
          shadowColor: isNow ? palette.glow : "transparent",
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.periodBadge, { backgroundColor: palette.elevatedSurface }]}>
            <Text style={[styles.periodText, { color: palette.textSecondary }]}>
              {lesson.period !== undefined ? String(lesson.period).padStart(2, "0") : "–"}
            </Text>
          </View>
          {isParallel ? (
            <Text style={[styles.parallelLabel, { color: palette.muted }]}>
              {lesson.course ?? "Parallelgruppe"}
            </Text>
          ) : null}
        </View>
        {isNow ? (
          <View style={styles.nowRow}>
            <PulsingDot color={palette.accent} size={6} />
            <Text style={[styles.nowLabel, { color: palette.accent }]}>JETZT</Text>
          </View>
        ) : null}
      </View>

      <Text
        style={[
          styles.subject,
          { color: isCancelled ? palette.danger : palette.text, textDecorationLine: isCancelled ? "line-through" : "none" },
        ]}
      >
        {lesson.subject ?? "Unbekanntes Fach"}
      </Text>

      <View style={styles.metaRow}>
        {lesson.teacher ? (
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={13} color={palette.muted} />
            <Text style={[styles.meta, { color: palette.textSecondary }]}>{lesson.teacher}</Text>
          </View>
        ) : null}
        {lesson.room ? (
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={13} color={palette.muted} />
            <Text style={[styles.meta, { color: palette.textSecondary }]}>Raum {lesson.room}</Text>
          </View>
        ) : null}
        {lesson.course ? (
          <View style={styles.metaItem}>
            <Ionicons name="albums-outline" size={13} color={palette.muted} />
            <Text style={[styles.meta, { color: palette.textSecondary }]}>{lesson.course}</Text>
          </View>
        ) : null}
      </View>

      {diffs.map((diff) => (
        <Text key={diff.label} style={[styles.diff, { color: palette.warning }]}>
          {diff.label}: {diff.from} → {diff.to}
        </Text>
      ))}
      {lesson.note ? <Text style={[styles.note, { color: palette.textSecondary }]}>{lesson.note}</Text> : null}
      <StatusBadge status={lesson.status} />
    </View>
  );
}

/**
 * Renders one timeline slot. `lessons` is normally a single-item array; when a class has
 * parallel elective/split-group lessons at the same period (e.g. two simultaneous sports
 * groups), it holds all of them so both show up together - each with its own status, so it's
 * clear which one (if any) is cancelled/changed and which runs normally.
 */
export function TimelineLessonRow({ lessons }: { lessons: Lesson[] }) {
  const { palette } = useTheme();
  const first = lessons[0];
  const isParallel = lessons.length > 1;
  const isNowAny = lessons.some(isLessonNow);
  const anyChanged = lessons.some((l) => l.status !== "normal");
  const accentColor = isNowAny ? palette.accent : anyChanged ? palette.warning : palette.border;

  return (
    <View style={styles.row}>
      <View style={styles.timeColumn}>
        <Text style={[styles.time, { color: palette.textSecondary }]}>{first.startTime}</Text>
        <View style={[styles.dot, { backgroundColor: accentColor }]} />
        <View style={[styles.line, { backgroundColor: palette.border }]} />
      </View>

      <View style={styles.contentColumn}>
        {isParallel ? (
          <Text style={[styles.groupHeading, { color: palette.textSecondary }]}>
            {lessons.length} PARALLELE GRUPPEN
          </Text>
        ) : null}
        {lessons.map((lesson) => (
          <LessonBlock key={lesson.id} lesson={lesson} isParallel={isParallel} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  timeColumn: {
    width: 52,
    alignItems: "center",
  },
  time: {
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginVertical: spacing.xs,
  },
  line: {
    flex: 1,
    width: 1,
    minHeight: 24,
  },
  contentColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  groupHeading: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
  },
  content: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  periodBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  periodText: {
    fontSize: typography.caption.fontSize,
    fontWeight: "700",
  },
  parallelLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  nowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nowLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  subject: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  meta: {
    fontSize: typography.caption.fontSize,
  },
  diff: {
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
  },
  note: {
    fontSize: typography.caption.fontSize,
    fontStyle: "italic",
  },
});
