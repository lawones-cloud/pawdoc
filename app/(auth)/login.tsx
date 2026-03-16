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
import { LinearGradient } from "expo-linear-gradient";
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
    } catch (err: unknown) {
      setGeneralError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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
    } catch (err: unknown) {
      setGeneralError(err instanceof Error ? err.message : "Failed to send reset email.");
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
    } catch (error: unknown) {
      Alert.alert("Error", error instanceof Error ? error.message : "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8F6" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Gradient Hero (top ~40%) ── */}
          <LinearGradient
            colors={["#1B4332", "#2D6A4F", "#52B788"]}
            style={{
              paddingTop: Platform.OS === "ios" ? 60 : 48,
              paddingBottom: 48,
              paddingHorizontal: 32,
              alignItems: "center",
            }}
          >
            {/* Back button */}
            <TouchableOpacity
              style={{
                position: "absolute",
                top: Platform.OS === "ios" ? 60 : 48,
                left: 20,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
              onPress={() => router.push("/landing")}
              accessibilityLabel="Back to home page"
              accessibilityRole="button"
            >
              <Text
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 14,
                  fontFamily: "Inter_500Medium",
                }}
              >
                ← Back
              </Text>
            </TouchableOpacity>

            {/* Logo */}
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: "rgba(255,255,255,0.18)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.3)",
              }}
            >
              <Text style={{ fontSize: 36 }}>🐾</Text>
            </View>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 32,
                fontFamily: "Nunito_700Bold",
                letterSpacing: -0.5,
                marginBottom: 4,
              }}
            >
              PawDoc
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: 14,
                fontFamily: "Inter_400Regular",
              }}
            >
              Your pet's AI doctor
            </Text>
          </LinearGradient>

          {/* ── White bottom sheet (60%) ── */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              marginTop: -28,
              paddingHorizontal: 28,
              paddingTop: 32,
              paddingBottom: 40,
              flex: 1,
              shadowColor: "#1B4332",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.08,
              shadowRadius: 20,
              elevation: 8,
            }}
          >
            {/* Mode toggle */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#F0F4F2",
                borderRadius: 14,
                marginBottom: 24,
                padding: 4,
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 11,
                  alignItems: "center",
                  backgroundColor: mode === "signin" ? "#1B4332" : "transparent",
                  shadowColor: mode === "signin" ? "#1B4332" : "transparent",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: mode === "signin" ? 3 : 0,
                }}
                onPress={() => switchMode("signin")}
                accessibilityLabel="Sign in tab"
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === "signin" }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: mode === "signin" ? "#FFFFFF" : "#52796F",
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  Sign in
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 11,
                  alignItems: "center",
                  backgroundColor: mode === "signup" ? "#1B4332" : "transparent",
                  shadowColor: mode === "signup" ? "#1B4332" : "transparent",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: mode === "signup" ? 3 : 0,
                }}
                onPress={() => switchMode("signup")}
                accessibilityLabel="Create account tab"
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === "signup" }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: mode === "signup" ? "#FFFFFF" : "#52796F",
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  Create account
                </Text>
              </TouchableOpacity>
            </View>

            {/* General error */}
            {generalError && (
              <View
                style={{
                  backgroundColor: "#FEF2F2",
                  borderWidth: 1,
                  borderColor: "#FECACA",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: "#DC2626",
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  {generalError}
                </Text>
              </View>
            )}

            {/* Forgot password confirmation */}
            {forgotPasswordSent && (
              <View
                style={{
                  backgroundColor: "#F0FDF4",
                  borderWidth: 1,
                  borderColor: "#BBF7D0",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: "#059669",
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  Password reset link sent to {email}. Check your email.
                </Text>
              </View>
            )}

            {/* Email */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 13,
                  color: "#52796F",
                  marginBottom: 8,
                  fontFamily: "Inter_500Medium",
                }}
              >
                Email address
              </Text>
              <TextInput
                style={{
                  backgroundColor: emailError ? "#FEF2F2" : "#F7F8F6",
                  borderWidth: 1,
                  borderColor: emailError ? "#FECACA" : "#E2EBE6",
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: "#0F1F17",
                  fontFamily: "Inter_400Regular",
                }}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setEmailError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                accessibilityLabel="Email address input"
              />
              {emailError && (
                <Text
                  style={{
                    color: "#DC2626",
                    fontSize: 12,
                    marginTop: 4,
                    marginLeft: 4,
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  {emailError}
                </Text>
              )}
            </View>

            {/* Password */}
            <View style={{ marginBottom: 8 }}>
              <Text
                style={{
                  fontSize: 13,
                  color: "#52796F",
                  marginBottom: 8,
                  fontFamily: "Inter_500Medium",
                }}
              >
                Password
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: passwordError ? "#FEF2F2" : "#F7F8F6",
                  borderWidth: 1,
                  borderColor: passwordError ? "#FECACA" : "#E2EBE6",
                  borderRadius: 14,
                  alignItems: "center",
                }}
              >
                <TextInput
                  style={{
                    flex: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 15,
                    color: "#0F1F17",
                    fontFamily: "Inter_400Regular",
                  }}
                  placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setPasswordError(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  accessibilityLabel="Password input"
                />
                <TouchableOpacity
                  style={{ paddingHorizontal: 16, paddingVertical: 14 }}
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  accessibilityRole="button"
                >
                  <Text
                    style={{
                      color: "#52796F",
                      fontSize: 13,
                      fontFamily: "Inter_500Medium",
                    }}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
              {passwordError && (
                <Text
                  style={{
                    color: "#DC2626",
                    fontSize: 12,
                    marginTop: 4,
                    marginLeft: 4,
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  {passwordError}
                </Text>
              )}
            </View>

            {/* Forgot password (sign in mode only) */}
            {mode === "signin" && (
              <TouchableOpacity
                style={{ alignSelf: "flex-end", marginBottom: 24 }}
                onPress={handleForgotPassword}
                disabled={loading}
                accessibilityLabel="Forgot password"
                accessibilityRole="button"
              >
                <Text
                  style={{
                    color: "#1B4332",
                    fontSize: 13,
                    fontFamily: "Inter_500Medium",
                  }}
                >
                  Forgot password?
                </Text>
              </TouchableOpacity>
            )}

            {mode === "signup" && <View style={{ marginBottom: 24 }} />}

            {/* Primary CTA */}
            <TouchableOpacity
              style={{
                backgroundColor: loading ? "#52B788" : "#1B4332",
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                marginBottom: 16,
                shadowColor: "#1B4332",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.25,
                shadowRadius: 14,
                elevation: 6,
              }}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityLabel={mode === "signin" ? "Sign in" : "Create account"}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 16,
                    fontFamily: "Inter_600SemiBold",
                    letterSpacing: -0.1,
                  }}
                >
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: "#E2EBE6" }} />
              <Text
                style={{
                  marginHorizontal: 16,
                  color: "#95A89F",
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                }}
              >
                or
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#E2EBE6" }} />
            </View>

            {/* Google OAuth */}
            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderColor: "#E2EBE6",
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 10,
              }}
              onPress={handleGoogleOAuth}
              disabled={loading}
              accessibilityLabel="Continue with Google"
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 20 }}>G</Text>
              <Text
                style={{
                  color: "#0F1F17",
                  fontSize: 15,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                Continue with Google
              </Text>
            </TouchableOpacity>

            {/* Disclaimer */}
            <Text
              style={{
                color: "#95A89F",
                fontSize: 11,
                textAlign: "center",
                marginTop: 24,
                fontFamily: "Inter_400Regular",
                lineHeight: 16,
              }}
            >
              By continuing, you agree to our Terms of Service and Privacy
              Policy. PawDoc is not a substitute for professional veterinary
              care.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
