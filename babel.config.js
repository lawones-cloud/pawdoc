module.exports = function (api) {
  api.cache(true);
  const isWeb = process.env.EXPO_PLATFORM === "web" || process.env.NODE_ENV === "test";
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      ...(isWeb ? [] : ["nativewind/babel"]),
    ],
  };
};
