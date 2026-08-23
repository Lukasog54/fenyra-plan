import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useUiStore } from "../../src/stores/useUiStore";
import { useLessonsForDate } from "../../src/query/hooks/useLessonsForDate";
import { useLessonsForRange } from "../../src/query/hooks/useLessonsForRange";
import { useSyncMeta } from "../../src/query/hooks/useSync";
import { DayTimeline } from "../../src/components/plan/DayTimeline";
import { WeekTimeline } from "../../src/components/plan/WeekTimeline";
import { SyncStatusBar } from "../../src/components/common/SyncStatusBar";
import { PressableScale } from "../../src/components/common/PressableScale";
import { selectionFeedback } from "../../src/utils/haptics";
import { useTheme } from "../../src/theme/ThemeProvider";
import { addDays, mondayOfWeek, todayIsoDate } from "../../src/utils/date";
import { motion, radius, spacing, typography } from "../../src/theme/tokens";

function formatHeading(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
}

function formatWeekHeading(monday: string): string {
  const friday = addDays(monday, 4);
  const mondayDate = new Date(monday);
  const fridayDate = new Date(friday);
  const mondayLabel = mondayDate.toLocaleDateString("de-DE", { day: "2-digit", month: "long" });
  const fridayLabel = fridayDate.toLocaleDateString("de-DE", { day: "2-digit", month: "long" });
  return `${mondayLabel} – ${fridayLabel}`;
}

export default function PlanScreen() {
  const { palette } = useTheme();
  const selectedDate = useUiStore((s) => s.selectedDate);
  const setSelectedDate = useUiStore((s) => s.setSelectedDate);
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const { data: dayLessons = [], isLoading: isDayLoading } = useLessonsForDate(selectedDate);
  const weekStart = mondayOfWeek(selectedDate);
  const weekEnd = addDays(weekStart, 4);
  const { data: weekLessons = [], isLoading: isWeekLoading } = useLessonsForRange(weekStart, weekEnd);
  const { data: meta } = useSyncMeta();

  const isToday = selectedDate === todayIsoDate();
  const isDayMode = viewMode === "day";
  const isLoading = isDayMode ? isDayLoading : isWeekLoading;

  return (
    <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={styles.container}>
      <SyncStatusBar />

      {isDayMode ? (
        <View style={styles.navRow}>
          <PressableScale
            onPress={() => setSelectedDate(addDays(selectedDate, -1))}
            style={[styles.navButton, { backgroundColor: palette.elevatedSurface }]}
          >
            <Ionicons name="chevron-back" size={20} color={palette.text} />
          </PressableScale>

          <Pressable onPress={() => setSelectedDate(todayIsoDate())} style={styles.headingWrapper}>
            <Text style={[styles.heading, { color: palette.text }]}>{formatHeading(selectedDate)}</Text>
            {!isToday ? <Text style={[styles.todayLink, { color: palette.accent }]}>Zu heute springen</Text> : null}
          </Pressable>

          <PressableScale
            onPress={() => setSelectedDate(addDays(selectedDate, 1))}
            style={[styles.navButton, { backgroundColor: palette.elevatedSurface }]}
          >
            <Ionicons name="chevron-forward" size={20} color={palette.text} />
          </PressableScale>
        </View>
      ) : (
        <View style={styles.navRow}>
          <PressableScale
            onPress={() => setSelectedDate(addDays(selectedDate, -7))}
            style={[styles.navButton, { backgroundColor: palette.elevatedSurface }]}
          >
            <Ionicons name="chevron-back" size={20} color={palette.text} />
          </PressableScale>

          <Pressable onPress={() => setSelectedDate(todayIsoDate())} style={styles.headingWrapper}>
            <Text style={[styles.heading, { color: palette.text }]}>{formatWeekHeading(weekStart)}</Text>
            {weekStart !== mondayOfWeek(todayIsoDate()) ? <Text style={[styles.todayLink, { color: palette.accent }]}>Zu dieser Woche springen</Text> : null}
          </Pressable>

          <PressableScale
            onPress={() => setSelectedDate(addDays(selectedDate, 7))}
            style={[styles.navButton, { backgroundColor: palette.elevatedSurface }]}
          >
            <Ionicons name="chevron-forward" size={20} color={palette.text} />
          </PressableScale>
        </View>
      )}

      <View style={styles.viewModeRow}>
        <PressableScale
          onPress={() => {
            selectionFeedback();
            setViewMode(isDayMode ? "week" : "day");
          }}
          style={styles.viewModeToggle}
          hitSlop={8}
        >
          <Ionicons name={isDayMode ? "grid-outline" : "calendar-outline"} size={16} color={palette.accent} />
          <Text style={[styles.viewModeLabel, { color: palette.accent }]}>{isDayMode ? "Wochenansicht" : "Tagesansicht"}</Text>
        </PressableScale>
      </View>

      {isLoading ? (
        <ActivityIndicator color={palette.accent} style={styles.loading} />
      ) : (
        <Animated.View key={isDayMode ? selectedDate : weekStart} entering={FadeIn.duration(motion.fast)} exiting={FadeOut.duration(motion.fast)}>
          {isDayMode ? (
            <DayTimeline lessons={dayLessons} neverSynced={!meta?.lastSyncedAt} />
          ) : (
            <WeekTimeline weekStart={weekStart} lessons={weekLessons} neverSynced={!meta?.lastSyncedAt} />
          )}
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingTop: 56,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  navButton: {
    padding: spacing.sm,
    borderRadius: radius.pill,
  },
  headingWrapper: {
    alignItems: "center",
    flex: 1,
  },
  heading: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    textTransform: "capitalize",
  },
  todayLink: {
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
    marginTop: 2,
  },
  viewModeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: spacing.lg,
  },
  viewModeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  viewModeLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
  },
  loading: {
    marginTop: spacing.xl,
  },
});
