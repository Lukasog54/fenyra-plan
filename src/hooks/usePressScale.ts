import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { motion } from "../theme/tokens";

/**
 * Small shared scale-down-on-press effect - `Pressable`'s built-in feedback is opacity-only, this
 * adds a subtle native-thread scale via reanimated. Spread `onPressIn`/`onPressOut` onto the
 * `Pressable` and apply `animatedStyle` to an `Animated.View` wrapping its content.
 */
export function usePressScale(scaleTo: number = 0.97) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return {
    animatedStyle,
    onPressIn: () => {
      scale.value = withTiming(scaleTo, { duration: motion.fast });
    },
    onPressOut: () => {
      scale.value = withTiming(1, { duration: motion.fast });
    },
  };
}
