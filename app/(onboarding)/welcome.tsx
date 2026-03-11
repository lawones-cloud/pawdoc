import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const name = displayName.trim();
    if (!name) {
      Alert.alert("Please enter your name", "We need your name to personalise your experience.");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      // Save display_name to users table
      await supabase
        .from("users")
        .update({ display_name: name })
        .eq("id", user.id);

      // Request notification permission
      const { status } = await Notifications.requestPermissionsAsync();

      if (status === "granted") {
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          const pushToken = tokenData.data;
          await supabase
            .from("users")
            .update({ push_token: pushToken })
            .eq("id", user.id);
        } catch {
          // Token fetch failed — continue without blocking
        }
      }
      // If denied: proceed without push token — fall back to email only

      router.push("/(onboarding)/setup");
    } catch {
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-16 pb-10 justify-between">
            <View className="items-center">
              {/* Icon */}
              <View className="w-24 h-24 rounded-full bg-primary items-center justify-center mb-8">
                <Text className="text-5xl">🐾</Text>
              </View>

              {/* Title */}
              <Text
                className="text-3xl text-primary text-center mb-3"
                style={{ fontFamily: "Nunito_700Bold" }}
              >
                Meet PawDoc
              </Text>

              {/* Body */}
              <Text
                className="text-base text-text-secondary text-center mb-10 max-w-xs"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                The AI-powered health companion for your furry best friend.
                Let's get started.
              </Text>

              {/* Name input */}
              <View className="w-full max-w-sm mb-2">
                <Text
                  className="text-sm text-text-primary mb-2"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  What's your name?
                </Text>
                <TextInput
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-base"
                  style={{ fontFamily: "Inter_400Regular" }}
                  placeholder="Enter your name"
                  placeholderTextColor={Colors.textSecondary}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                  editable={!loading}
                />
              </View>
            </View>

            {/* CTA */}
            <View className="items-center">
              <TouchableOpacity
                className="w-full max-w-sm bg-primary rounded-xl py-4 items-center"
                onPress={handleContinue}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Continue to pet setup"
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    className="text-white text-base"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    Continue
                  </Text>
                )}
              </TouchableOpacity>

              {/* Step indicator */}
              <View className="flex-row mt-6 gap-2">
                <View className="w-6 h-2 rounded-full bg-primary" />
                <View className="w-2 h-2 rounded-full bg-border" />
                <View className="w-2 h-2 rounded-full bg-border" />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
