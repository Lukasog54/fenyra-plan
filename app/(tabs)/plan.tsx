import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUiStore } from "../../src/stores/useUiStore";
import { useLessonsForDate } from "../../src/query/hooks/useLessonsForDate";
import { DayTimeline } from "../../src/components/plan/DayTimeline";
import { SyncStatusBar } from "../../src/components/common/SyncStatusBar";
import { useTheme } from "../../src/theme/ThemeProvider";
import { addDays, todayIsoDate } from "../../src/utils/date";
import { radius, spacing, typography } from "../../src/theme/tokens";

function formatHeading(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
}

export default function PlanScreen() {
  const { palette } = useTheme();
  const selectedDate = useUiStore((s) => s.selectedDate);
  const setSelectedDate = useUiStore((s) => s.setSelectedDate);
  const { data: lessons = [] } = useLessonsForDate(selectedDate);

  const isToday = selectedDate === todayIsoDate();

  return (
    <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={styles.container}>
      <SyncStatusBar />

      <View style={styles.navRow}>
        <Pressable
          onPress={() => setSelectedDate(addDays(selectedDate, -1))}
          style={[styles.navButton, { backgroundColor: palette.elevatedSurface }]}
        >
          <Ionicons name="chevron-back" size={20} color={palette.text} />
        </Pressable>

        <Pressable onPress={() => setSelectedDate(todayIsoDate())} style={styles.headingWrapper}>
          <Text style={[styles.heading, { color: palette.text }]}>{formatHeading(selectedDate)}</Text>
          {!isToday ? <Text style={[styles.todayLink, { color: palette.accent }]}>Zu heute springen</Text> : null}
        </Pressable>

        <Pressable
          onPress={() => setSelectedDate(addDays(selectedDate, 1))}
          style={[styles.navButton, { backgroundColor: palette.elevatedSurface }]}
        >
          <Ionicons name="chevron-forward" size={20} color={palette.text} />
        </Pressable>
      </View>

      <DayTimeline lessons={lessons} />
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
    marginBottom: spacing.xl,
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
});
