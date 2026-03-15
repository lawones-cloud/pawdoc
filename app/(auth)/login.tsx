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

// Used for OAuth (Google) redirects only
const authCallbackUrl = Linking.createURL("auth/callback");

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  function clearErrors() {
    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);
  }

  function switchMode(newMode: Mode) {
    setMode(newMode);
    clearErrors();
    setForgotPasswordSent(false);
  }

  function validate(): boolean {
    clearErrors();
    let valid = true;

    if (!email.trim()) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Enter a valid email address.");
      valid = false;
    }

    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    } else if (mode === "signup" && password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      valid = false;
    }

    return valid;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          if (
            error.message.toLowerCase().includes("invalid login") ||
            error.message.toLowerCase().includes("invalid credentials")
          ) {
            setPasswordError("Incorrect email or password.");
          } else {
            setGeneralError(error.message);
          }
          return;
        }

        // Session established — index.tsx handles onboarding routing
        router.replace("/");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          if (error.message.toLowerCase().includes("already registered")) {
            setEmailError("An account with this email already exists. Sign in instead.");
          } else {
            setGeneralError(error.message);
          }
          return;
        }

        // Ensure a public.users row exists
        if (data.user) {
          await supabase.from("users").upsert(
            { id: data.user.id, email: data.user.email },
            { onConflict: "id", ignoreDuplicates: true }
          );
        }

        router.replace("/");
      }
    } catch (err: any) {
      setGeneralError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    clearErrors();
    if (!email.trim()) {
      setEmailError("Enter your email above to reset your password.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: authCallbackUrl }
      );
      if (error) throw error;
      setForgotPasswordSent(true);
    } catch (err: any) {
      setGeneralError(err.message ?? "Failed to send reset email.");
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

            {/* Mode toggle */}
            <View className="flex-row bg-surface border border-border rounded-xl mb-6 p-1">
              <TouchableOpacity
                className={`flex-1 py-2 rounded-lg items-center ${mode === "signin" ? "bg-primary" : ""}`}
                onPress={() => switchMode("signin")}
                accessibilityLabel="Sign in tab"
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === "signin" }}
              >
                <Text
                  className={`text-sm ${mode === "signin" ? "text-white" : "text-text-secondary"}`}
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  Sign in
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-2 rounded-lg items-center ${mode === "signup" ? "bg-primary" : ""}`}
                onPress={() => switchMode("signup")}
                accessibilityLabel="Create account tab"
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === "signup" }}
              >
                <Text
                  className={`text-sm ${mode === "signup" ? "text-white" : "text-text-secondary"}`}
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  Create account
                </Text>
              </TouchableOpacity>
            </View>

            {/* General error */}
            {generalError && (
              <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm" style={{ fontFamily: "Inter_400Regular" }}>
                  {generalError}
                </Text>
              </View>
            )}

            {/* Forgot password confirmation */}
            {forgotPasswordSent && (
              <View className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
                <Text className="text-green-700 text-sm" style={{ fontFamily: "Inter_400Regular" }}>
                  Password reset link sent to {email}. Check your email.
                </Text>
              </View>
            )}

            {/* Email */}
            <View className="mb-4">
              <Text
                className="text-sm text-text-secondary mb-2"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                Email address
              </Text>
              <TextInput
                className={`bg-surface border rounded-xl px-4 py-3 text-base text-text-primary ${emailError ? "border-red-400" : "border-border"}`}
                style={{ fontFamily: "Inter_400Regular" }}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textSecondary}
                value={email}
                onChangeText={(t) => { setEmail(t); setEmailError(null); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                accessibilityLabel="Email address input"
              />
              {emailError && (
                <Text
                  className="text-red-500 text-xs mt-1 ml-1"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {emailError}
                </Text>
              )}
            </View>

            {/* Password */}
            <View className="mb-2">
              <Text
                className="text-sm text-text-secondary mb-2"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                Password
              </Text>
              <View className={`flex-row bg-surface border rounded-xl items-center ${passwordError ? "border-red-400" : "border-border"}`}>
                <TextInput
                  className="flex-1 px-4 py-3 text-base text-text-primary"
                  style={{ fontFamily: "Inter_400Regular" }}
                  placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
                  placeholderTextColor={Colors.textSecondary}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setPasswordError(null); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  accessibilityLabel="Password input"
                />
                <TouchableOpacity
                  className="px-4 py-3"
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  accessibilityRole="button"
                >
                  <Text className="text-text-secondary text-sm" style={{ fontFamily: "Inter_500Medium" }}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
              {passwordError && (
                <Text
                  className="text-red-500 text-xs mt-1 ml-1"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {passwordError}
                </Text>
              )}
            </View>

            {/* Forgot password (sign in mode only) */}
            {mode === "signin" && (
              <TouchableOpacity
                className="self-end mb-6"
                onPress={handleForgotPassword}
                disabled={loading}
                accessibilityLabel="Forgot password"
                accessibilityRole="button"
              >
                <Text className="text-primary text-sm" style={{ fontFamily: "Inter_500Medium" }}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            )}

            {mode === "signup" && <View className="mb-6" />}

            {/* Primary CTA */}
            <TouchableOpacity
              className="bg-primary rounded-xl py-4 items-center mb-4"
              onPress={handleSubmit}
              disabled={loading}
              accessibilityLabel={mode === "signin" ? "Sign in" : "Create account"}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  className="text-white text-base"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  {mode === "signin" ? "Sign in" : "Create account"}
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
