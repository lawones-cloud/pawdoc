import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { usePet, useHealthLogs, HealthLog } from "@/hooks/usePets";

// ---------- Helpers ----------

function getAge(dob: string | null): string {
  if (!dob) return "—";
  const year = new Date(dob).getFullYear();
  const age = new Date().getFullYear() - year;
  return age <= 0 ? "< 1 yr" : age === 1 ? "1 yr" : `${age} yrs`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SeverityBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return (
      <View className="bg-gray-100 rounded-full px-2 py-0.5">
        <Text className="text-gray-500 text-xs" style={{ fontFamily: "Inter_500Medium" }}>
          N/A
        </Text>
      </View>
    );
  }
  const color =
    score >= 8
      ? { bg: "bg-error/10", text: "text-error" }
      : score >= 5
      ? { bg: "bg-warning/10", text: "text-warning" }
      : { bg: "bg-success/10", text: "text-success" };

  return (
    <View className={`${color.bg} rounded-full px-2 py-0.5`}>
      <Text className={`${color.text} text-xs`} style={{ fontFamily: "Inter_600SemiBold" }}>
        {score}/10
      </Text>
    </View>
  );
}

function TypeLabel({ type }: { type: "triage" | "nutrition_advice" }) {
  const label = type === "triage" ? "Triage" : "Nutrition";
  const style =
    type === "triage"
      ? "bg-primary/10 text-primary"
      : "bg-accent/10 text-accent-dark";
  return (
    <View className={`rounded-full px-2 py-0.5 ${style.split(" ")[0]}`}>
      <Text className={`text-xs ${style.split(" ")[1]}`} style={{ fontFamily: "Inter_500Medium" }}>
        {label}
      </Text>
    </View>
  );
}

function HealthLogCard({ item }: { item: HealthLog }) {
  // Safely extract assessment summary from unified envelope
  const envelope = item.ai_response as Record<string, unknown>;
  const assessment =
    (envelope?.assessment as string) ||
    (envelope?.summary as string) ||
    (envelope?.result as string) ||
    item.summary;

  return (
    <View
      className="bg-surface border rounded-xl p-4 mb-3"
      style={{ borderColor: "#E5E7EB" }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text
          className="text-text-secondary text-xs"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {formatDate(item.created_at)}
        </Text>
        <View className="flex-row items-center gap-2">
          <TypeLabel type={item.type} />
          {item.type === "triage" && (
            <SeverityBadge score={item.severity_score} />
          )}
        </View>
      </View>
      <Text
        className="text-text-primary text-sm leading-5"
        style={{ fontFamily: "Inter_400Regular" }}
        numberOfLines={3}
      >
        {assessment}
      </Text>
    </View>
  );
}

// ---------- Main screen ----------

export default function PetDetailScreen() {
  const router = useRouter();
  const { pet_id } = useLocalSearchParams<{ pet_id: string }>();

  const { pet, loading: petLoading, error: petError } = usePet(pet_id ?? null);
  const { logs, loading: logsLoading, refetch: refetchLogs } = useHealthLogs(pet_id ?? null);

  if (petLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#2D6A4F" />
      </SafeAreaView>
    );
  }

  if (petError || !pet) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text
          className="text-text-secondary text-center"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {petError ?? "Pet not found."}
        </Text>
        <TouchableOpacity
          className="mt-4"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text className="text-primary" style={{ fontFamily: "Inter_600SemiBold" }}>
            ← Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const weightDisplay = pet.weight
    ? `${(pet.weight * 2.20462).toFixed(1)} lbs (${pet.weight} kg)`
    : "—";
  const speciesEmoji =
    pet.species === "dog" ? "🐶" : pet.species === "cat" ? "🐱" : "🐰";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        onRefresh={refetchLogs}
        refreshing={logsLoading}
        ListHeaderComponent={
          <View>
            {/* Nav bar */}
            <View className="flex-row items-center justify-between pt-6 mb-6">
              <TouchableOpacity
                onPress={() => router.back()}
                className="p-1"
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Text className="text-primary text-2xl">←</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  router.push({ pathname: "/pet-form", params: { pet_id: pet.id } })
                }
                className="bg-surface border rounded-xl px-4 py-2"
                style={{ borderColor: "#E5E7EB" }}
                accessibilityLabel="Edit pet"
                accessibilityRole="button"
              >
                <Text
                  className="text-text-primary text-sm"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  Edit
                </Text>
              </TouchableOpacity>
            </View>

            {/* Profile header card */}
            <View
              className="bg-surface border rounded-2xl p-5 mb-6"
              style={{ borderColor: "#E5E7EB" }}
            >
              {/* Avatar placeholder */}
              <View className="w-16 h-16 bg-primary/10 rounded-2xl items-center justify-center mb-4">
                <Text style={{ fontSize: 32 }}>{speciesEmoji}</Text>
              </View>

              <Text
                className="text-2xl text-text-primary mb-1"
                style={{ fontFamily: "Nunito_700Bold" }}
              >
                {pet.name}
              </Text>

              {pet.breed ? (
                <Text
                  className="text-text-secondary text-sm mb-3"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {pet.breed} · {pet.species}
                </Text>
              ) : (
                <Text
                  className="text-text-secondary text-sm mb-3 capitalize"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {pet.species}
                </Text>
              )}

              {/* Stats row */}
              <View className="flex-row flex-wrap gap-4">
                <View>
                  <Text
                    className="text-text-secondary text-xs"
                    style={{ fontFamily: "Inter_400Regular" }}
                  >
                    Age
                  </Text>
                  <Text
                    className="text-text-primary text-sm"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {getAge(pet.dob)}
                  </Text>
                </View>
                <View>
                  <Text
                    className="text-text-secondary text-xs"
                    style={{ fontFamily: "Inter_400Regular" }}
                  >
                    Weight
                  </Text>
                  <Text
                    className="text-text-primary text-sm"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {weightDisplay}
                  </Text>
                </View>
                {pet.sex && (
                  <View>
                    <Text
                      className="text-text-secondary text-xs"
                      style={{ fontFamily: "Inter_400Regular" }}
                    >
                      Sex
                    </Text>
                    <Text
                      className="text-text-primary text-sm capitalize"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {pet.sex}
                      {pet.neutered !== null
                        ? pet.neutered
                          ? " (neutered)"
                          : " (intact)"
                        : ""}
                    </Text>
                  </View>
                )}
              </View>

              {/* Allergies */}
              {pet.allergies && pet.allergies.length > 0 && (
                <View className="mt-4">
                  <Text
                    className="text-text-secondary text-xs mb-1"
                    style={{ fontFamily: "Inter_500Medium" }}
                  >
                    Allergies
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {pet.allergies.map((a, i) => (
                      <View key={i} className="bg-error/10 rounded-full px-2 py-0.5">
                        <Text
                          className="text-error text-xs"
                          style={{ fontFamily: "Inter_500Medium" }}
                        >
                          {a}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Conditions */}
              {pet.conditions && pet.conditions.length > 0 && (
                <View className="mt-3">
                  <Text
                    className="text-text-secondary text-xs mb-1"
                    style={{ fontFamily: "Inter_500Medium" }}
                  >
                    Conditions
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {pet.conditions.map((c, i) => (
                      <View key={i} className="bg-warning/10 rounded-full px-2 py-0.5">
                        <Text
                          className="text-warning text-xs"
                          style={{ fontFamily: "Inter_500Medium" }}
                        >
                          {c}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Timeline header */}
            <Text
              className="text-lg text-text-primary mb-3"
              style={{ fontFamily: "Nunito_700Bold" }}
            >
              Health Timeline
            </Text>
          </View>
        }
        renderItem={({ item }) => <HealthLogCard item={item} />}
        ListEmptyComponent={
          logsLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="small" color="#2D6A4F" />
            </View>
          ) : (
            <View
              className="bg-surface border rounded-xl items-center p-8"
              style={{ borderColor: "#E5E7EB" }}
            >
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🩺</Text>
              <Text
                className="text-text-primary text-base text-center mb-2"
                style={{ fontFamily: "Nunito_700Bold" }}
              >
                No health history yet
              </Text>
              <Text
                className="text-text-secondary text-sm text-center"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                Start a chat to get started.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
