import { View, StyleSheet, type ViewProps } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";

interface CardProps extends ViewProps {
  /** Uses the slightly lighter "elevated" surface instead of the base card color. */
  elevated?: boolean;
  /** Applies a dezent cyan glow border/shadow, e.g. for the current lesson or an active state. */
  glowing?: boolean;
}

export function Card({ style, elevated, glowing, ...props }: CardProps) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? palette.elevatedSurface : palette.card,
          borderColor: glowing ? palette.accent : palette.border,
          borderWidth: glowing ? 1.5 : StyleSheet.hairlineWidth,
          shadowColor: glowing ? palette.glow : "transparent",
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 0,
  },
});
