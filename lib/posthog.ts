import PostHog from "posthog-react-native";

const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? "";
const posthogHost =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

// PostHog constructor throws if key is empty — only instantiate when key is present
export const posthog = posthogApiKey
  ? new PostHog(posthogApiKey, { host: posthogHost })
  : null;
