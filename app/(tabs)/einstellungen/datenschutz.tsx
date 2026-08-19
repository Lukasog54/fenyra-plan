import { ScrollView, Text, StyleSheet } from "react-native";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { spacing, typography } from "../../../src/theme/tokens";

export default function DatenschutzScreen() {
  const { palette } = useTheme();
  return (
    <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.paragraph, { color: palette.text }]}>
        Fenyra speichert Stundenplan- und Vertretungsdaten ausschließlich lokal auf diesem Gerät, um sie offline
        verfügbar zu machen.
      </Text>
      <Text style={[styles.paragraph, { color: palette.text }]}>
        Es werden nur Daten der von dir konfigurierten, autorisierten Schuldatenquelle abgerufen. Zugangsdaten
        werden nicht im Klartext gespeichert und nicht protokolliert.
      </Text>
      <Text style={[styles.paragraph, { color: palette.textSecondary }]}>
        Eine vollständige Datenschutzerklärung wird ergänzt, sobald eine reale Schuldatenquelle angebunden ist.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  paragraph: {
    fontSize: typography.body.fontSize,
    lineHeight: 20,
  },
});
