import { View, Text, StyleSheet } from "react-native";
import type { Lesson } from "../../data/models/Lesson";
import { SubstitutionListItem } from "./SubstitutionListItem";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";

function groupByDate(lessons: Lesson[]): Array<[string, Lesson[]]> {
  const groups = new Map<string, Lesson[]>();
  for (const lesson of lessons) {
    const list = groups.get(lesson.date) ?? [];
    list.push(lesson);
    groups.set(lesson.date, list);
  }
  return [...groups.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

function formatDateHeading(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
}

export function SubstitutionList({ lessons, neverSynced = false }: { lessons: Lesson[]; neverSynced?: boolean }) {
  const { palette } = useTheme();

  if (lessons.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: palette.textSecondary }}>
          {neverSynced ? "Noch keine Daten - bitte synchronisieren." : "Keine Vertretungen im ausgewählten Zeitraum."}
        </Text>
      </View>
    );
  }

  const groups = groupByDate(lessons);

  return (
    <View>
      {groups.map(([date, dateLessons]) => (
        <View key={date} style={styles.group}>
          <Text style={[styles.heading, { color: palette.textSecondary }]}>{formatDateHeading(date)}</Text>
          {dateLessons.map((lesson) => (
            <SubstitutionListItem key={lesson.id} lesson={lesson} />
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
  group: {
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
});
