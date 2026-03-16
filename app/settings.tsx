/**
 * PawDoc — Settings Screen
 *
 * Accessible via the ⚙️ gear icon on the Home screen header.
 * Sections: Account, Notifications (info), Subscription, About, Sign Out, Danger Zone.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserProfile {
  display_name: string;
  email: string;
  pet_count: number;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionLabel({ title }: { title: string }) {
  return (
    <Text
      style={{
        color: "#52796F",
        fontSize: 11,
        fontFamily: "Inter_600SemiBold",
        letterSpacing: 0.8,
        textTransform: "uppercase",
        marginBottom: 8,
        marginTop: 28,
        paddingHorizontal: 4,
      }}
    >
      {title}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#1B4332",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      {children}
    </View>
  );
}

function Divider() {
  return (
    <View
      style={{ height: 1, backgroundColor: "#F0F4F2", marginLeft: 50 }}
    />
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  destructive,
  noChevron,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  noChevron?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 15,
      }}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={label}
    >
      <Text style={{ fontSize: 18, marginRight: 14, width: 24, textAlign: "center" }}>
        {icon}
      </Text>
      <Text
        style={{
          flex: 1,
          color: destructive ? "#DC2626" : "#0F1F17",
          fontSize: 15,
          fontFamily: "Inter_400Regular",
        }}
      >
        {label}
      </Text>
      {value ? (
        <Text
          style={{
            color: "#95A89F",
            fontSize: 13,
            fontFamily: "Inter_400Regular",
            marginRight: noChevron ? 0 : 6,
          }}
        >
          {value}
        </Text>
      ) : null}
      {!noChevron && onPress && (
        <Text style={{ color: "#C5D4CC", fontSize: 20 }}>›</Text>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function SettingsScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile>({
    display_name: "",
    email: "",
    pet_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // ── Load profile ────────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: userData }, { count }] = await Promise.all([
        supabase
          .from("users")
          .select("display_name")
          .eq("id", user.id)
          .single(),
        supabase
          .from("pets")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      setProfile({
        display_name: userData?.display_name ?? "",
        email: user.email ?? "",
        pet_count: count ?? 0,
      });
      setNameInput(userData?.display_name ?? "");
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── Save display name ───────────────────────────────────────────────────
  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Please enter a display name.");
      return;
    }
    setSavingName(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("users")
        .update({ display_name: trimmed })
        .eq("id", user.id);
      setProfile((p) => ({ ...p, display_name: trimmed }));
      setEditingName(false);
    } catch {
      Alert.alert("Error", "Could not save name. Please try again.");
    } finally {
      setSavingName(false);
    }
  };

  // ── Sign out ────────────────────────────────────────────────────────────
  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of PawDoc?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  // ── Delete account ──────────────────────────────────────────────────────
  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account, all pet profiles, health records, and reminders. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "Type DELETE to confirm — all your data will be lost.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, Delete",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await supabase.auth.signOut();
                      router.replace("/(auth)/login");
                    } catch {
                      Alert.alert(
                        "Error",
                        "Could not delete account. Please contact support at support@pawdoc.app"
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // ── Initials avatar ─────────────────────────────────────────────────────
  const initials = profile.display_name
    ? profile.display_name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
    : "?";

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F8F6" }} edges={["top"]}>
        <LinearGradient
          colors={["#1B4332", "#2D6A4F"]}
          style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: "row", alignItems: "center" }}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 18, marginRight: 6 }}>
              ‹
            </Text>
            <Text style={{ color: "#FFFFFF", fontSize: 22, fontFamily: "Nunito_700Bold" }}>
              Settings
            </Text>
          </TouchableOpacity>
        </LinearGradient>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#1B4332" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F8F6" }} edges={["top"]}>
      {/* Header */}
      <LinearGradient
        colors={["#1B4332", "#2D6A4F"]}
        style={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 20,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", marginRight: 10 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 22, lineHeight: 26 }}>
            ‹
          </Text>
        </TouchableOpacity>
        <Text style={{ color: "#FFFFFF", fontSize: 22, fontFamily: "Nunito_700Bold" }}>
          Settings
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Card ── */}
        <SectionLabel title="Account" />
        <Card>
          {/* Avatar + Name + Email */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 18,
            }}
          >
            <LinearGradient
              colors={["#1B4332", "#52B788"]}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 18,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                {initials}
              </Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#0F1F17",
                  fontSize: 16,
                  fontFamily: "Inter_600SemiBold",
                  marginBottom: 2,
                }}
              >
                {profile.display_name || "—"}
              </Text>
              <Text
                style={{
                  color: "#52796F",
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                }}
              >
                {profile.email}
              </Text>
            </View>
          </View>

          <Divider />

          {/* Edit display name */}
          {editingName ? (
            <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
              <Text
                style={{
                  color: "#52796F",
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  marginBottom: 8,
                }}
              >
                New display name
              </Text>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Your name"
                placeholderTextColor="#9CA3AF"
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={saveName}
                style={{
                  backgroundColor: "#F7F8F6",
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#E2EBE6",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 15,
                  color: "#0F1F17",
                  fontFamily: "Inter_400Regular",
                  marginBottom: 10,
                }}
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => {
                    setNameInput(profile.display_name);
                    setEditingName(false);
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#E2EBE6",
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                  accessibilityLabel="Cancel"
                  accessibilityRole="button"
                >
                  <Text
                    style={{
                      color: "#52796F",
                      fontSize: 14,
                      fontFamily: "Inter_600SemiBold",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveName}
                  disabled={savingName}
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    backgroundColor: "#1B4332",
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                  accessibilityLabel="Save name"
                  accessibilityRole="button"
                >
                  {savingName ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 14,
                        fontFamily: "Inter_600SemiBold",
                      }}
                    >
                      Save
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Row
              icon="✏️"
              label="Edit Display Name"
              onPress={() => setEditingName(true)}
            />
          )}
        </Card>

        {/* ── Subscription ── */}
        <SectionLabel title="Subscription" />
        <Card>
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 18, marginRight: 14, width: 24, textAlign: "center" }}>
              🐾
            </Text>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#0F1F17",
                  fontSize: 15,
                  fontFamily: "Inter_600SemiBold",
                  marginBottom: 2,
                }}
              >
                Free Plan
              </Text>
              <Text
                style={{
                  color: "#52796F",
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                }}
              >
                {profile.pet_count}/2 pets used
              </Text>
            </View>
          </View>
          <Divider />
          <TouchableOpacity
            style={{
              margin: 12,
              borderRadius: 12,
              overflow: "hidden",
            }}
            onPress={() =>
              Alert.alert(
                "Coming Soon",
                "Premium plan with unlimited pets, priority AI, and advanced analytics is coming soon!"
              )
            }
            accessibilityLabel="Upgrade to Premium"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={["#1B4332", "#52B788"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: 13,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 16, marginRight: 10 }}>✨</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontFamily: "Inter_600SemiBold",
                    marginBottom: 1,
                  }}
                >
                  Upgrade to Premium
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 12,
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  Unlimited pets · Priority AI · Advanced analytics
                </Text>
              </View>
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 18 }}>→</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Card>

        {/* ── Notifications ── */}
        <SectionLabel title="Notifications" />
        <Card>
          <Row
            icon="🔔"
            label="Manage Notifications"
            value="Device Settings"
            onPress={() => Linking.openSettings()}
          />
        </Card>

        {/* ── About ── */}
        <SectionLabel title="About" />
        <Card>
          <Row
            icon="ℹ️"
            label="App Version"
            value="1.0.0"
            noChevron
          />
          <Divider />
          <Row
            icon="🔒"
            label="Privacy Policy"
            onPress={() =>
              Linking.openURL("https://pawdoc.app/privacy")
            }
          />
          <Divider />
          <Row
            icon="📄"
            label="Terms of Service"
            onPress={() =>
              Linking.openURL("https://pawdoc.app/terms")
            }
          />
          <Divider />
          <Row
            icon="⭐"
            label="Rate PawDoc"
            onPress={() =>
              Linking.openURL(
                "https://play.google.com/store/apps/details?id=com.lawones.pawdoc"
              )
            }
          />
          <Divider />
          <Row
            icon="💬"
            label="Contact Support"
            onPress={() =>
              Linking.openURL("mailto:support@pawdoc.app?subject=PawDoc Support")
            }
          />
        </Card>

        {/* ── Sign Out ── */}
        <SectionLabel title="Session" />
        <Card>
          <TouchableOpacity
            onPress={handleSignOut}
            disabled={signingOut}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 15,
            }}
            accessibilityLabel="Sign out"
            accessibilityRole="button"
          >
            <Text style={{ fontSize: 18, marginRight: 14, width: 24, textAlign: "center" }}>
              🚪
            </Text>
            {signingOut ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Text
                style={{
                  color: "#DC2626",
                  fontSize: 15,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                Sign Out
              </Text>
            )}
          </TouchableOpacity>
        </Card>

        {/* ── Danger Zone ── */}
        <SectionLabel title="Danger Zone" />
        <Card>
          <Row
            icon="🗑️"
            label="Delete Account"
            destructive
            onPress={handleDeleteAccount}
          />
        </Card>

        {/* Affiliate disclosure */}
        <Text
          style={{
            color: "#95A89F",
            fontSize: 11,
            fontFamily: "Inter_400Regular",
            textAlign: "center",
            lineHeight: 16,
            marginTop: 28,
            paddingHorizontal: 8,
          }}
        >
          PawDoc is free to use. We may earn a small commission if you purchase
          through partner links in the app, at no extra cost to you.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
