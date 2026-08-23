import { Pressable, Text, ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { useTheme } from "../../theme/ThemeProvider";
import { usePressScale } from "../../hooks/usePressScale";
import { radius, spacing, typography } from "../../theme/tokens";

export type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = "primary", loading, disabled, style }: ButtonProps) {
  const { palette } = useTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();

  const background =
    variant === "primary" ? palette.accent : variant === "danger" ? "transparent" : "transparent";
  const borderColor = variant === "primary" ? palette.accent : variant === "danger" ? palette.danger : palette.border;
  const textColor = variant === "primary" ? palette.accentText : variant === "danger" ? palette.danger : palette.text;

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        style={({ pressed }) => [styles.base, { backgroundColor: background, borderColor, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}
      >
        {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.label, { color: textColor }]}>{label}</Text>}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: typography.subtitle.fontSize,
    fontWeight: typography.subtitle.fontWeight,
  },
});
