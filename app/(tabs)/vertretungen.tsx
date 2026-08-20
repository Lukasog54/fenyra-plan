import { useMemo, useState } from "react";
import { View, ScrollView, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSubstitutionLessons } from "../../src/query/hooks/useSubstitutionLessons";
import { useSyncMeta } from "../../src/query/hooks/useSync";
import { useSettingsStore } from "../../src/stores/useSettingsStore";
import { SubstitutionList } from "../../src/components/vertretungen/SubstitutionList";
import { SyncStatusBar } from "../../src/components/common/SyncStatusBar";
import { useTheme } from "../../src/theme/ThemeProvider";
import { defaultSyncRange, addDays, todayIsoDate } from "../../src/utils/date";
import { spacing, typography, radius } from "../../src/theme/tokens";
import type { LessonStatus } from "../../src/data/models/Lesson";

type DateFilter = "today" | "tomorrow" | "custom" | "range";
type TypeFilter = Extract<LessonStatus, "cancelled" | "room-change" | "teacher-change" | "subject-change" | "moved">;

const TYPE_FILTERS: Array<{ key: TypeFilter; label: string }> = [
  { key: "cancelled", label: "Ausfälle" },
  { key: "room-change", label: "Raumänderungen" },
  { key: "teacher-change", label: "Lehreränderungen" },
  { key: "subject-change", label: "Fachänderungen" },
  { key: "moved", label: "Verlegungen" },
];

function formatDateHeading(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
}

export default function VertretungenScreen() {
  const { palette } = useTheme();
  const selectedClassName = useSettingsStore((s) => s.selectedClassName);
  const { data: meta } = useSyncMeta();

  const [showAllClasses, setShowAllClasses] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("range");
  const [customDate, setCustomDate] = useState(todayIsoDate());
  const [typeFilters, setTypeFilters] = useState<Set<TypeFilter>>(new Set());

  const range = useMemo(() => {
    if (dateFilter === "today") return { from: todayIsoDate(), to: todayIsoDate() };
    if (dateFilter === "tomorrow") return { from: addDays(todayIsoDate(), 1), to: addDays(todayIsoDate(), 1) };
    if (dateFilter === "custom") return { from: customDate, to: customDate };
    return defaultSyncRange();
  }, [dateFilter, customDate]);

  const classFilter = showAllClasses ? null : selectedClassName;
  const { data: lessons = [] } = useSubstitutionLessons(range.from, range.to, classFilter);

  const filteredLessons = typeFilters.size === 0 ? lessons : lessons.filter((l) => typeFilters.has(l.status as TypeFilter));

  function toggleTypeFilter(key: TypeFilter) {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={styles.container}>
      <SyncStatusBar />
      <Text style={[styles.heading, { color: palette.text }]}>Vertretungen</Text>

      <View style={styles.chipRow}>
        {(["mine", "all"] as const).map((mode) => {
          const isSelected = mode === "mine" ? !showAllClasses : showAllClasses;
          const label = mode === "mine" ? (selectedClassName ? `Meine Klasse (${selectedClassName})` : "Meine Klasse") : "Alle Klassen";
          return (
            <Pressable
              key={mode}
              onPress={() => setShowAllClasses(mode === "all")}
              style={[styles.chip, { borderColor: isSelected ? palette.accent : palette.border, backgroundColor: isSelected ? palette.accent + "1F" : "transparent" }]}
            >
              <Text style={{ color: isSelected ? palette.accent : palette.textSecondary, fontWeight: "600" }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.chipRow}>
        {(
          [
            { key: "today", label: "Heute" },
            { key: "tomorrow", label: "Morgen" },
            { key: "custom", label: "Datum" },
            { key: "range", label: "Zeitraum" },
          ] as const
        ).map((option) => {
          const isSelected = dateFilter === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => {
                if (option.key === "custom") setCustomDate(todayIsoDate());
                setDateFilter(option.key);
              }}
              style={[styles.chip, { borderColor: isSelected ? palette.accent : palette.border, backgroundColor: isSelected ? palette.accent + "1F" : "transparent" }]}
            >
              <Text style={{ color: isSelected ? palette.accent : palette.textSecondary, fontWeight: "600" }}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {dateFilter === "custom" ? (
        <View style={styles.dateNavRow}>
          <Pressable onPress={() => setCustomDate(addDays(customDate, -1))} style={[styles.navButton, { backgroundColor: palette.elevatedSurface }]}>
            <Ionicons name="chevron-back" size={18} color={palette.text} />
          </Pressable>
          <Text style={[styles.dateNavLabel, { color: palette.text }]}>{formatDateHeading(customDate)}</Text>
          <Pressable onPress={() => setCustomDate(addDays(customDate, 1))} style={[styles.navButton, { backgroundColor: palette.elevatedSurface }]}>
            <Ionicons name="chevron-forward" size={18} color={palette.text} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.chipRow}>
        {TYPE_FILTERS.map((option) => {
          const isSelected = typeFilters.has(option.key);
          return (
            <Pressable
              key={option.key}
              onPress={() => toggleTypeFilter(option.key)}
              style={[styles.chip, { borderColor: isSelected ? palette.accent : palette.border, backgroundColor: isSelected ? palette.accent + "1F" : "transparent" }]}
            >
              <Text style={{ color: isSelected ? palette.accent : palette.textSecondary, fontWeight: "600" }}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <SubstitutionList lessons={filteredLessons} neverSynced={!meta?.lastSyncedAt} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingTop: 56,
  },
  heading: {
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
    letterSpacing: typography.heading.letterSpacing,
    marginBottom: spacing.lg,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dateNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  navButton: {
    padding: spacing.sm,
    borderRadius: radius.pill,
  },
  dateNavLabel: {
    fontSize: typography.subtitle.fontSize,
    fontWeight: "700",
    textTransform: "capitalize",
  },
});
