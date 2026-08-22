import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useTodayLessons } from "../../src/query/hooks/useTodayLessons";
import { useSync, useSyncMeta } from "../../src/query/hooks/useSync";
import { NextLessonCard } from "../../src/components/heute/NextLessonCard";
import { TimelineLessonRow } from "../../src/components/plan/TimelineLessonRow";
import { SyncStatusBar } from "../../src/components/common/SyncStatusBar";
import { useTheme } from "../../src/theme/ThemeProvider";
import { groupParallelLessons } from "../../src/utils/lessonGroups";
import { spacing, typography } from "../../src/theme/tokens";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Guten Morgen";
  if (hour < 17) return "Guten Tag";
  return "Guten Abend";
}

function formatDateHeading(): string {
  return new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
}

export default function HeuteScreen() {
  const { palette } = useTheme();
  const { data: lessons = [], isLoading, refetch, isRefetching } = useTodayLessons();
  const { data: meta } = useSyncMeta();
  const syncMutation = useSync();
  const neverSynced = !meta?.lastSyncedAt;

  const now = new Date().toTimeString().slice(0, 5);
  // Some schools' feeds don't provide an end time per lesson - fall back to
  // the start time so those lessons aren't wrongly filtered out as "already over".
  const upcoming = lessons.filter((l) => (l.endTime || l.startTime) >= now);
  const upcomingGroups = groupParallelLessons(upcoming);
  const nextGroup = upcomingGroups[0];
  const restOfDayGroups = upcomingGroups.slice(1);
  // Distinguishes "this lesson is happening right now" from merely "next up" - only meaningful
  // when the source actually provides a startTime, which it always does (only endTime can be missing).
  const isCurrentlyHappening = nextGroup?.some((l) => l.startTime && l.startTime <= now) ?? false;

  return (
    <ScrollView
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefetching || syncMutation.isPending} onRefresh={() => syncMutation.mutate(undefined, { onSettled: () => refetch() })} />
      }
    >
      <SyncStatusBar />
      <Text style={[styles.greeting, { color: palette.text }]}>{greeting()}</Text>
      <Text style={[styles.date, { color: palette.textSecondary }]}>{formatDateHeading()}</Text>

      {!isLoading && nextGroup ? (
        <View style={styles.cardWrapper}>
          <NextLessonCard lessons={nextGroup} isCurrent={isCurrentlyHappening} />
        </View>
      ) : !isLoading ? (
        <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
          {neverSynced ? "Noch keine Daten - bitte synchronisieren." : "Für heute sind keine weiteren Stunden geplant."}
        </Text>
      ) : null}

      {restOfDayGroups.length > 0 ? (
        <View style={styles.restSection}>
          <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>REST DES TAGES</Text>
          {restOfDayGroups.map((group) => (
            <TimelineLessonRow key={group.map((l) => l.id).join("+")} lessons={group} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingTop: 56,
  },
  greeting: {
    fontSize: typography.display.fontSize,
    fontWeight: typography.display.fontWeight,
    letterSpacing: typography.display.letterSpacing,
  },
  date: {
    fontSize: typography.body.fontSize,
    marginBottom: spacing.xl,
  },
  cardWrapper: {
    marginBottom: spacing.xl,
  },
  emptyText: {
    fontSize: typography.body.fontSize,
    marginBottom: spacing.xl,
  },
  restSection: {
    marginTop: spacing.xs,
  },
  sectionHeading: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    marginBottom: spacing.md,
  },
});
