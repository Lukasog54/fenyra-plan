import { useState } from "react";
import { View, Text, Image, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useTheme } from "../../theme/ThemeProvider";
import { TextField } from "../common/TextField";
import { Button } from "../common/Button";
import { savePassword, credentialKeyFor } from "../../data/security/secureCredentials";
import { resolveAdapter } from "../../data/adapters/registry";
import { PUBLIC_DEMO_SCHOOL_ID } from "../../data/constants";
import { spacing, typography, radius } from "../../theme/tokens";
import type { ConnectionTestResult } from "../../data/models/SchoolDataSource";

const USER_TYPES: Array<{ id: string; label: string }> = [
  { id: "schueler", label: "Schüler" },
  { id: "lehrer", label: "Lehrer" },
];

export function LoginScreen() {
  const { palette } = useTheme();
  const schoolConfig = useSettingsStore((s) => s.schoolConfig);
  const updateSchoolConfig = useSettingsStore((s) => s.updateSchoolConfig);

  const [schoolId, setSchoolId] = useState(schoolConfig.stundenplan24?.schoolId ?? "");
  const [username, setUsername] = useState(schoolConfig.stundenplan24?.username ?? "");
  const [password, setPassword] = useState("");
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [connecting, setConnecting] = useState(false);

  const isPublicDemoSchool = schoolId.trim() === PUBLIC_DEMO_SCHOOL_ID;
  const canSubmit = schoolId.trim().length > 0 && username.trim().length > 0 && (password.length > 0 || isPublicDemoSchool);

  async function handleConnect() {
    if (!canSubmit || connecting) return;
    setConnecting(true);
    setTestResult(null);

    const trimmedSchoolId = schoolId.trim();
    // The public demo school needs no credentials at all (verified live - no Authorization header
    // required) - only save/reference a password if one was actually entered, so no empty
    // credential gets stored and the adapter sends no Auth header for it (see authHeader()).
    let credentialRef: string | undefined;
    if (password.length > 0) {
      await savePassword(schoolConfig.id, password);
      credentialRef = credentialKeyFor(schoolConfig.id);
    }

    const candidateConfig = {
      ...schoolConfig,
      stundenplan24: { ...schoolConfig.stundenplan24!, schoolId: trimmedSchoolId, username, credentialRef },
    };

    const result = await resolveAdapter(candidateConfig).testConnection();
    setTestResult(result);
    setConnecting(false);

    if (result.ok) {
      updateSchoolConfig({ schoolId: trimmedSchoolId, username, credentialRef });
    }
  }

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: palette.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandBlock}>
          <Image source={require("../../../assets/android-icon-foreground.png")} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.appName, { color: palette.accent }]}>FENYRA</Text>
          <Text style={[styles.appSub, { color: palette.textSecondary }]}>Plan</Text>
        </View>

        <Text style={[styles.heading, { color: palette.text }]}>Schule einrichten</Text>

        <TextField
          label="Schulnummer"
          value={schoolId}
          onChangeText={setSchoolId}
          placeholder="8-stellig, z. B. 12345678"
          keyboardType="number-pad"
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
                onPress={() => setUsername(type.id)}
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
          placeholder="oder eigener Benutzername"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.usernameInput}
        />

        <TextField
          label="Passwort"
          value={password}
          onChangeText={setPassword}
          placeholder={isPublicDemoSchool ? "Nicht nötig (öffentliche Testschule)" : "Passwort"}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          hint={isPublicDemoSchool ? "Diese Schulnummer ist Stundenplan24's öffentliche Beispielschule - kein Passwort erforderlich." : undefined}
        />

        <Button label="Verbinden" onPress={handleConnect} loading={connecting} disabled={!canSubmit} style={styles.connectButton} />

        {testResult && !testResult.ok ? <Text style={[styles.errorText, { color: palette.danger }]}>{testResult.message}</Text> : null}

        <Text style={[styles.hint, { color: palette.muted }]}>Datenquelle: Stundenplan24</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  logo: {
    width: 80,
    height: 80,
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
  heading: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    marginBottom: spacing.lg,
    textAlign: "center",
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
  usernameInput: {
    marginTop: spacing.sm,
  },
  connectButton: {
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: typography.caption.fontSize,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  hint: {
    fontSize: typography.caption.fontSize,
    marginTop: spacing.xl,
    textAlign: "center",
  },
});
