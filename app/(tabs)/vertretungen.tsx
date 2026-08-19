import { ScrollView, Text, StyleSheet } from "react-native";
import { useSubstitutionLessons } from "../../src/query/hooks/useSubstitutionLessons";
import { SubstitutionList } from "../../src/components/vertretungen/SubstitutionList";
import { SyncStatusBar } from "../../src/components/common/SyncStatusBar";
import { useTheme } from "../../src/theme/ThemeProvider";
import { defaultSyncRange } from "../../src/utils/date";
import { spacing, typography } from "../../src/theme/tokens";

export default function VertretungenScreen() {
  const { palette } = useTheme();
  const { from, to } = defaultSyncRange();
  const { data: lessons = [] } = useSubstitutionLessons(from, to);

  return (
    <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={styles.container}>
      <SyncStatusBar />
      <Text style={[styles.heading, { color: palette.text }]}>Vertretungen</Text>
      <SubstitutionList lessons={lessons} />
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
});
