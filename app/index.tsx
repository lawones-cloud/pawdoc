import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuthSession } from "@/hooks/useAuthSession";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/theme";

export default function Index() {
  const { session, loading: authLoading } = useAuthSession();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) {
      setOnboardingDone(null);
      return;
    }

    // Check if user has at least one pet row (indicates onboarding completed)
    supabase
      .from("pets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .then(({ count, error }) => {
        if (error) {
          // On error, assume onboarding not done so user can complete it
          setOnboardingDone(false);
        } else {
          setOnboardingDone((count ?? 0) > 0);
        }
      });
  }, [session]);

  const loading = authLoading || (session !== null && onboardingDone === null);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!onboardingDone) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
