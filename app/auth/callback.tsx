import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

/**
 * Auth callback route — handles magic-link and OAuth redirects on web.
 * On web, detectSessionInUrl:true causes Supabase to automatically exchange
 * the token in the URL. We just wait for the session and navigate away.
 */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        router.replace("/(tabs)/home");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <View className="flex-1 bg-background items-center justify-center">
      <ActivityIndicator size="large" color="#2D6A4F" />
    </View>
  );
}
