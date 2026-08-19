import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Lesson } from "../../data/models/Lesson";
import { StatusBadge } from "../common/StatusBadge";
import { useTheme } from "../../theme/ThemeProvider";
import { describeLessonChanges } from "../../utils/lessonDiff";
import { nowHHmm, todayIsoDate } from "../../utils/date";
import { radius, spacing, typography } from "../../theme/tokens";

function isLessonNow(lesson: Lesson): boolean {
  if (lesson.date !== todayIsoDate() || !lesson.startTime || !lesson.endTime) return false;
  const now = nowHHmm();
  return lesson.startTime <= now && now < lesson.endTime;
}

export function TimelineLessonRow({ lesson }: { lesson: Lesson }) {
  const { palette } = useTheme();
  const isCancelled = lesson.status === "cancelled";
  const isChanged = lesson.status !== "normal";
  const isNow = isLessonNow(lesson);
  const diffs = describeLessonChanges(lesson);

  const accentColor = isNow ? palette.accent : isChanged ? palette.warning : palette.border;

  return (
    <View style={styles.row}>
      <View style={styles.timeColumn}>
        <Text style={[styles.time, { color: palette.textSecondary }]}>{lesson.startTime}</Text>
        <View style={[styles.dot, { backgroundColor: accentColor }]} />
        <View style={[styles.line, { backgroundColor: palette.border }]} />
      </View>

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
          <View style={[styles.periodBadge, { backgroundColor: palette.elevatedSurface }]}>
            <Text style={[styles.periodText, { color: palette.textSecondary }]}>
              {lesson.period !== undefined ? String(lesson.period).padStart(2, "0") : "–"}
            </Text>
          </View>
          {isNow ? (
            <View style={styles.nowRow}>
              <View style={[styles.nowDot, { backgroundColor: palette.accent }]} />
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
  content: {
    flex: 1,
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
  periodBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  periodText: {
    fontSize: typography.caption.fontSize,
    fontWeight: "700",
  },
  nowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
