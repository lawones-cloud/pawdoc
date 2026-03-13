import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/theme";

// Resolves to pawdoc://auth/callback on native, https://<host>/auth/callback on web.
const authCallbackUrl = Linking.createURL("auth/callback");

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handleMagicLink() {
    if (!email.trim()) {
      Alert.alert("Email required", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: authCallbackUrl,
        },
      });

      if (error) throw error;

      setMagicLinkSent(true);
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Failed to send magic link.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleOAuth() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: authCallbackUrl,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  if (magicLinkSent) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-6">
          <Text className="text-4xl">📬</Text>
        </View>
        <Text
          className="text-2xl text-primary text-center mb-3"
          style={{ fontFamily: "Nunito_700Bold" }}
        >
          Check your email
        </Text>
        <Text
          className="text-base text-text-secondary text-center mb-6"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          We sent a magic link to{"\n"}
          <Text className="text-text-primary" style={{ fontFamily: "Inter_600SemiBold" }}>
            {email}
          </Text>
        </Text>
        <TouchableOpacity
          onPress={() => setMagicLinkSent(false)}
          accessibilityLabel="Try a different email"
          accessibilityRole="button"
        >
          <Text className="text-primary text-sm" style={{ fontFamily: "Inter_500Medium" }}>
            Try a different email
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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
          <View className="flex-1 px-6 pt-12 pb-8">
            {/* Back to landing */}
            <TouchableOpacity
              className="mb-8"
              onPress={() => router.push("/landing")}
              accessibilityLabel="Back to home page"
              accessibilityRole="button"
            >
              <Text className="text-primary text-sm" style={{ fontFamily: "Inter_500Medium" }}>
                ← Back
              </Text>
            </TouchableOpacity>

            {/* Branding */}
            <View className="items-center mb-10">
              <View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-4">
                <Text className="text-4xl">🐾</Text>
              </View>
              <Text
                className="text-3xl text-primary"
                style={{ fontFamily: "Nunito_700Bold" }}
              >
                PawDoc
              </Text>
              <Text
                className="text-sm text-text-secondary mt-1"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                Your pet's AI doctor
              </Text>
            </View>

            {/* Email Magic Link */}
            <Text
              className="text-xl text-text-primary mb-6"
              style={{ fontFamily: "Nunito_700Bold" }}
            >
              Sign in or create account
            </Text>

            <View className="mb-4">
              <Text
                className="text-sm text-text-secondary mb-2"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                Email address
              </Text>
              <TextInput
                className="bg-surface border border-border rounded-xl px-4 py-3 text-base text-text-primary"
                style={{ fontFamily: "Inter_400Regular" }}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                accessibilityLabel="Email address input"
              />
            </View>

            <TouchableOpacity
              className="bg-primary rounded-xl py-4 items-center mb-4"
              onPress={handleMagicLink}
              disabled={loading}
              accessibilityLabel="Send magic link"
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  className="text-white text-base"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  Send Magic Link
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center mb-4">
              <View className="flex-1 h-px bg-border" />
              <Text
                className="mx-4 text-text-secondary text-sm"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                or
              </Text>
              <View className="flex-1 h-px bg-border" />
            </View>

            {/* Google OAuth */}
            <TouchableOpacity
              className="border border-border bg-surface rounded-xl py-4 items-center flex-row justify-center gap-3"
              onPress={handleGoogleOAuth}
              disabled={loading}
              accessibilityLabel="Continue with Google"
              accessibilityRole="button"
            >
              <Text className="text-xl">G</Text>
              <Text
                className="text-text-primary text-base"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Continue with Google
              </Text>
            </TouchableOpacity>

            {/* Disclaimer */}
            <Text
              className="text-xs text-text-secondary text-center mt-8"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              By continuing, you agree to our Terms of Service and Privacy
              Policy. PawDoc is not a substitute for professional veterinary
              care.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
