import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { usePet } from "@/hooks/usePets";

// ---------- Data ----------

const DOG_BREEDS = [
  "Australian Shepherd", "Beagle", "Border Collie", "Boxer",
  "Bulldog", "Cavalier King Charles Spaniel", "Chihuahua",
  "Dachshund", "Doberman Pinscher", "French Bulldog",
  "German Shepherd", "Golden Retriever", "Great Dane",
  "Labrador Retriever", "Miniature Schnauzer", "Pembroke Welsh Corgi",
  "Poodle", "Rottweiler", "Shih Tzu", "Siberian Husky",
  "Yorkshire Terrier", "Mixed Breed / Other",
];

const CAT_BREEDS = [
  "Abyssinian", "Bengal", "British Shorthair", "Maine Coon",
  "Norwegian Forest Cat", "Persian", "Ragdoll", "Scottish Fold",
  "Siamese", "Sphynx", "Mixed Breed / Other",
];

// ---------- Helper components ----------

function SectionLabel({ label }: { label: string }) {
  return (
    <Text
      className="text-sm text-text-secondary mb-1 mt-4"
      style={{ fontFamily: "Inter_600SemiBold" }}
    >
      {label}
    </Text>
  );
}

function TagChips({
  tags,
  onRemove,
  inputValue,
  onInputChange,
  onAdd,
  placeholder,
}: {
  tags: string[];
  onRemove: (idx: number) => void;
  inputValue: string;
  onInputChange: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
}) {
  return (
    <View>
      <View className="flex-row flex-wrap gap-2 mb-2">
        {tags.map((tag, i) => (
          <TouchableOpacity
            key={i}
            className="flex-row items-center bg-primary/10 rounded-full px-3 py-1"
            onPress={() => onRemove(i)}
            accessibilityLabel={`Remove ${tag}`}
            accessibilityRole="button"
          >
            <Text
              className="text-primary text-xs mr-1"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              {tag}
            </Text>
            <Text className="text-primary text-xs">×</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View className="flex-row gap-2">
        <TextInput
          className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-text-primary"
          style={{ fontFamily: "Inter_400Regular", borderColor: "#E5E7EB" }}
          value={inputValue}
          onChangeText={onInputChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          onSubmitEditing={onAdd}
          returnKeyType="done"
        />
        <TouchableOpacity
          className="bg-primary rounded-xl px-4 justify-center"
          onPress={onAdd}
          accessibilityLabel="Add tag"
          accessibilityRole="button"
        >
          <Text className="text-white text-base">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BreedPicker({
  species,
  value,
  onSelect,
}: {
  species: "dog" | "cat" | "other";
  value: string;
  onSelect: (breed: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [showList, setShowList] = useState(false);

  const breeds = species === "dog" ? DOG_BREEDS : species === "cat" ? CAT_BREEDS : [];
  const filtered = breeds.filter((b) =>
    b.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setQuery(value);
  }, [value]);

  if (species === "other") {
    return (
      <TextInput
        className="bg-surface border rounded-xl px-4 py-3 text-text-primary"
        style={{ fontFamily: "Inter_400Regular", borderColor: "#E5E7EB" }}
        value={query}
        onChangeText={(t) => { setQuery(t); onSelect(t); }}
        placeholder="Enter breed (optional)"
        placeholderTextColor="#9CA3AF"
      />
    );
  }

  return (
    <View>
      <TextInput
        className="bg-surface border rounded-xl px-4 py-3 text-text-primary"
        style={{ fontFamily: "Inter_400Regular", borderColor: "#E5E7EB" }}
        value={query}
        onChangeText={(t) => { setQuery(t); setShowList(true); }}
        onFocus={() => setShowList(true)}
        placeholder={`Search ${species} breeds...`}
        placeholderTextColor="#9CA3AF"
      />
      {showList && filtered.length > 0 && (
        <View
          className="bg-surface border rounded-xl mt-1 max-h-40 overflow-hidden"
          style={{ borderColor: "#E5E7EB" }}
        >
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {filtered.map((breed) => (
              <TouchableOpacity
                key={breed}
                className="px-4 py-3 border-b"
                style={{ borderColor: "#F3F4F6" }}
                onPress={() => {
                  setQuery(breed);
                  onSelect(breed);
                  setShowList(false);
                }}
              >
                <Text
                  className="text-text-primary text-sm"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {breed}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ---------- Main screen ----------

export default function PetFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pet_id?: string }>();
  const isEdit = !!params.pet_id;
  const { pet, loading: petLoading } = usePet(params.pet_id ?? null);

  // Form fields
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"dog" | "cat" | "other">("dog");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("lbs");
  const [sex, setSex] = useState<"male" | "female" | "">("");
  const [neutered, setNeutered] = useState<boolean | null>(null);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [conditionInput, setConditionInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Pre-populate in edit mode
  useEffect(() => {
    if (isEdit && pet) {
      setName(pet.name ?? "");
      setSpecies(pet.species ?? "dog");
      setBreed(pet.breed ?? "");
      // Derive age from dob
      if (pet.dob) {
        const year = new Date(pet.dob).getFullYear();
        const currentYear = new Date().getFullYear();
        const approxAge = currentYear - year;
        setAge(approxAge > 0 ? String(approxAge) : "");
      }
      if (pet.weight !== null && pet.weight !== undefined) {
        setWeight(String(pet.weight));
      }
      setSex((pet.sex as "male" | "female" | "") ?? "");
      setNeutered(pet.neutered ?? null);
      setAllergies(pet.allergies ?? []);
      setConditions(pet.conditions ?? []);
    }
  }, [isEdit, pet]);

  const addAllergyTag = () => {
    const trimmed = allergyInput.trim();
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies([...allergies, trimmed]);
    }
    setAllergyInput("");
  };

  const addConditionTag = () => {
    const trimmed = conditionInput.trim();
    if (trimmed && !conditions.includes(trimmed)) {
      setConditions([...conditions, trimmed]);
    }
    setConditionInput("");
  };

  const ageToApproxDob = (ageInput: string): string | null => {
    const parsed = parseInt(ageInput, 10);
    if (isNaN(parsed) || parsed < 0) return null;
    const year = new Date().getFullYear() - parsed;
    return `${year}-01-01`;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter a name for your pet.");
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const weightNum = weight ? parseFloat(weight) : null;
      // Normalise to kg for storage
      const weightKg =
        weightNum !== null
          ? weightUnit === "lbs"
            ? parseFloat((weightNum * 0.453592).toFixed(2))
            : weightNum
          : null;

      const payload = {
        user_id: user.id,
        name: name.trim(),
        species,
        breed: breed || null,
        dob: ageToApproxDob(age),
        weight: weightKg,
        sex: sex || null,
        neutered,
        allergies: allergies.length > 0 ? allergies : null,
        conditions: conditions.length > 0 ? conditions : null,
      };

      if (isEdit && params.pet_id) {
        const { error } = await supabase
          .from("pets")
          .update(payload)
          .eq("id", params.pet_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pets").insert(payload);
        if (error) {
          // Surface free-tier DB trigger message clearly
          if (error.message.includes("Free tier")) {
            Alert.alert(
              "Upgrade Required",
              "Free accounts support up to 2 pets. Upgrade to Premium for unlimited pets.",
              [{ text: "OK" }]
            );
            return;
          }
          throw error;
        }
      }

      router.back();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save pet.");
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && petLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#2D6A4F" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6 pt-6">
            {/* Header */}
            <View className="flex-row items-center mb-6">
              <TouchableOpacity
                onPress={() => router.back()}
                className="mr-4 p-1"
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Text className="text-primary text-2xl">←</Text>
              </TouchableOpacity>
              <Text
                className="text-2xl text-text-primary"
                style={{ fontFamily: "Nunito_700Bold" }}
              >
                {isEdit ? "Edit Pet" : "Add Pet"}
              </Text>
            </View>

            {/* Name */}
            <SectionLabel label="Pet Name *" />
            <TextInput
              className="bg-surface border rounded-xl px-4 py-3 text-text-primary"
              style={{ fontFamily: "Inter_400Regular", borderColor: "#E5E7EB" }}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Max"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
            />

            {/* Species */}
            <SectionLabel label="Species" />
            <View className="flex-row gap-3">
              {(["dog", "cat", "other"] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => { setSpecies(s); setBreed(""); }}
                  className={`flex-1 border rounded-xl py-3 items-center ${
                    species === s
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  }`}
                  style={{ borderColor: species === s ? "#2D6A4F" : "#E5E7EB" }}
                  accessibilityLabel={`Select species ${s}`}
                  accessibilityRole="radio"
                >
                  <Text
                    className={`text-sm capitalize ${
                      species === s ? "text-white" : "text-text-primary"
                    }`}
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {s === "dog" ? "🐶 Dog" : s === "cat" ? "🐱 Cat" : "🐰 Other"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Breed */}
            <SectionLabel label="Breed" />
            <BreedPicker species={species} value={breed} onSelect={setBreed} />

            {/* Age */}
            <SectionLabel label="Age (years)" />
            <TextInput
              className="bg-surface border rounded-xl px-4 py-3 text-text-primary"
              style={{ fontFamily: "Inter_400Regular", borderColor: "#E5E7EB" }}
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 3"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />

            {/* Weight */}
            <SectionLabel label="Weight" />
            <View className="flex-row gap-3 items-center">
              <TextInput
                className="flex-1 bg-surface border rounded-xl px-4 py-3 text-text-primary"
                style={{ fontFamily: "Inter_400Regular", borderColor: "#E5E7EB" }}
                value={weight}
                onChangeText={setWeight}
                placeholder="0.0"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
              <View className="flex-row bg-surface border rounded-xl overflow-hidden" style={{ borderColor: "#E5E7EB" }}>
                {(["lbs", "kg"] as const).map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    onPress={() => setWeightUnit(unit)}
                    className={`px-4 py-3 ${weightUnit === unit ? "bg-primary" : ""}`}
                    accessibilityLabel={`Weight unit ${unit}`}
                    accessibilityRole="radio"
                  >
                    <Text
                      className={weightUnit === unit ? "text-white" : "text-text-secondary"}
                      style={{ fontFamily: "Inter_600SemiBold", fontSize: 13 }}
                    >
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sex */}
            <SectionLabel label="Sex" />
            <View className="flex-row gap-3">
              {(["male", "female"] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSex(sex === s ? "" : s)}
                  className={`flex-1 border rounded-xl py-3 items-center ${
                    sex === s
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  }`}
                  style={{ borderColor: sex === s ? "#2D6A4F" : "#E5E7EB" }}
                  accessibilityLabel={`Sex ${s}`}
                  accessibilityRole="radio"
                >
                  <Text
                    className={`text-sm capitalize ${
                      sex === s ? "text-white" : "text-text-primary"
                    }`}
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {s === "male" ? "♂ Male" : "♀ Female"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Neutered */}
            <SectionLabel label="Neutered / Spayed" />
            <View className="flex-row gap-3">
              {([true, false] as const).map((val) => (
                <TouchableOpacity
                  key={String(val)}
                  onPress={() => setNeutered(neutered === val ? null : val)}
                  className={`flex-1 border rounded-xl py-3 items-center ${
                    neutered === val
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  }`}
                  style={{ borderColor: neutered === val ? "#2D6A4F" : "#E5E7EB" }}
                  accessibilityLabel={val ? "Yes, neutered" : "No, not neutered"}
                  accessibilityRole="radio"
                >
                  <Text
                    className={`text-sm ${
                      neutered === val ? "text-white" : "text-text-primary"
                    }`}
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {val ? "Yes" : "No"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Allergies */}
            <SectionLabel label="Allergies" />
            <TagChips
              tags={allergies}
              onRemove={(i) => setAllergies(allergies.filter((_, idx) => idx !== i))}
              inputValue={allergyInput}
              onInputChange={setAllergyInput}
              onAdd={addAllergyTag}
              placeholder="e.g. Chicken, Gluten"
            />

            {/* Conditions */}
            <SectionLabel label="Known Conditions" />
            <TagChips
              tags={conditions}
              onRemove={(i) => setConditions(conditions.filter((_, idx) => idx !== i))}
              inputValue={conditionInput}
              onInputChange={setConditionInput}
              onAdd={addConditionTag}
              placeholder="e.g. Hip Dysplasia"
            />

            {/* Save button */}
            <TouchableOpacity
              className="bg-primary rounded-xl py-4 items-center mt-8"
              onPress={handleSave}
              disabled={saving}
              accessibilityLabel={isEdit ? "Save pet changes" : "Add pet"}
              accessibilityRole="button"
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  className="text-white text-base"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  {isEdit ? "Save Changes" : "Add Pet"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
