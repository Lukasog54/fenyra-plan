const { View, Text } = require("react-native");

/**
 * Reanimated v4 (react-native-worklets) touches native modules just by being required, which
 * crashes under Jest even though jest-expo doesn't ship a mock for it. This is a minimal manual
 * mock covering only what this project actually uses: plain View/Text passthrough for
 * `Animated.View`/`Animated.Text`, synchronous shared values, and no-op timing/easing helpers.
 */
function useSharedValue(initial) {
  return { value: initial };
}

function useAnimatedStyle(styleFactory) {
  return styleFactory();
}

function withTiming(toValue) {
  return toValue;
}

function withRepeat(toValue) {
  return toValue;
}

function withSpring(toValue) {
  return toValue;
}

/** Chainable no-op for FadeIn/FadeOut/SlideIn.../.duration()/.delay() builder APIs. */
function chainable() {
  const handler = {
    get: () => proxy,
    apply: () => proxy,
  };
  const proxy = new Proxy(function () {}, handler);
  return proxy;
}

module.exports = {
  __esModule: true,
  default: { View, Text },
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSpring,
  Easing: new Proxy({}, { get: () => (t) => t }),
  FadeIn: chainable(),
  FadeOut: chainable(),
  SlideInDown: chainable(),
  SlideOutDown: chainable(),
};
