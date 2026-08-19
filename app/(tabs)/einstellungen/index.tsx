import { ScrollView, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SettingsRow } from "../../../src/components/settings/SettingsRow";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { spacing, typography } from "../../../src/theme/tokens";

export default function EinstellungenScreen() {
  const { palette } = useTheme();
  const router = useRouter();

  return (
    <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.heading, { color: palette.text }]}>Einstellungen</Text>
      <SettingsRow icon="person-outline" label="Profil" onPress={() => router.push("/einstellungen/profil")} />
      <SettingsRow icon="school-outline" label="Schule" onPress={() => router.push("/einstellungen/schule")} />
      <SettingsRow icon="server-outline" label="Datenquelle" onPress={() => router.push("/einstellungen/datenquelle")} />
      <SettingsRow icon="sync-outline" label="Synchronisierung" onPress={() => router.push("/einstellungen/synchronisierung")} />
      <SettingsRow icon="notifications-outline" label="Benachrichtigungen" onPress={() => router.push("/einstellungen/benachrichtigungen")} />
      <SettingsRow icon="color-palette-outline" label="Darstellung" onPress={() => router.push("/einstellungen/darstellung")} />
      <SettingsRow icon="cloud-offline-outline" label="Offline-Daten" onPress={() => router.push("/einstellungen/offline-daten")} />
      <SettingsRow icon="pulse-outline" label="Daten-Diagnose" onPress={() => router.push("/einstellungen/diagnose")} />
      <SettingsRow icon="shield-checkmark-outline" label="Datenschutz" onPress={() => router.push("/einstellungen/datenschutz")} />
      <SettingsRow icon="information-circle-outline" label="Über die App" onPress={() => router.push("/einstellungen/ueber-die-app")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
  },
  heading: {
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
    letterSpacing: typography.heading.letterSpacing,
    marginBottom: spacing.lg,
  },
});
