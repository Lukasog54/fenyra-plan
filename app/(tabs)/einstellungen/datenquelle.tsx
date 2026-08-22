import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useSettingsStore } from "../../../src/stores/useSettingsStore";
import { resolveAdapter } from "../../../src/data/adapters/registry";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { Card } from "../../../src/components/common/Card";
import { TextField } from "../../../src/components/common/TextField";
import { Button } from "../../../src/components/common/Button";
import type { ConnectionTestResult } from "../../../src/data/models/SchoolDataSource";
import { savePassword, deletePassword, credentialKeyFor } from "../../../src/data/security/secureCredentials";
import { clearOfflineData } from "../../../src/data/database/db";
import { radius, spacing, typography } from "../../../src/theme/tokens";

const USER_TYPES: Array<{ id: string; label: string }> = [
  { id: "schueler", label: "Schüler" },
  { id: "lehrer", label: "Lehrer" },
];

export default function DatenquelleScreen() {
  const { palette } = useTheme();
  const schoolConfig = useSettingsStore((s) => s.schoolConfig);
  const updateSchoolConfig = useSettingsStore((s) => s.updateSchoolConfig);
  const queryClient = useQueryClient();

  const [schoolId, setSchoolId] = useState(schoolConfig.stundenplan24?.schoolId ?? "");
  const [username, setUsername] = useState(schoolConfig.stundenplan24?.username ?? "");
  const [password, setPassword] = useState("");
  const [hasSavedPassword, setHasSavedPassword] = useState(Boolean(schoolConfig.stundenplan24?.credentialRef));
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  function saveBasics(nextUsername: string = username) {
    updateSchoolConfig({ schoolId, username: nextUsername });
  }

  async function savePasswordField() {
    if (!password) return;
    await savePassword(schoolConfig.id, password);
    setHasSavedPassword(true);
    setPassword("");
    updateSchoolConfig({ schoolId, username, credentialRef: credentialKeyFor(schoolConfig.id) });
  }

  function confirmRemoveSavedPassword() {
    Alert.alert(
      "Zugangsdaten entfernen?",
      "Entfernt das gespeicherte Passwort und alle auf diesem Gerät zwischengespeicherten Stundenplan- und Vertretungsdaten dieser Schule. Sinnvoll z. B. bevor du das Gerät weitergibst - so sieht niemand sonst deine Daten.",
      [
        { text: "Abbrechen", style: "cancel" },
        { text: "Entfernen", style: "destructive", onPress: removeSavedPasswordAndCachedData },
      ]
    );
  }

  async function removeSavedPasswordAndCachedData() {
    await deletePassword(schoolConfig.id);
    await clearOfflineData();
    await queryClient.invalidateQueries();
    setHasSavedPassword(false);
    updateSchoolConfig({ schoolId, username, credentialRef: undefined });
  }

  async function testStundenplan24Connection() {
    setTesting(true);
    setTestResult(null);

    let credentialRef = schoolConfig.stundenplan24?.credentialRef;
    if (password) {
      await savePassword(schoolConfig.id, password);
      credentialRef = credentialKeyFor(schoolConfig.id);
      setHasSavedPassword(true);
      setPassword("");
    }

    const adapter = resolveAdapter({
      ...schoolConfig,
      stundenplan24: { ...schoolConfig.stundenplan24!, schoolId, username, credentialRef },
    });
    const result = await adapter.testConnection();
    setTestResult(result);
    setTesting(false);
  }

  return (
    <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={styles.container}>
      <Card>
        <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>SERVER</Text>
        <Text style={[styles.serverUrl, { color: palette.text }]}>{schoolConfig.stundenplan24?.baseUrl}</Text>
      </Card>

      <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>ZUGANGSDATEN</Text>
      <Card style={{ gap: 0 }}>
        <TextField
          label="Schulnummer"
          value={schoolId}
          onChangeText={setSchoolId}
          onBlur={() => saveBasics()}
          placeholder="8-stellig, z. B. 12345678"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>BENUTZER</Text>
        <View style={styles.chipRow}>
          {USER_TYPES.map((type) => {
            const isSelected = username === type.id;
            return (
              <Pressable
                key={type.id}
                onPress={() => {
                  setUsername(type.id);
                  saveBasics(type.id);
                }}
                style={[
                  styles.chip,
                  { borderColor: isSelected ? palette.accent : palette.border, backgroundColor: isSelected ? palette.accent + "1F" : "transparent" },
                ]}
              >
                <Text style={{ color: isSelected ? palette.accent : palette.textSecondary, fontWeight: "600" }}>{type.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextField
          label=""
          value={username}
          onChangeText={setUsername}
          onBlur={() => saveBasics()}
          placeholder="oder eigener Benutzername"
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={styles.usernameField}
        />

        <View style={styles.passwordLabelRow}>
          <Text style={[styles.fieldLabel, { color: palette.textSecondary, marginBottom: 0 }]}>PASSWORT</Text>
          {hasSavedPassword ? (
            <Pressable onPress={confirmRemoveSavedPassword}>
              <Text style={[styles.removeLink, { color: palette.danger }]}>Entfernen</Text>
            </Pressable>
          ) : null}
        </View>
        <TextField
          label=""
          value={password}
          onChangeText={setPassword}
          onBlur={savePasswordField}
          placeholder={hasSavedPassword ? "•••••••• (gespeichert) – zum Ändern neu eingeben" : "Passwort"}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          hint="Wird verschlüsselt im Android Keystore bzw. iOS Schlüsselbund gespeichert, niemals im Klartext."
        />

        <Button label="Verbindung testen" onPress={testStundenplan24Connection} loading={testing} style={{ marginTop: spacing.sm }} />

        {testResult ? (
          <View style={styles.resultRow}>
            <Ionicons
              name={testResult.ok ? "checkmark-circle" : "alert-circle"}
              size={16}
              color={testResult.ok ? palette.success : palette.danger}
            />
            <Text style={[styles.testResult, { color: testResult.ok ? palette.success : palette.danger }]}>{testResult.message}</Text>
          </View>
        ) : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  serverUrl: {
    fontSize: typography.subtitle.fontSize,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  sectionHeading: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    marginTop: spacing.sm,
  },
  fieldLabel: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    marginBottom: spacing.xs + 2,
  },
  chipRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  usernameField: {
    marginTop: spacing.sm,
  },
  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  removeLink: {
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  testResult: {
    fontSize: typography.caption.fontSize,
    flexShrink: 1,
  },
});
