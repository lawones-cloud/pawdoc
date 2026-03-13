import { useEffect, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";

/**
 * Auth callback route — handles magic-link and OAuth redirects on web (PKCE flow).
 * Supabase redirects here with ?code=xxx. We exchange it for a session, then navigate home.
 */
export default function AuthCallback() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      // No code in URL — shouldn't happen, but send them to login if it does.
      router.replace("/(auth)/login");
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code as string)
      .then(async ({ data, error }) => {
        if (error) {
          setError(error.message);
          return;
        }
        // Ensure a public.users row exists — there is no DB trigger for this.
        // upsert is safe to call on every login; onConflict(id) is a no-op if row exists.
        if (data.user) {
          await supabase.from("users").upsert(
            { id: data.user.id, email: data.user.email },
            { onConflict: "id", ignoreDuplicates: true }
          );
        }
        router.replace("/(tabs)/home");
      });
  }, [code]);

  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-red-500 text-center mb-4">{error}</Text>
        <Text
          className="text-primary text-sm"
          onPress={() => router.replace("/(auth)/login")}
        >
          Back to login
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background items-center justify-center">
      <ActivityIndicator size="large" color="#2D6A4F" />
    </View>
  );
}
