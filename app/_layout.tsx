import "../global.css";

import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Session } from "@supabase/supabase-js";
import { PostHogProvider } from "posthog-react-native";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Nunito_700Bold,
  Nunito_600SemiBold,
} from "@expo-google-fonts/nunito";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";

import { supabase } from "@/lib/supabase";
import { posthog } from "@/lib/posthog";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  const [fontsLoaded] = useFonts({
    Nunito_700Bold,
    Nunito_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoaded && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [authLoaded, fontsLoaded]);

  if (!authLoaded || !fontsLoaded) {
    return null;
  }

  const inner = (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="landing" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="pet-form" />
        <Stack.Screen name="pet-detail" />
        <Stack.Screen name="reminder-form" />
        <Stack.Screen name="auth/callback" />
      </Stack>
      <StatusBar style="dark" backgroundColor="#FAFAFA" />
    </SafeAreaProvider>
  );

  return posthog ? (
    <PostHogProvider client={posthog}>{inner}</PostHogProvider>
  ) : (
    inner
  );
}
