import { Pressable, type GestureResponderEvent, type PressableProps } from "react-native";
import Animated from "react-native-reanimated";
import { usePressScale } from "../../hooks/usePressScale";

interface PressableScaleProps extends PressableProps {
  scaleTo?: number;
}

/** `Pressable` with the shared scale-down-on-press effect from `usePressScale` baked in, for the
 * many small icon/nav buttons across the app that only need that one bit of extra polish. */
export function PressableScale({ scaleTo, onPressIn, onPressOut, children, ...props }: PressableScaleProps) {
  const { animatedStyle, onPressIn: scaleIn, onPressOut: scaleOut } = usePressScale(scaleTo);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...props}
        onPressIn={(e: GestureResponderEvent) => {
          scaleIn();
          onPressIn?.(e);
        }}
        onPressOut={(e: GestureResponderEvent) => {
          scaleOut();
          onPressOut?.(e);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
