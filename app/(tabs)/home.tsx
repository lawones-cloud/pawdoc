import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pet {
  id: string;
  name: string;
  species: string;
}

interface HealthLog {
  id: string;
  type: string;
  summary: string;
  severity_score: number | null;
  created_at: string;
  pets: { name: string; user_id: string } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", emoji: "☀️" };
  if (hour < 17) return { text: "Good afternoon", emoji: "🌤️" };
  return { text: "Good evening", emoji: "🌙" };
}

function getDateString(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getSpeciesEmoji(species: string): string {
  if (species === "dog") return "🐶";
  if (species === "cat") return "🐱";
  return "🐰";
}

function severityColor(score: number | null): string {
  if (score === null) return "#52796F";
  if (score >= 8) return "#DC2626";
  if (score >= 5) return "#D97706";
  return "#059669";
}

function severityLabel(score: number | null): string {
  if (score === null) return "";
  if (score >= 8) return "Critical";
  if (score >= 5) return "Moderate";
  return "Mild";
}

function formatRelativeDate(isoStr: string): string {
  const d = new Date(isoStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const router = useRouter();
  const greeting = getGreeting();
  const dateStr = getDateString();

  const [firstName, setFirstName] = useState<string>("");
  const [pets, setPets] = useState<Pet[]>([]);
  const [recentLogs, setRecentLogs] = useState<HealthLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const loadHomeData = useCallback(async () => {
    setLoadingData(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoadingData(false);
        return;
      }

      // Fetch user display name
      const { data: userData } = await supabase
        .from("users")
        .select("display_name")
        .eq("id", user.id)
        .single();

      if (userData?.display_name) {
        const name = (userData.display_name as string).trim().split(" ")[0];
        setFirstName(name);
      }

      // Fetch pets
      const { data: petsData } = await supabase
        .from("pets")
        .select("id, name, species")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      setPets((petsData as Pet[]) ?? []);

      // Fetch recent health logs
      const { data: logsData } = await supabase
        .from("health_logs")
        .select(
          "id, type, summary, severity_score, created_at, pets!inner(name, user_id)"
        )
        .eq("pets.user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      setRecentLogs((logsData as unknown as HealthLog[]) ?? []);
    } catch {
      // non-blocking
    } finally {
      setLoadingData(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [loadHomeData])
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F7F8F6" }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Gradient Header ── */}
        <LinearGradient
          colors={["#1B4332", "#2D6A4F"]}
          style={{
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 36,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          <Text
            style={{
              color: "rgba(255,255,255,0.65)",
              fontSize: 13,
              fontFamily: "Inter_400Regular",
              marginBottom: 6,
              letterSpacing: 0.2,
            }}
          >
            {dateStr}
          </Text>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 28,
              fontFamily: "Nunito_700Bold",
              letterSpacing: -0.5,
              marginBottom: 4,
            }}
          >
            {greeting.text}
            {firstName ? `, ${firstName}` : ""}! {greeting.emoji}
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.72)",
              fontSize: 14,
              fontFamily: "Inter_400Regular",
            }}
          >
            How are your pets feeling today?
          </Text>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          {/* ── Pet Cards Horizontal Scroll ── */}
          {loadingData ? (
            <View
              style={{
                height: 80,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <ActivityIndicator size="small" color="#1B4332" />
            </View>
          ) : pets.length > 0 ? (
            <View style={{ marginBottom: 28 }}>
              <Text
                style={{
                  color: "#0F1F17",
                  fontSize: 16,
                  fontFamily: "Inter_600SemiBold",
                  marginBottom: 12,
                  letterSpacing: -0.2,
                }}
              >
                Your Pets
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {pets.map((pet) => (
                  <TouchableOpacity
                    key={pet.id}
                    onPress={() =>
                      router.push({
                        pathname: "/pet-detail",
                        params: { pet_id: pet.id },
                      })
                    }
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 20,
                      padding: 16,
                      alignItems: "center",
                      minWidth: 100,
                      shadowColor: "#1B4332",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.08,
                      shadowRadius: 12,
                      elevation: 3,
                    }}
                    accessibilityLabel={`View ${pet.name}`}
                    accessibilityRole="button"
                  >
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: "#D8F3DC",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ fontSize: 26 }}>
                        {getSpeciesEmoji(pet.species)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: "#0F1F17",
                        fontSize: 13,
                        fontFamily: "Nunito_700Bold",
                        marginBottom: 2,
                      }}
                    >
                      {pet.name}
                    </Text>
                    <Text
                      style={{
                        color: "#52796F",
                        fontSize: 11,
                        fontFamily: "Inter_400Regular",
                      }}
                    >
                      Tap to check in
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* ── Quick Actions Grid ── */}
          <Text
            style={{
              color: "#0F1F17",
              fontSize: 16,
              fontFamily: "Inter_600SemiBold",
              marginBottom: 12,
              letterSpacing: -0.2,
            }}
          >
            Quick Actions
          </Text>

          {/* Check Symptoms — primary large card */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/chat")}
            accessibilityLabel="Start AI triage"
            accessibilityRole="button"
            style={{ marginBottom: 10 }}
          >
            <LinearGradient
              colors={["#1B4332", "#2D6A4F"]}
              style={{
                borderRadius: 20,
                padding: 20,
                flexDirection: "row",
                alignItems: "center",
                shadowColor: "#1B4332",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.22,
                shadowRadius: 18,
                elevation: 6,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16,
                }}
              >
                <Text style={{ fontSize: 26 }}>🩺</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 17,
                    fontFamily: "Inter_600SemiBold",
                    marginBottom: 3,
                    letterSpacing: -0.2,
                  }}
                >
                  Check Symptoms
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  AI-powered triage, anytime
                </Text>
              </View>
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 20 }}>
                →
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Reminders + Nutrition — side by side */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 28 }}>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/reminders")}
              accessibilityLabel="View reminders"
              accessibilityRole="button"
              style={{ flex: 1 }}
            >
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  padding: 16,
                  alignItems: "flex-start",
                  shadowColor: "#1B4332",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: "#FFF3E0",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 22 }}>🔔</Text>
                </View>
                <Text
                  style={{
                    color: "#0F1F17",
                    fontSize: 14,
                    fontFamily: "Inter_600SemiBold",
                    marginBottom: 2,
                    letterSpacing: -0.1,
                  }}
                >
                  Reminders
                </Text>
                <Text
                  style={{
                    color: "#52796F",
                    fontSize: 12,
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  Vaccines & meds
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)/nutrition")}
              accessibilityLabel="View nutrition"
              accessibilityRole="button"
              style={{ flex: 1 }}
            >
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  padding: 16,
                  alignItems: "flex-start",
                  shadowColor: "#1B4332",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: "#F0FDF4",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 22 }}>🥗</Text>
                </View>
                <Text
                  style={{
                    color: "#0F1F17",
                    fontSize: 14,
                    fontFamily: "Inter_600SemiBold",
                    marginBottom: 2,
                    letterSpacing: -0.1,
                  }}
                >
                  Nutrition
                </Text>
                <Text
                  style={{
                    color: "#52796F",
                    fontSize: 12,
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  Diet & food tips
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Recent Activity ── */}
          <Text
            style={{
              color: "#0F1F17",
              fontSize: 16,
              fontFamily: "Inter_600SemiBold",
              marginBottom: 12,
              letterSpacing: -0.2,
            }}
          >
            Recent Activity
          </Text>

          {loadingData ? (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 20,
                padding: 24,
                alignItems: "center",
                shadowColor: "#1B4332",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <ActivityIndicator size="small" color="#1B4332" />
            </View>
          ) : recentLogs.length === 0 ? (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 20,
                padding: 28,
                alignItems: "center",
                shadowColor: "#1B4332",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
              <Text
                style={{
                  color: "#0F1F17",
                  fontSize: 15,
                  fontFamily: "Nunito_700Bold",
                  textAlign: "center",
                  marginBottom: 6,
                }}
              >
                No activity yet
              </Text>
              <Text
                style={{
                  color: "#52796F",
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  textAlign: "center",
                  lineHeight: 19,
                  marginBottom: 16,
                }}
              >
                Start a triage session to see your pet's health history here.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/chat")}
                style={{
                  backgroundColor: "#1B4332",
                  borderRadius: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                }}
                accessibilityLabel="Start triage"
                accessibilityRole="button"
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  Start Triage
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {recentLogs.map((log) => {
                const sevColor = severityColor(log.severity_score);
                const sevLabel = severityLabel(log.severity_score);
                return (
                  <View
                    key={log.id}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 16,
                      padding: 16,
                      shadowColor: "#1B4332",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.06,
                      shadowRadius: 10,
                      elevation: 2,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <View
                        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                      >
                        {/* Pet name */}
                        <Text
                          style={{
                            color: "#0F1F17",
                            fontSize: 13,
                            fontFamily: "Inter_600SemiBold",
                          }}
                        >
                          {log.pets?.name ?? "Pet"}
                        </Text>
                        {/* Type badge */}
                        <View
                          style={{
                            backgroundColor: "#D8F3DC",
                            borderRadius: 8,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                          }}
                        >
                          <Text
                            style={{
                              color: "#1B4332",
                              fontSize: 11,
                              fontFamily: "Inter_600SemiBold",
                              textTransform: "capitalize",
                            }}
                          >
                            {log.type === "nutrition_advice"
                              ? "Nutrition"
                              : "Triage"}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={{
                          color: "#95A89F",
                          fontSize: 11,
                          fontFamily: "Inter_400Regular",
                        }}
                      >
                        {formatRelativeDate(log.created_at)}
                      </Text>
                    </View>

                    {/* Summary */}
                    <Text
                      numberOfLines={2}
                      style={{
                        color: "#52796F",
                        fontSize: 13,
                        fontFamily: "Inter_400Regular",
                        lineHeight: 18,
                        marginBottom: log.severity_score !== null ? 8 : 0,
                      }}
                    >
                      {log.summary}
                    </Text>

                    {/* Severity badge (triage only) */}
                    {log.severity_score !== null && log.type === "triage" && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: sevColor,
                          }}
                        />
                        <Text
                          style={{
                            color: sevColor,
                            fontSize: 11,
                            fontFamily: "Inter_600SemiBold",
                          }}
                        >
                          {sevLabel} · {log.severity_score}/10
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
