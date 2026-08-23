import { useState } from "react";
import { View, Text, TextInput, StyleSheet, type StyleProp, type ViewStyle, type TextInputProps } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing, typography } from "../../theme/tokens";

interface TextFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  /** Style for the outer wrapper (e.g. `flex: 1` in a row layout) - `style` itself targets the input. */
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextField({ label, hint, style, containerStyle, onFocus, onBlur, ...inputProps }: TextFieldProps) {
  const { palette } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, { color: palette.textSecondary }]}>{label}</Text> : null}
      <TextInput
        {...inputProps}
        placeholderTextColor={palette.muted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            color: palette.text,
            backgroundColor: palette.surface,
            borderColor: focused ? palette.accent : palette.border,
            shadowColor: focused ? palette.glow : "transparent",
          },
          style,
        ]}
      />
      {hint ? <Text style={[styles.hint, { color: palette.muted }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    textTransform: "uppercase",
    marginBottom: spacing.xs + 2,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    fontSize: typography.body.fontSize,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 0,
  },
  hint: {
    fontSize: typography.caption.fontSize,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
});
