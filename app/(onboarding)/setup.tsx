import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/theme";

type Species = "dog" | "cat" | "other";
type WeightUnit = "kg" | "lbs";

// Top 50 dog breeds + top 20 cat breeds (static list — no external API)
const DOG_BREEDS = [
  "Labrador Retriever", "German Shepherd", "Golden Retriever", "French Bulldog",
  "Bulldog", "Poodle", "Beagle", "Rottweiler", "German Shorthaired Pointer",
  "Yorkshire Terrier", "Boxer", "Dachshund", "Siberian Husky", "Great Dane",
  "Doberman Pinscher", "Australian Shepherd", "Miniature Schnauzer", "Cavalier King Charles Spaniel",
  "Shih Tzu", "Border Collie", "Cane Corso", "Bernese Mountain Dog", "Pomeranian",
  "Shetland Sheepdog", "Boston Terrier", "Havanese", "English Springer Spaniel",
  "Brittany", "Cocker Spaniel", "Vizsla", "Mastiff", "Chihuahua",
  "Weimaraner", "Rhodesian Ridgeback", "Collie", "Belgian Malinois",
  "Basenji", "Newfoundland", "West Highland White Terrier", "Bichon Frise",
  "Maltese", "Puggle", "Bloodhound", "Akita", "Samoyed",
  "Alaskan Malamute", "Irish Setter", "Whippet", "Greyhound", "Chow Chow",
];

const CAT_BREEDS = [
  "Domestic Shorthair", "Maine Coon", "Ragdoll", "Siamese", "Persian",
  "American Shorthair", "Bengal", "Abyssinian", "Scottish Fold", "Sphynx",
  "Russian Blue", "British Shorthair", "Norwegian Forest Cat", "Birman",
  "Oriental Shorthair", "Devon Rex", "Cornish Rex", "Tonkinese",
  "Burmese", "Himalayan",
];

interface PetSetupData {
  name: string;
  species: Species;
  breed: string;
  age: string;
  weight: string;
  weightUnit: WeightUnit;
}

export default function SetupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [breedSearch, setBreedSearch] = useState("");
  const [showBreedSuggestions, setShowBreedSuggestions] = useState(false);

  const [petData, setPetData] = useState<PetSetupData>({
    name: "",
    species: "dog",
    breed: "",
    age: "",
    weight: "",
    weightUnit: "lbs",
  });

  const updateField = (field: keyof PetSetupData, value: string) => {
    setPetData((prev) => ({ ...prev, [field]: value }));
  };

  const breedList = petData.species === "dog" ? DOG_BREEDS : petData.species === "cat" ? CAT_BREEDS : [];

  const filteredBreeds = breedSearch.length > 0
    ? breedList.filter((b) =>
        b.toLowerCase().includes(breedSearch.toLowerCase())
      )
    : [];

  const selectBreed = (breed: string) => {
    updateField("breed", breed);
    setBreedSearch(breed);
    setShowBreedSuggestions(false);
  };

  const handleContinue = async () => {
    if (!petData.name.trim()) {
      Alert.alert("Pet name required", "Please enter your pet's name.");
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

      // Convert age to approximate DOB: MAKE_DATE(current_year - age, 1, 1)
      let dob: string | null = null;
      const ageInt = parseInt(petData.age, 10);
      if (!isNaN(ageInt) && ageInt >= 0) {
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - ageInt;
        dob = `${birthYear}-01-01`;
      }

      // Convert weight to a number; normalise to kg for storage
      let weightKg: number | null = null;
      const weightNum = parseFloat(petData.weight);
      if (!isNaN(weightNum) && weightNum > 0) {
        weightKg = petData.weightUnit === "lbs" ? parseFloat((weightNum * 0.453592).toFixed(2)) : weightNum;
      }

      // Store draft in global state via module-level variable so Screen 3 can access it
      pendingPetData.userId = user.id;
      pendingPetData.name = petData.name.trim();
      pendingPetData.species = petData.species;
      pendingPetData.breed = petData.breed || null;
      pendingPetData.dob = dob;
      pendingPetData.weight = weightKg;

      router.push("/(onboarding)/permissions");
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
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6 pt-12">
            {/* Back button */}
            <TouchableOpacity
              className="mb-6"
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text className="text-primary text-base" style={{ fontFamily: "Inter_400Regular" }}>
                ← Back
              </Text>
            </TouchableOpacity>

            {/* Title */}
            <Text
              className="text-3xl text-primary mb-2"
              style={{ fontFamily: "Nunito_700Bold" }}
            >
              Tell us about your pet
            </Text>
            <Text
              className="text-sm text-text-secondary mb-8"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              We need a few details to give the best advice.
            </Text>

            {/* Pet Name */}
            <View className="mb-5">
              <Text
                className="text-sm text-text-primary mb-2"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Pet Name *
              </Text>
              <TextInput
                className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-base"
                style={{ fontFamily: "Inter_400Regular" }}
                placeholder="e.g. Max"
                placeholderTextColor={Colors.textSecondary}
                value={petData.name}
                onChangeText={(v) => updateField("name", v)}
                autoCapitalize="words"
              />
            </View>

            {/* Species */}
            <View className="mb-5">
              <Text
                className="text-sm text-text-primary mb-2"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Species
              </Text>
              <View className="flex-row gap-3">
                {(["dog", "cat", "other"] as Species[]).map((s) => (
                  <TouchableOpacity
                    key={s}
                    className={`flex-1 py-3 rounded-xl border items-center ${
                      petData.species === s
                        ? "bg-primary border-primary"
                        : "bg-surface border-border"
                    }`}
                    onPress={() => {
                      updateField("species", s);
                      updateField("breed", "");
                      setBreedSearch("");
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: petData.species === s }}
                  >
                    <Text
                      className={`text-sm capitalize ${
                        petData.species === s ? "text-white" : "text-text-primary"
                      }`}
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {s === "dog" ? "🐶 Dog" : s === "cat" ? "🐱 Cat" : "🐾 Other"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Breed — hidden for "other" */}
            {petData.species !== "other" && (
              <View className="mb-5">
                <Text
                  className="text-sm text-text-primary mb-2"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  Breed
                </Text>
                <TextInput
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-base"
                  style={{ fontFamily: "Inter_400Regular" }}
                  placeholder="Search breed..."
                  placeholderTextColor={Colors.textSecondary}
                  value={breedSearch}
                  onChangeText={(v) => {
                    setBreedSearch(v);
                    updateField("breed", v);
                    setShowBreedSuggestions(true);
                  }}
                  onFocus={() => setShowBreedSuggestions(true)}
                />
                {showBreedSuggestions && filteredBreeds.length > 0 && (
                  <View className="bg-surface border border-border rounded-xl mt-1 overflow-hidden">
                    {filteredBreeds.slice(0, 5).map((breed) => (
                      <TouchableOpacity
                        key={breed}
                        className="px-4 py-3 border-b border-border"
                        onPress={() => selectBreed(breed)}
                      >
                        <Text
                          className="text-sm text-text-primary"
                          style={{ fontFamily: "Inter_400Regular" }}
                        >
                          {breed}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Age */}
            <View className="mb-5">
              <Text
                className="text-sm text-text-primary mb-2"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Age (years)
              </Text>
              <TextInput
                className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-base"
                style={{ fontFamily: "Inter_400Regular" }}
                placeholder="e.g. 3"
                placeholderTextColor={Colors.textSecondary}
                value={petData.age}
                onChangeText={(v) => updateField("age", v.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>

            {/* Weight */}
            <View className="mb-8">
              <Text
                className="text-sm text-text-primary mb-2"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Weight
              </Text>
              <View className="flex-row gap-3 items-center">
                <TextInput
                  className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-base"
                  style={{ fontFamily: "Inter_400Regular" }}
                  placeholder="e.g. 30"
                  placeholderTextColor={Colors.textSecondary}
                  value={petData.weight}
                  onChangeText={(v) => updateField("weight", v.replace(/[^0-9.]/g, ""))}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
                {/* Unit toggle */}
                <View className="flex-row bg-surface border border-border rounded-xl overflow-hidden">
                  {(["lbs", "kg"] as WeightUnit[]).map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      className={`px-4 py-3 ${
                        petData.weightUnit === unit ? "bg-primary" : "bg-transparent"
                      }`}
                      onPress={() =>
                        setPetData((prev) => ({ ...prev, weightUnit: unit }))
                      }
                      accessibilityRole="radio"
                      accessibilityState={{ checked: petData.weightUnit === unit }}
                    >
                      <Text
                        className={`text-sm ${
                          petData.weightUnit === unit ? "text-white" : "text-text-primary"
                        }`}
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity
              className="bg-primary rounded-xl py-4 items-center mb-6"
              onPress={handleContinue}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Continue to health status"
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
            <View className="flex-row justify-center gap-2">
              <View className="w-2 h-2 rounded-full bg-border" />
              <View className="w-6 h-2 rounded-full bg-primary" />
              <View className="w-2 h-2 rounded-full bg-border" />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Module-level store for pet data across onboarding screens
// (lightweight alternative to Zustand for cross-screen onboarding state)
export const pendingPetData: {
  userId: string | null;
  name: string;
  species: Species;
  breed: string | null;
  dob: string | null;
  weight: number | null;
} = {
  userId: null,
  name: "",
  species: "dog",
  breed: null,
  dob: null,
  weight: null,
};
