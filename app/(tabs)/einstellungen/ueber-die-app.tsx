import { View, Text, Image, StyleSheet } from "react-native";
import Constants from "expo-constants";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { spacing, typography } from "../../../src/theme/tokens";

export default function UeberDieAppScreen() {
  const { palette } = useTheme();
  const version = Constants.expoConfig?.version ?? "unbekannt";

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.brandBlock}>
        <Image source={require("../../../assets/android-icon-foreground.png")} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.appName, { color: palette.accent }]}>FENYRA</Text>
        <Text style={[styles.appSub, { color: palette.textSecondary }]}>Plan</Text>
        <Text style={[styles.version, { color: palette.muted }]}>Version {version}</Text>
      </View>

      <Text style={[styles.body, { color: palette.text }]}>
        Fenyra Plan ist eine eigenständige, moderne Alternative zu VpMobil24. Die App zeigt ausschließlich Daten aus
        der von dir konfigurierten, autorisierten Schuldatenquelle an — es werden keine Daten erfunden oder von
        VpMobil24 kopiert.
      </Text>
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
});
