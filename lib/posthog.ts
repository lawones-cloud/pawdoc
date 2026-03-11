import PostHog from "posthog-react-native";

const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? "";
const posthogHost =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

export const posthog = new PostHog(posthogApiKey, {
  host: posthogHost,
  // Disable in development if no key is set
  disabled: !posthogApiKey,
});
