import { View, Text, Image, Linking, StyleSheet } from "react-native";
import { useUpdateCheck } from "../../../src/query/hooks/useUpdateCheck";
import { useSettingsStore } from "../../../src/stores/useSettingsStore";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { Card } from "../../../src/components/common/Card";
import { Button } from "../../../src/components/common/Button";
import { spacing, typography } from "../../../src/theme/tokens";

export default function UeberDieAppScreen() {
  const { palette } = useTheme();
  const { data: update, isLoading, refetch, isRefetching } = useUpdateCheck();
  const dismissedUpdateVersion = useSettingsStore((s) => s.dismissedUpdateVersion);
  const setDismissedUpdateVersion = useSettingsStore((s) => s.setDismissedUpdateVersion);

  const showUpdateCard = update?.available && update.latestVersion !== dismissedUpdateVersion;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.brandBlock}>
        <Image source={require("../../../assets/android-icon-foreground.png")} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.appName, { color: palette.accent }]}>FENYRA</Text>
        <Text style={[styles.appSub, { color: palette.textSecondary }]}>Plan</Text>
        <Text style={[styles.version, { color: palette.muted }]}>Version {update?.currentVersion ?? "..."}</Text>
      </View>

      <Text style={[styles.body, { color: palette.text }]}>
        Fenyra Plan ist eine eigenständige, moderne Alternative zu VpMobil24. Die App zeigt ausschließlich Daten aus
        der von dir konfigurierten, autorisierten Schuldatenquelle an — es werden keine Daten erfunden oder von
        VpMobil24 kopiert.
      </Text>

      {showUpdateCard ? (
        <Card style={styles.updateCard}>
          <Text style={[styles.updateTitle, { color: palette.accent }]}>Neue Version verfügbar</Text>
          <View style={styles.versionRow}>
            <View>
              <Text style={[styles.label, { color: palette.textSecondary }]}>Aktuell</Text>
              <Text style={[styles.versionValue, { color: palette.text }]}>{update.currentVersion}</Text>
            </View>
            <View>
              <Text style={[styles.label, { color: palette.textSecondary }]}>Neu</Text>
              <Text style={[styles.versionValue, { color: palette.accent }]}>{update.latestVersion}</Text>
            </View>
          </View>
          {update.changelog ? (
            <>
              <Text style={[styles.label, { color: palette.textSecondary, marginTop: spacing.md }]}>ÄNDERUNGEN</Text>
              <Text style={[styles.changelog, { color: palette.text }]}>{update.changelog}</Text>
            </>
          ) : null}
          <View style={styles.buttonRow}>
            <Button
              label="Update"
              onPress={() => Linking.openURL(update.downloadUrl ?? update.htmlUrl)}
              style={styles.updateButton}
            />
            <Button label="Später" variant="secondary" onPress={() => setDismissedUpdateVersion(update.latestVersion)} style={styles.updateButton} />
          </View>
        </Card>
      ) : (
        <Button
          label="Nach Updates suchen"
          variant="secondary"
          onPress={() => refetch()}
          loading={isLoading || isRefetching}
          style={styles.checkButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: spacing.sm,
  },
  appName: {
    fontSize: typography.heading.fontSize,
    fontWeight: "800",
    letterSpacing: 3,
  },
  appSub: {
    fontSize: typography.subtitle.fontSize,
    fontWeight: "500",
    letterSpacing: 2,
    marginTop: 2,
  },
  version: {
    fontSize: typography.caption.fontSize,
    marginTop: spacing.sm,
  },
  body: {
    fontSize: typography.body.fontSize,
    lineHeight: 20,
  },
  checkButton: {
    marginTop: spacing.xl,
  },
  updateCard: {
    marginTop: spacing.xl,
  },
  updateTitle: {
    fontSize: typography.subtitle.fontSize,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  versionRow: {
    flexDirection: "row",
    gap: spacing.xl,
  },
  label: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    textTransform: "uppercase",
  },
  versionValue: {
    fontSize: typography.subtitle.fontSize,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  changelog: {
    fontSize: typography.body.fontSize,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  updateButton: {
    flex: 1,
  },
});
