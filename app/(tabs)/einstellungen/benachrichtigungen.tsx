import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { radius, spacing, typography } from "../../../src/theme/tokens";

export default function BenachrichtigungenScreen() {
  const { palette } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.iconWrapper, { backgroundColor: palette.elevatedSurface }]}>
        <Ionicons name="notifications-outline" size={28} color={palette.accent} />
      </View>
      <Text style={[styles.title, { color: palette.text }]}>Kommt bald</Text>
      <Text style={[styles.body, { color: palette.textSecondary }]}>
        Push-Benachrichtigungen bei echten Änderungen deines Stundenplans sind für eine spätere Version geplant.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
  },
  body: {
    fontSize: typography.body.fontSize,
    textAlign: "center",
    lineHeight: 20,
  },
});
