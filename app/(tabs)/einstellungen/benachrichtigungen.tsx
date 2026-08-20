import { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSettingsStore } from "../../../src/stores/useSettingsStore";
import { requestNotificationPermission } from "../../../src/data/notifications/NotificationService";
import { NOTIFICATION_CATEGORIES, NOTIFICATION_CATEGORY_LABELS } from "../../../src/data/notifications/types";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { Card } from "../../../src/components/common/Card";
import { ToggleRow } from "../../../src/components/common/ToggleRow";
import { spacing, typography } from "../../../src/theme/tokens";

export default function BenachrichtigungenScreen() {
  const { palette } = useTheme();
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const notificationCategories = useSettingsStore((s) => s.notificationCategories);
  const setNotificationCategory = useSettingsStore((s) => s.setNotificationCategory);
  const [permissionDenied, setPermissionDenied] = useState(false);

  async function handleToggleMaster(next: boolean) {
    if (next) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setPermissionDenied(true);
        return;
      }
    }
    setPermissionDenied(false);
    setNotificationsEnabled(next);
  }

  return (
    <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <ToggleRow
          label="Benachrichtigungen"
          hint="Nur bei tatsächlichen Änderungen deines Stundenplans, nicht bei jedem Sync."
          value={notificationsEnabled}
          onToggle={() => handleToggleMaster(!notificationsEnabled)}
        />
      </Card>

      {permissionDenied ? (
        <Text style={[styles.warning, { color: palette.danger }]}>
          Benachrichtigungsberechtigung wurde nicht erteilt. Bitte in den Systemeinstellungen für Fenyra Plan aktivieren.
        </Text>
      ) : null}

      <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>KATEGORIEN</Text>
      <Card style={styles.card}>
        {NOTIFICATION_CATEGORIES.map((category, index) => (
          <View key={category}>
            <ToggleRow
              label={NOTIFICATION_CATEGORY_LABELS[category]}
              value={notificationCategories[category]}
              onToggle={() => setNotificationCategory(category, !notificationCategories[category])}
              disabled={!notificationsEnabled}
            />
            {index < NOTIFICATION_CATEGORIES.length - 1 ? <View style={[styles.divider, { backgroundColor: palette.border }]} /> : null}
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    padding: spacing.xs,
  },
  warning: {
    fontSize: typography.caption.fontSize,
    lineHeight: 16,
    marginTop: -spacing.sm,
  },
  sectionHeading: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
