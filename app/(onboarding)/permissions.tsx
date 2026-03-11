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
import { pendingPetData } from "./setup";

type TagField = "allergies" | "conditions" | "medications";

interface HealthData {
  allergies: string[];
  conditions: string[];
  medications: string[];
}

function TagInput({
  label,
  tags,
  onAddTag,
  onRemoveTag,
}: {
  label: string;
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAddTag(trimmed);
      setInputValue("");
    }
  };

  return (
    <View className="mb-5">
      <Text
        className="text-sm text-text-primary mb-2"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {label}
      </Text>
      {/* Tags display */}
      {tags.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <TouchableOpacity
              key={tag}
              className="flex-row items-center bg-primary/10 rounded-full px-3 py-1"
              onPress={() => onRemoveTag(tag)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${tag}`}
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
      )}
      <View className="flex-row gap-2">
        <TextInput
          className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-base"
          style={{ fontFamily: "Inter_400Regular" }}
          placeholder={`Add ${label.toLowerCase()}...`}
          placeholderTextColor={Colors.textSecondary}
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          className="bg-primary rounded-xl px-4 items-center justify-center"
          onPress={handleAdd}
          accessibilityRole="button"
          accessibilityLabel={`Add ${label}`}
        >
          <Text
            className="text-white text-lg"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            +
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PermissionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [healthData, setHealthData] = useState<HealthData>({
    allergies: [],
    conditions: [],
    medications: [],
  });

  const petName = pendingPetData.name || "your pet";

  const addTag = (field: TagField) => (tag: string) => {
    setHealthData((prev) => ({ ...prev, [field]: [...prev[field], tag] }));
  };

  const removeTag = (field: TagField) => (tag: string) => {
    setHealthData((prev) => ({
      ...prev,
      [field]: prev[field].filter((t) => t !== tag),
    }));
  };

  const savePetAndNavigate = async (health: HealthData) => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      const userId = pendingPetData.userId || user.id;

      // Upsert pet row with all data from Screens 2 and 3
      const { data: petRow, error: petError } = await supabase
        .from("pets")
        .upsert(
          {
            user_id: userId,
            name: pendingPetData.name,
            species: pendingPetData.species,
            breed: pendingPetData.breed,
            dob: pendingPetData.dob,
            weight: pendingPetData.weight,
            allergies: health.allergies.length > 0 ? health.allergies : null,
            conditions: health.conditions.length > 0 ? health.conditions : null,
            medications: health.medications.length > 0 ? health.medications : null,
          },
          { onConflict: "user_id,name" }
        )
        .select()
        .single();

      if (petError) {
        console.warn("Pet upsert error:", petError.message);
      }

      // Asynchronously trigger nutrition report generation — do not await
      if (petRow?.id) {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (accessToken) {
          fetch(
            `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-nutrition-report`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ pet_id: petRow.id }),
            }
          ).catch(() => {
            // Non-blocking — nutrition report failure is silent
          });
        }
      }

      // Navigate immediately — nutrition report generates in background
      router.replace("/(tabs)/home");
    } catch (err) {
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartChatting = () => {
    savePetAndNavigate(healthData);
  };

  const handleSkip = () => {
    savePetAndNavigate({ allergies: [], conditions: [], medications: [] });
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
              <Text
                className="text-primary text-base"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                ← Back
              </Text>
            </TouchableOpacity>

            {/* Title */}
            <Text
              className="text-3xl text-primary mb-2"
              style={{ fontFamily: "Nunito_700Bold" }}
            >
              Any current issues?
            </Text>
            <Text
              className="text-sm text-text-secondary mb-8"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Does {petName} have any allergies or ongoing conditions we should
              know about?
            </Text>

            {/* Tag inputs */}
            <TagInput
              label="Allergies"
              tags={healthData.allergies}
              onAddTag={addTag("allergies")}
              onRemoveTag={removeTag("allergies")}
            />
            <TagInput
              label="Conditions"
              tags={healthData.conditions}
              onAddTag={addTag("conditions")}
              onRemoveTag={removeTag("conditions")}
            />
            <TagInput
              label="Medications"
              tags={healthData.medications}
              onAddTag={addTag("medications")}
              onRemoveTag={removeTag("medications")}
            />

            {/* Info callout */}
            <View className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-8">
              <Text
                className="text-sm text-primary"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                This information helps our AI give {petName} personalised advice.
                You can always update it later in your pet's profile.
              </Text>
            </View>

            {/* Start Chatting CTA */}
            <TouchableOpacity
              className="bg-accent rounded-xl py-4 items-center mb-4"
              onPress={handleStartChatting}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Start chatting"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  className="text-white text-base"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  Start Chatting
                </Text>
              )}
            </TouchableOpacity>

            {/* Skip link */}
            <TouchableOpacity
              className="items-center py-2"
              onPress={handleSkip}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Skip for now"
            >
              <Text
                className="text-text-secondary text-sm"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                Skip for now
              </Text>
            </TouchableOpacity>

            {/* Step indicator */}
            <View className="flex-row justify-center gap-2 mt-6">
              <View className="w-2 h-2 rounded-full bg-border" />
              <View className="w-2 h-2 rounded-full bg-border" />
              <View className="w-6 h-2 rounded-full bg-primary" />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
