import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { usePets, Pet } from "@/hooks/usePets";

const MAX_FREE_PETS = 2;

function getAge(dob: string | null): string {
  if (!dob) return "";
  const year = new Date(dob).getFullYear();
  const age = new Date().getFullYear() - year;
  return age <= 0 ? "< 1 yr" : age === 1 ? "1 yr" : `${age} yrs`;
}

function speciesBorderColor(species: string): string {
  if (species === "dog") return "#1B4332";
  if (species === "cat") return "#2563EB";
  return "#7C3AED";
}

function speciesBgColor(species: string): string {
  if (species === "dog") return "#D8F3DC";
  if (species === "cat") return "#DBEAFE";
  return "#EDE9FE";
}

function PetCard({ pet, onPress }: { pet: Pet; onPress: () => void }) {
  const speciesEmoji =
    pet.species === "dog" ? "🐶" : pet.species === "cat" ? "🐱" : "🐰";
  const ageLabel = getAge(pet.dob);
  const weightLabel = pet.weight
    ? `${(pet.weight * 2.20462).toFixed(1)} lbs`
    : null;
  const borderColor = speciesBorderColor(pet.species);
  const bgColor = speciesBgColor(pet.species);

  return (
    <TouchableOpacity
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        borderLeftWidth: 4,
        borderLeftColor: borderColor,
        shadowColor: "#1B4332",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      }}
      onPress={onPress}
      accessibilityLabel={`View ${pet.name}'s profile`}
      accessibilityRole="button"
    >
      {/* Species badge */}
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: bgColor,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
        }}
      >
        <Text style={{ fontSize: 26 }}>{speciesEmoji}</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: "#0F1F17",
            fontSize: 17,
            fontFamily: "Nunito_700Bold",
            marginBottom: 2,
            letterSpacing: -0.2,
          }}
        >
          {pet.name}
        </Text>
        <Text
          style={{
            color: "#52796F",
            fontSize: 13,
            fontFamily: "Inter_400Regular",
            marginBottom: 6,
            textTransform: "capitalize",
          }}
        >
          {pet.breed ?? pet.species}
        </Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {ageLabel ? (
            <View
              style={{
                backgroundColor: "#F0F4F2",
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 3,
              }}
            >
              <Text
                style={{
                  color: "#52796F",
                  fontSize: 11,
                  fontFamily: "Inter_500Medium",
                }}
              >
                {ageLabel}
              </Text>
            </View>
          ) : null}
          {weightLabel ? (
            <View
              style={{
                backgroundColor: "#F0F4F2",
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 3,
              }}
            >
              <Text
                style={{
                  color: "#52796F",
                  fontSize: 11,
                  fontFamily: "Inter_500Medium",
                }}
              >
                {weightLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Chevron */}
      <Text style={{ color: "#95A89F", fontSize: 20, marginLeft: 8 }}>›</Text>
    </TouchableOpacity>
  );
}

export default function PetsScreen() {
  const router = useRouter();
  const { pets, loading, error, refetch } = usePets();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const atLimit = pets.length >= MAX_FREE_PETS;

  const handleAddPet = () => {
    if (atLimit) {
      Alert.alert(
        "Pet Limit Reached",
        "Free accounts support up to 2 pets. Upgrade to Premium for unlimited pets.",
        [
          { text: "Not Now", style: "cancel" },
          { text: "Upgrade", onPress: () => {} },
        ]
      );
      return;
    }
    router.push("/pet-form");
  };

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
          <Text style={{ fontSize: 22, marginRight: 10 }}>🐾</Text>
          <View>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 22,
                fontFamily: "Nunito_700Bold",
                letterSpacing: -0.3,
              }}
            >
              My Pets
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 12,
                fontFamily: "Inter_400Regular",
              }}
            >
              Health profiles and records
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: atLimit
              ? "rgba(255,255,255,0.15)"
              : "rgba(255,255,255,0.22)",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.3)",
          }}
          onPress={handleAddPet}
          accessibilityLabel="Add a pet"
          accessibilityRole="button"
          accessibilityState={{ disabled: atLimit }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 13,
              fontFamily: "Inter_600SemiBold",
            }}
          >
            + Add Pet
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
        {/* Loading state */}
        {loading && pets.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#1B4332" />
          </View>
        ) : error ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text
              style={{
                color: "#52796F",
                textAlign: "center",
                marginBottom: 16,
                fontFamily: "Inter_400Regular",
              }}
            >
              {error}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#1B4332",
                borderRadius: 14,
                paddingHorizontal: 24,
                paddingVertical: 12,
              }}
              onPress={refetch}
              accessibilityLabel="Retry loading pets"
              accessibilityRole="button"
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : pets.length === 0 ? (
          /* Empty state */
          <View
            style={{
              flex: 1,
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              padding: 32,
              shadowColor: "#1B4332",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 16,
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 52, marginBottom: 16 }}>🐾</Text>
            <Text
              style={{
                fontSize: 18,
                color: "#0F1F17",
                textAlign: "center",
                marginBottom: 8,
                fontFamily: "Nunito_700Bold",
              }}
            >
              No pets yet
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#52796F",
                textAlign: "center",
                marginBottom: 24,
                lineHeight: 20,
                fontFamily: "Inter_400Regular",
              }}
            >
              Add your first pet to track their health records, vaccinations, and more.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#1B4332",
                borderRadius: 14,
                paddingHorizontal: 24,
                paddingVertical: 13,
              }}
              onPress={() => router.push("/pet-form")}
              accessibilityLabel="Add your first pet"
              accessibilityRole="button"
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                Add Your First Pet
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Pet list */
          <FlatList
            data={pets}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PetCard
                pet={item}
                onPress={() =>
                  router.push({
                    pathname: "/pet-detail",
                    params: { pet_id: item.id },
                  })
                }
              />
            )}
            showsVerticalScrollIndicator={false}
            onRefresh={refetch}
            refreshing={loading}
            contentContainerStyle={{ paddingBottom: 120 }}
          />
        )}

        {/* Free tier note */}
        {pets.length > 0 && (
          <Text
            style={{
              color: "#95A89F",
              fontSize: 12,
              textAlign: "center",
              marginTop: 8,
              marginBottom: 16,
              fontFamily: "Inter_400Regular",
            }}
          >
            {atLimit
              ? `You've reached the free limit of ${MAX_FREE_PETS} pets. Upgrade for unlimited.`
              : `Free accounts support up to ${MAX_FREE_PETS} pets.`}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}
