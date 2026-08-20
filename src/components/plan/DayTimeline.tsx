import { View, Text, StyleSheet } from "react-native";
import type { Lesson } from "../../data/models/Lesson";
import { TimelineLessonRow } from "./TimelineLessonRow";
import { useTheme } from "../../theme/ThemeProvider";

export function DayTimeline({ lessons, neverSynced = false }: { lessons: Lesson[]; neverSynced?: boolean }) {
  const { palette } = useTheme();

  if (lessons.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: palette.textSecondary }}>
          {neverSynced ? "Noch keine Daten - bitte synchronisieren." : "Keine Stunden an diesem Tag."}
        </Text>
      </View>
    );
  }

  return (
    <View>
      {lessons.map((lesson) => (
        <TimelineLessonRow key={lesson.id} lesson={lesson} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingVertical: 48,
    alignItems: "center",
  },
});
