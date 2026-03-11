import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { usePets, Pet } from "@/hooks/usePets";

const MAX_FREE_PETS = 2;

function getAge(dob: string | null): string {
  if (!dob) return "";
  const year = new Date(dob).getFullYear();
  const age = new Date().getFullYear() - year;
  return age <= 0 ? "< 1 yr" : age === 1 ? "1 yr" : `${age} yrs`;
}

function PetCard({ pet, onPress }: { pet: Pet; onPress: () => void }) {
  const speciesEmoji =
    pet.species === "dog" ? "🐶" : pet.species === "cat" ? "🐱" : "🐰";
  const ageLabel = getAge(pet.dob);
  const weightLabel = pet.weight
    ? `${(pet.weight * 2.20462).toFixed(1)} lbs`
    : null;

  return (
    <TouchableOpacity
      className="bg-surface border rounded-2xl p-4 mb-3 flex-row items-center"
      style={{ borderColor: "#E5E7EB" }}
      onPress={onPress}
      accessibilityLabel={`View ${pet.name}'s profile`}
      accessibilityRole="button"
    >
      {/* Avatar */}
      <View className="w-14 h-14 bg-primary/10 rounded-xl items-center justify-center mr-4">
        <Text style={{ fontSize: 28 }}>{speciesEmoji}</Text>
      </View>

      {/* Info */}
      <View className="flex-1">
        <Text
          className="text-text-primary text-base mb-0.5"
          style={{ fontFamily: "Nunito_700Bold" }}
        >
          {pet.name}
        </Text>
        {pet.breed ? (
          <Text
            className="text-text-secondary text-xs mb-1"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {pet.breed}
          </Text>
        ) : (
          <Text
            className="text-text-secondary text-xs mb-1 capitalize"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {pet.species}
          </Text>
        )}
        <View className="flex-row items-center gap-3">
          {ageLabel ? (
            <View className="bg-background rounded-full px-2 py-0.5">
              <Text
                className="text-text-secondary text-xs"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                {ageLabel}
              </Text>
            </View>
          ) : null}
          {weightLabel ? (
            <View className="bg-background rounded-full px-2 py-0.5">
              <Text
                className="text-text-secondary text-xs"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                {weightLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Chevron */}
      <Text className="text-text-secondary text-lg ml-2">›</Text>
    </TouchableOpacity>
  );
}

export default function PetsScreen() {
  const router = useRouter();
  const { pets, loading, error, refetch } = usePets();

  // Refresh list every time tab comes into focus
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
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-8 pb-6">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <View>
            <Text
              className="text-2xl text-primary"
              style={{ fontFamily: "Nunito_700Bold" }}
            >
              My Pets
            </Text>
            <Text
              className="text-sm text-text-secondary"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Health profiles and records
            </Text>
          </View>
          <TouchableOpacity
            className={`rounded-xl px-4 py-2 ${atLimit ? "bg-gray-200" : "bg-primary"}`}
            onPress={handleAddPet}
            accessibilityLabel="Add a pet"
            accessibilityRole="button"
            accessibilityState={{ disabled: atLimit }}
          >
            <Text
              className={`text-sm ${atLimit ? "text-text-secondary" : "text-white"}`}
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              + Add Pet
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading state */}
        {loading && pets.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2D6A4F" />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center">
            <Text
              className="text-text-secondary text-center mb-4"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {error}
            </Text>
            <TouchableOpacity
              className="bg-primary rounded-xl px-6 py-3"
              onPress={refetch}
              accessibilityLabel="Retry loading pets"
              accessibilityRole="button"
            >
              <Text
                className="text-white text-sm"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : pets.length === 0 ? (
          /* Empty state */
          <View
            className="flex-1 bg-surface border rounded-xl items-center justify-center p-8"
            style={{ borderColor: "#E5E7EB" }}
          >
            <Text className="text-5xl mb-4">🐾</Text>
            <Text
              className="text-lg text-text-primary text-center mb-2"
              style={{ fontFamily: "Nunito_700Bold" }}
            >
              No pets yet
            </Text>
            <Text
              className="text-sm text-text-secondary text-center mb-6"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Add your first pet to track their health records, vaccinations, and more.
            </Text>
            <TouchableOpacity
              className="bg-primary rounded-xl px-6 py-3"
              onPress={() => router.push("/pet-form")}
              accessibilityLabel="Add your first pet"
              accessibilityRole="button"
            >
              <Text
                className="text-white text-sm"
                style={{ fontFamily: "Inter_600SemiBold" }}
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
          />
        )}

        {/* Free tier note */}
        <Text
          className="text-xs text-text-secondary text-center mt-4"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {atLimit
            ? `You've reached the free limit of ${MAX_FREE_PETS} pets. Upgrade for unlimited.`
            : `Free accounts support up to ${MAX_FREE_PETS} pets.`}
        </Text>
      </View>
    </SafeAreaView>
  );
}
