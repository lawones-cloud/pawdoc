module.exports = function (api) {
  // api.caller detects platform in Metro worker context (env vars not propagated to workers)
  const isWeb = api.caller(caller => !!(caller && caller.platform === 'web')) ||
                process.env.EXPO_PLATFORM === "web" ||
                process.env.NODE_ENV === "test";
  api.cache.using(() => isWeb);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      ...(isWeb ? [] : ["nativewind/babel"]),
    ],
  };
};
