import { View, Text, Pressable, StyleSheet } from "react-native";
import type { Lesson } from "../../data/models/Lesson";
import { buildWeekGrid } from "../../utils/weekGrid";
import { useTheme } from "../../theme/ThemeProvider";
import { useUiStore } from "../../stores/useUiStore";
import { statusColors } from "../../theme/colors";
import { addDays, todayIsoDate } from "../../utils/date";
import { radius, spacing, typography } from "../../theme/tokens";

/** Monday-Friday only - no school on weekends, consistent with the rest of the app's terminology
 * ("Wochenstundenplan" in DataSourceDiagnostics only ever means the school week). */
const SCHOOL_WEEK_LENGTH = 5;

function weekdayLabel(iso: string): { weekday: string; day: string } {
  const d = new Date(iso);
  return {
    weekday: d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", ""),
    day: d.toLocaleDateString("de-DE", { day: "2-digit" }),
  };
}

function GridCell({ groups, date, onPress }: { groups: Lesson[][]; date: string; onPress: (date: string) => void }) {
  const { palette } = useTheme();

  if (groups.length === 0) {
    return <View style={styles.cell} />;
  }

  const group = groups[0];
  const primary = group[0];
  const extraCount = group.length - 1;
  const isCancelled = primary.status === "cancelled";
  const color = primary.status === "normal" ? palette.text : palette[statusColors[primary.status]];

  return (
    <Pressable onPress={() => onPress(date)} style={({ pressed }) => [styles.cell, styles.cellFilled, { backgroundColor: palette.card, opacity: pressed ? 0.7 : 1 }]}>
      <Text style={[styles.cellSubject, { color, textDecorationLine: isCancelled ? "line-through" : "none" }]} numberOfLines={1}>
        {primary.subject ?? "?"}
        {extraCount > 0 ? ` +${extraCount}` : ""}
      </Text>
      {primary.room ? (
        <Text style={[styles.cellRoom, { color: palette.muted }]} numberOfLines={1}>
          {primary.room}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * A real timetable grid: weekdays as columns, periods as rows, one compact cell per lesson (or
 * "+N" for a parallel group). Deliberately just an overview - tapping a cell jumps to the existing,
 * fully detailed day view (`DayTimeline`/`TimelineLessonRow`) for that date instead of trying to
 * cram teacher/room/notes/diffs into a cell too small to show them.
 */
export function WeekTimeline({ weekStart, lessons, neverSynced = false }: { weekStart: string; lessons: Lesson[]; neverSynced?: boolean }) {
  const { palette } = useTheme();
  const setSelectedDate = useUiStore((s) => s.setSelectedDate);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const today = todayIsoDate();
  const days = Array.from({ length: SCHOOL_WEEK_LENGTH }, (_, i) => addDays(weekStart, i));

  if (lessons.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: palette.textSecondary }}>
          {neverSynced ? "Noch keine Daten - bitte synchronisieren." : "Keine Stunden in dieser Woche."}
        </Text>
      </View>
    );
  }

  const grid = buildWeekGrid(days, lessons);

  function goToDay(date: string) {
    setSelectedDate(date);
    setViewMode("day");
  }

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.periodColumn} />
        {days.map((date) => {
          const { weekday, day } = weekdayLabel(date);
          const isToday = date === today;
          return (
            <View key={date} style={styles.headerCell}>
              <Text style={[styles.headerWeekday, { color: isToday ? palette.accent : palette.textSecondary }]}>{weekday}</Text>
              <Text style={[styles.headerDay, { color: isToday ? palette.accent : palette.text }]}>{day}</Text>
            </View>
          );
        })}
      </View>

      {grid.map((row) => (
        <View key={row.period} style={styles.row}>
          <View style={styles.periodColumn}>
            <Text style={[styles.periodLabel, { color: palette.muted }]}>{row.period}</Text>
          </View>
          {days.map((date) => (
            <GridCell key={date} groups={row.cellsByDate[date]} date={date} onPress={goToDay} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingVertical: 48,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    marginBottom: 2,
  },
  periodColumn: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  periodLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: "700",
  },
  headerCell: {
    flex: 1,
    alignItems: "center",
    paddingBottom: spacing.sm,
  },
  headerWeekday: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  headerDay: {
    fontSize: typography.caption.fontSize,
    fontWeight: "700",
    marginTop: 1,
  },
  cell: {
    flex: 1,
    minHeight: 44,
    marginHorizontal: 1,
  },
  cellFilled: {
    borderRadius: radius.sm,
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  cellSubject: {
    fontSize: 11,
    fontWeight: "700",
  },
  cellRoom: {
    fontSize: 9,
    marginTop: 1,
  },
});
