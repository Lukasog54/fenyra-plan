import { View, Text, StyleSheet } from "react-native";
import type { Lesson } from "../../data/models/Lesson";
import { SubstitutionListItem } from "./SubstitutionListItem";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";

/** Groups already-parallel-grouped lesson groups by date, for the date section headers. */
function groupByDate(groups: Lesson[][]): Array<[string, Lesson[][]]> {
  const byDate = new Map<string, Lesson[][]>();
  for (const group of groups) {
    const date = group[0].date;
    const list = byDate.get(date) ?? [];
    list.push(group);
    byDate.set(date, list);
  }
  return [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

function formatDateHeading(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
}

/** `groups` are lesson groups (same date+className+period) with at least one real change in
 * each - see useSubstitutionLessons. A group with more than one lesson means parallel elective
 * groups at that period, at least one of which is affected. */
export function SubstitutionList({ groups, neverSynced = false }: { groups: Lesson[][]; neverSynced?: boolean }) {
  const { palette } = useTheme();

  if (groups.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: palette.textSecondary }}>
          {neverSynced ? "Noch keine Daten - bitte synchronisieren." : "Keine Vertretungen im ausgewählten Zeitraum."}
        </Text>
      </View>
    );
  }

  const byDate = groupByDate(groups);

  return (
    <View>
      {byDate.map(([date, dateGroups]) => (
        <View key={date} style={styles.group}>
          <Text style={[styles.heading, { color: palette.textSecondary }]}>{formatDateHeading(date)}</Text>
          {dateGroups.map((group) => (
            <SubstitutionListItem key={group.map((l) => l.id).join("+")} lessons={group} />
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
