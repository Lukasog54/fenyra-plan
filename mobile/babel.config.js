module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // As of reanimated v4, the worklets babel transform moved to the separate
    // react-native-worklets package (confirmed: react-native-reanimated/plugin no longer
    // exists in this version). Must stay last per its setup docs.
    plugins: ["react-native-worklets/plugin"],
  };
};
