/**
 * PawDoc — Nutrition Advisor Screen
 * Feature 4: AI Nutrition Advisor
 *
 * Shows the latest AI-generated nutrition report for the active pet.
 * Sections:
 *   - Daily Calories badge
 *   - Recommended Foods list
 *   - Foods to Avoid list (red)
 *   - Supplements with affiliate CTA cards (orange)
 *   - Hydration Notes
 *   - Special Notes
 * "Regenerate Report" button with Alert confirm.
 * "Last updated" timestamp.
 * Loading / empty states.
 * Logs affiliate impression on supplement CTA mount.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FoodItem {
  name: string;
  reason: string;
}

interface Supplement {
  name: string;
  reason: string;
  affiliate_product: string | null;
}

interface NutritionReport {
  diet_type: string;
  daily_calories: number;
  meal_frequency: string;
  recommended_foods: FoodItem[];
  foods_to_avoid: FoodItem[];
  supplements: Supplement[];
  hydration_notes: string;
  weight_management: string;
  special_notes: string;
}

interface RecommendedAffiliate {
  affiliate_name: string;
  affiliate_url: string;
  reason: string;
}

interface NutritionReportRow {
  id: string;
  pet_id: string;
  generated_at: string;
  report_json: NutritionReport;
  recommended_affiliates: RecommendedAffiliate[] | null;
}

interface Pet {
  id: string;
  name: string;
  species: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐶",
  cat: "🐱",
  other: "🐾",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function logAffiliateImpression(
  userId: string,
  petId: string,
  affiliateName: string,
  affiliateUrl: string
): Promise<void> {
  try {
    await supabase.from("affiliate_events").insert({
      user_id: userId,
      pet_id: petId,
      affiliate_name: affiliateName,
      affiliate_url: affiliateUrl,
      event_type: "impression",
    });
  } catch {
    // non-blocking
  }
}

async function logAffiliateClick(
  userId: string,
  petId: string,
  affiliateName: string,
  affiliateUrl: string
): Promise<void> {
  try {
    await supabase.from("affiliate_events").insert({
      user_id: userId,
      pet_id: petId,
      affiliate_name: affiliateName,
      affiliate_url: affiliateUrl,
      event_type: "click",
    });
  } catch {
    // non-blocking
  }
}

function openUrl(url: string): void {
  if (Platform.OS === "web") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).open(url, "_blank");
  } else {
    Linking.openURL(url);
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CaloriesBadge({ calories }: { calories: number }) {
  return (
    <View
      style={{
        backgroundColor: "#F0FDF4",
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#10B981",
        marginBottom: 16,
      }}
    >
      <Text style={{ fontSize: 36, fontWeight: "800", color: "#065F46" }}>
        {calories.toLocaleString()}
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: "#065F46",
          fontFamily: "Inter_600SemiBold",
          marginTop: 2,
        }}
      >
        kcal/day recommended
      </Text>
    </View>
  );
}

function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        marginTop: 4,
      }}
    >
      <Text style={{ fontSize: 18, marginRight: 8 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 16,
          fontFamily: "Nunito_700Bold",
          color: "#1A1A1A",
        }}
      >
        {title}
      </Text>
    </View>
  );
}

function FoodCard({
  item,
  variant,
}: {
  item: FoodItem;
  variant: "green" | "red";
}) {
  const bg = variant === "green" ? "#F0FDF4" : "#FEF2F2";
  const border = variant === "green" ? "#10B981" : "#EF4444";
  const nameColor = variant === "green" ? "#065F46" : "#7F1D1D";
  const reasonColor = variant === "green" ? "#047857" : "#991B1B";
  const dot = variant === "green" ? "✓" : "✕";

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: border,
        flexDirection: "row",
        alignItems: "flex-start",
      }}
    >
      <Text
        style={{
          color: border,
          fontWeight: "700",
          fontSize: 15,
          marginRight: 8,
          marginTop: 1,
        }}
      >
        {dot}
      </Text>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: nameColor,
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            marginBottom: 2,
          }}
        >
          {item.name}
        </Text>
        <Text
          style={{
            color: reasonColor,
            fontSize: 12,
            fontFamily: "Inter_400Regular",
            lineHeight: 17,
          }}
        >
          {item.reason}
        </Text>
      </View>
    </View>
  );
}

interface SupplementCardProps {
  supplement: Supplement;
  userId: string;
  petId: string;
  affiliates: RecommendedAffiliate[];
  shownAffiliates: React.MutableRefObject<Set<string>>;
}

function SupplementCard({
  supplement,
  userId,
  petId,
  affiliates,
  shownAffiliates,
}: SupplementCardProps) {
  // Match supplement to an affiliate by product name or first available
  const matchedAffiliate =
    affiliates.find(
      (a) =>
        supplement.affiliate_product &&
        a.affiliate_name
          .toLowerCase()
          .includes(supplement.affiliate_product.toLowerCase().split(" ")[0])
    ) ?? affiliates[0] ?? null;

  const alreadyLogged = matchedAffiliate
    ? shownAffiliates.current.has(matchedAffiliate.affiliate_name)
    : false;

  useEffect(() => {
    if (matchedAffiliate && !alreadyLogged) {
      logAffiliateImpression(
        userId,
        petId,
        matchedAffiliate.affiliate_name,
        matchedAffiliate.affiliate_url
      );
      shownAffiliates.current.add(matchedAffiliate.affiliate_name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = () => {
    if (!matchedAffiliate) return;
    logAffiliateClick(
      userId,
      petId,
      matchedAffiliate.affiliate_name,
      matchedAffiliate.affiliate_url
    );
    openUrl(matchedAffiliate.affiliate_url);
  };

  return (
    <View
      style={{
        backgroundColor: "#FFFBEB",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#F59E0B",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: matchedAffiliate ? 10 : 0,
        }}
      >
        <Text style={{ fontSize: 18, marginRight: 10 }}>💊</Text>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: "#92400E",
              fontFamily: "Nunito_700Bold",
              fontSize: 14,
              marginBottom: 2,
            }}
          >
            {supplement.name}
          </Text>
          <Text
            style={{
              color: "#B45309",
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              lineHeight: 17,
            }}
          >
            {supplement.reason}
          </Text>
          {supplement.affiliate_product && (
            <Text
              style={{
                color: "#78350F",
                fontSize: 11,
                fontFamily: "Inter_500Medium",
                marginTop: 3,
              }}
            >
              Recommended: {supplement.affiliate_product}
            </Text>
          )}
        </View>
      </View>

      {matchedAffiliate && (
        <TouchableOpacity
          onPress={handlePress}
          style={{
            backgroundColor: "#F59E0B",
            borderRadius: 8,
            paddingVertical: 9,
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          accessibilityLabel={`Shop ${matchedAffiliate.affiliate_name}`}
          accessibilityRole="button"
        >
          <View>
            <Text
              style={{
                color: "#78350F",
                fontSize: 10,
                fontFamily: "Inter_500Medium",
              }}
            >
              Sponsored Partner
            </Text>
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: "Inter_600SemiBold",
                fontSize: 13,
              }}
            >
              {matchedAffiliate.affiliate_name}
            </Text>
          </View>
          <Text
            style={{
              color: "#FFFFFF",
              fontFamily: "Inter_600SemiBold",
              fontSize: 13,
            }}
          >
            Shop Now →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function InfoBlock({
  emoji,
  title,
  text,
}: {
  emoji: string;
  title: string;
  text: string;
}) {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}
      >
        <Text style={{ fontSize: 16, marginRight: 6 }}>{emoji}</Text>
        <Text
          style={{
            color: "#374151",
            fontFamily: "Inter_600SemiBold",
            fontSize: 13,
          }}
        >
          {title}
        </Text>
      </View>
      <Text
        style={{
          color: "#4B5563",
          fontSize: 13,
          fontFamily: "Inter_400Regular",
          lineHeight: 19,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function NutritionScreen() {
  const [report, setReport] = useState<NutritionReportRow | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [activePetId, setActivePetId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const shownAffiliates = useRef<Set<string>>(new Set());

  // ── Fetch report ────────────────────────────────────────────────────────
  const fetchReport = useCallback(
    async (petId: string) => {
      try {
        const { data, error } = await supabase
          .from("nutrition_reports")
          .select(
            "id, pet_id, generated_at, report_json, recommended_affiliates"
          )
          .eq("pet_id", petId)
          .order("generated_at", { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") throw error;
        setReport(data ? (data as NutritionReportRow) : null);
      } catch {
        setReport(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // ── Load pets + user ─────────────────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: petsData } = await supabase
      .from("pets")
      .select("id, name, species")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (petsData && petsData.length > 0) {
      const petList = petsData as Pet[];
      setPets(petList);
      const petId = activePetId || petList[0].id;
      setActivePetId(petId);
      await fetchReport(petId);
    } else {
      setLoading(false);
    }
  }, [activePetId, fetchReport]);

  useFocusEffect(
    useCallback(() => {
      loadInitial();
    }, [loadInitial])
  );

  // ── Generate report ────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!activePetId) return;

    setGenerating(true);
    try {
      // Use the authenticated user's JWT — not the public anon key — so the
      // edge function can verify the caller's identity and enforce ownership.
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const accessToken = authSession?.access_token ?? SUPABASE_ANON_KEY;

      const resp = await fetch(
        `${SUPABASE_URL}/functions/v1/generate-nutrition-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ pet_id: activePetId }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(
          errData.error ?? `Server error ${resp.status}`
        );
      }

      // Refresh from DB to get the saved report
      await fetchReport(activePetId);
      shownAffiliates.current = new Set();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert("Generation Failed", msg);
    } finally {
      setGenerating(false);
    }
  };

  const confirmRegenerate = () => {
    Alert.alert(
      "Regenerate Report",
      "This will replace the current nutrition report with a fresh AI analysis. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          style: "default",
          onPress: handleGenerate,
        },
      ]
    );
  };

  // ── Pet tab switch ────────────────────────────────────────────────────
  const handlePetChange = async (petId: string) => {
    setActivePetId(petId);
    setLoading(true);
    shownAffiliates.current = new Set();
    await fetchReport(petId);
  };

  // ── Render ─────────────────────────────────────────────────────────────
  const activePet = pets.find((p) => p.id === activePetId);
  const reportData = report?.report_json ?? null;
  const affiliates = report?.recommended_affiliates ?? [];

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F8F6" }} edges={["top"]}>
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
          <Text style={{ fontSize: 22, marginRight: 10 }}>🥗</Text>
          <View>
            <Text style={{ color: "#FFFFFF", fontSize: 22, fontFamily: "Nunito_700Bold" }}>
              Nutrition Advisor
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" }}>
              AI-powered dietary guidance
            </Text>
          </View>
        </LinearGradient>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#1B4332" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F8F6" }} edges={["top"]}>
      {/* Gradient Header */}
      <LinearGradient
        colors={["#1B4332", "#2D6A4F"]}
        style={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 22, marginRight: 10 }}>🥗</Text>
          <View>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 22,
                fontFamily: "Nunito_700Bold",
                letterSpacing: -0.3,
              }}
            >
              Nutrition Advisor
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 12,
                fontFamily: "Inter_400Regular",
              }}
            >
              AI-powered dietary guidance
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Pet selector tabs (if multiple pets) */}
      {pets.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            backgroundColor: "#F7F8F6",
            borderBottomWidth: 1,
            borderBottomColor: "#E2EBE6",
            flexGrow: 0,
          }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        >
          {pets.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => handlePetChange(p.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 999,
                marginRight: 8,
                backgroundColor:
                  p.id === activePetId ? "#1B4332" : "#F0F4F2",
              }}
              accessibilityLabel={`View ${p.name}'s nutrition`}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 14, marginRight: 4 }}>
                {SPECIES_EMOJI[p.species] ?? "🐾"}
              </Text>
              <Text
                style={{
                  color: p.id === activePetId ? "#FFFFFF" : "#374151",
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 13,
                }}
              >
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content */}
      {pets.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🐾</Text>
          <Text
            style={{
              color: "#1A1A1A",
              fontSize: 18,
              fontFamily: "Nunito_700Bold",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            No pet profile found
          </Text>
          <Text
            style={{
              color: "#6B7280",
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Set up your pet profile to generate a personalised nutrition report.
          </Text>
        </View>
      ) : !reportData ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🥗</Text>
          <Text
            style={{
              color: "#1A1A1A",
              fontSize: 18,
              fontFamily: "Nunito_700Bold",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            No report yet for{" "}
            {activePet?.name ?? "your pet"}
          </Text>
          <Text
            style={{
              color: "#6B7280",
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 24,
            }}
          >
            Generate an AI nutrition report tailored to{" "}
            {activePet?.name ?? "your pet"}'s breed, age, weight, and health
            profile.
          </Text>
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={generating}
            style={{
              backgroundColor: generating ? "#52B788" : "#1B4332",
              borderRadius: 12,
              paddingHorizontal: 28,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
            }}
            accessibilityLabel="Generate nutrition report"
            accessibilityRole="button"
          >
            {generating ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
            ) : (
              <Text style={{ fontSize: 18, marginRight: 8 }}>✨</Text>
            )}
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
              }}
            >
              {generating ? "Generating..." : "Generate Nutrition Report"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchReport(activePetId);
              }}
              tintColor="#2D6A4F"
            />
          }
        >
          {/* Pet name + last updated row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 20, marginRight: 6 }}>
                {SPECIES_EMOJI[activePet?.species ?? "other"] ?? "🐾"}
              </Text>
              <Text
                style={{
                  color: "#1A1A1A",
                  fontFamily: "Nunito_700Bold",
                  fontSize: 16,
                }}
              >
                {activePet?.name ?? "Your Pet"}
              </Text>
            </View>
            {report?.generated_at && (
              <Text
                style={{
                  color: "#9CA3AF",
                  fontSize: 11,
                  fontFamily: "Inter_400Regular",
                }}
              >
                Updated {formatTimestamp(report.generated_at)}
              </Text>
            )}
          </View>

          {/* Diet type pill */}
          <View
            style={{
              backgroundColor: "#EFF6FF",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: "#BFDBFE",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, marginRight: 6 }}>🍽️</Text>
            <Text
              style={{
                color: "#1E40AF",
                fontFamily: "Inter_600SemiBold",
                fontSize: 13,
              }}
            >
              {reportData.diet_type}
            </Text>
            <Text
              style={{
                color: "#93C5FD",
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                marginLeft: 8,
              }}
            >
              · {reportData.meal_frequency}
            </Text>
          </View>

          {/* Daily Calories */}
          <CaloriesBadge calories={reportData.daily_calories} />

          {/* Recommended Foods */}
          {reportData.recommended_foods?.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <SectionHeader emoji="✅" title="Recommended Foods" />
              {reportData.recommended_foods.map((item, i) => (
                <FoodCard key={i} item={item} variant="green" />
              ))}
            </View>
          )}

          {/* Foods to Avoid */}
          {reportData.foods_to_avoid?.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <SectionHeader emoji="🚫" title="Foods to Avoid" />
              {reportData.foods_to_avoid.map((item, i) => (
                <FoodCard key={i} item={item} variant="red" />
              ))}
            </View>
          )}

          {/* Supplements */}
          {reportData.supplements?.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <SectionHeader emoji="💊" title="Recommended Supplements" />
              {reportData.supplements.map((supplement, i) => (
                <SupplementCard
                  key={i}
                  supplement={supplement}
                  userId={userId}
                  petId={activePetId}
                  affiliates={affiliates}
                  shownAffiliates={shownAffiliates}
                />
              ))}
            </View>
          )}

          {/* Hydration Notes */}
          {reportData.hydration_notes && (
            <InfoBlock
              emoji="💧"
              title="Hydration"
              text={reportData.hydration_notes}
            />
          )}

          {/* Weight Management */}
          {reportData.weight_management && (
            <InfoBlock
              emoji="⚖️"
              title="Weight Management"
              text={reportData.weight_management}
            />
          )}

          {/* Special Notes */}
          {reportData.special_notes && (
            <InfoBlock
              emoji="📋"
              title="Special Notes & Ingredient Watchlist"
              text={reportData.special_notes}
            />
          )}

          {/* Regenerate button */}
          <TouchableOpacity
            onPress={confirmRegenerate}
            disabled={generating}
            style={{
              backgroundColor: generating ? "#B7E4C7" : "#FFFFFF",
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              borderWidth: 1.5,
              borderColor: generating ? "#95A89F" : "#1B4332",
              marginTop: 8,
              marginBottom: 8,
              flexDirection: "row",
              justifyContent: "center",
            }}
            accessibilityLabel="Regenerate nutrition report"
            accessibilityRole="button"
          >
            {generating ? (
              <ActivityIndicator
                size="small"
                color="#1B4332"
                style={{ marginRight: 8 }}
              />
            ) : (
              <Text style={{ fontSize: 16, marginRight: 8 }}>🔄</Text>
            )}
            <Text
              style={{
                color: "#2D6A4F",
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
              }}
            >
              {generating ? "Regenerating..." : "Regenerate Report"}
            </Text>
          </TouchableOpacity>

          {/* Disclaimer */}
          <View
            style={{
              marginTop: 4,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: "#E5E7EB",
            }}
          >
            <Text
              style={{
                color: "#9CA3AF",
                fontSize: 11,
                fontFamily: "Inter_400Regular",
                lineHeight: 16,
                textAlign: "center",
              }}
            >
              PawDoc provides nutritional guidance, not veterinary assessment.
              Always consult a licensed veterinarian for medical decisions.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
