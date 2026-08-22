import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useTheme } from "../../theme/ThemeProvider";
import { usePressScale } from "../../hooks/usePressScale";
import { lightImpact } from "../../utils/haptics";
import { motion, radius, spacing, typography } from "../../theme/tokens";

interface ToggleRowProps {
  label: string;
  hint?: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const TRACK_WIDTH = 40;
const TRACK_PADDING = 3;
const THUMB_SIZE = 18;
const THUMB_TRAVEL = TRACK_WIDTH - TRACK_PADDING * 2 - THUMB_SIZE;

export function ToggleRow({ label, hint, value, onToggle, disabled }: ToggleRowProps) {
  const { palette } = useTheme();
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressScale(0.98);
  const thumbOffset = useSharedValue(value ? THUMB_TRAVEL : 0);

  useEffect(() => {
    thumbOffset.value = withTiming(value ? THUMB_TRAVEL : 0, { duration: motion.fast });
  }, [value, thumbOffset]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: thumbOffset.value }] }));

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        onPress={() => {
          lightImpact();
          onToggle();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={[styles.row, { opacity: disabled ? 0.5 : 1 }]}
      >
        <View style={styles.textWrapper}>
          <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
          {hint ? <Text style={[styles.hint, { color: palette.textSecondary }]}>{hint}</Text> : null}
        </View>
        <View style={[styles.track, { backgroundColor: value ? palette.accent : palette.border }]}>
          <Animated.View style={[styles.thumb, thumbStyle, { backgroundColor: palette.background }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  textWrapper: {
    flex: 1,
    paddingRight: spacing.md,
  },
  label: {
    fontSize: typography.body.fontSize,
  },
  hint: {
    fontSize: typography.caption.fontSize,
    marginTop: 2,
    lineHeight: 15,
  },
  track: {
    width: TRACK_WIDTH,
    height: 24,
    borderRadius: radius.pill,
    padding: TRACK_PADDING,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.pill,
  },
});
