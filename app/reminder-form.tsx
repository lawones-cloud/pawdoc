/**
 * PawDoc — Add / Edit Reminder Form
 * Feature 3: Smart Reminder System
 *
 * Route params:
 *   id      — present when editing an existing reminder
 *   pet_id  — pre-selected pet when launching from pet detail
 */

import { useState, useEffect, useCallback } from "react";
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

// ---------------------------------------------------------------------------
// Types / constants
// ---------------------------------------------------------------------------

type ReminderType = "vaccination" | "medication" | "checkup" | "prevention";
type RecurrenceUnit = "days" | "weeks" | "months" | "years";

interface Pet {
  id: string;
  name: string;
  species: string;
}

const TYPE_OPTIONS: { value: ReminderType; label: string; emoji: string }[] = [
  { value: "vaccination", label: "Vaccination", emoji: "💉" },
  { value: "medication", label: "Medication", emoji: "💊" },
  { value: "checkup", label: "Vet Checkup", emoji: "🩺" },
  { value: "prevention", label: "Flea / Tick / Heartworm", emoji: "🛡️" },
];

const RECURRENCE_OPTIONS: {
  label: string;
  interval: number | null;
  unit: RecurrenceUnit | null;
}[] = [
  { label: "None (one-time)", interval: null, unit: null },
  { label: "Daily", interval: 1, unit: "days" },
  { label: "Weekly", interval: 1, unit: "weeks" },
  { label: "Monthly", interval: 1, unit: "months" },
  { label: "Annual", interval: 1, unit: "years" },
];

/**
 * Auto-populate affiliate CTA based on reminder type.
 * PRD: vaccination→PetMeds, medication→Chewy, nutrition→Farmer's Dog
 * checkup→Vetster, prevention→Chewy AutoShip
 */
function defaultAffiliateCta(type: ReminderType): string {
  switch (type) {
    case "vaccination":
      return "https://www.petmeds.com/?utm_source=pawdoc";
    case "medication":
      return "https://www.chewy.com/app/content/autoship?utm_source=pawdoc";
    case "checkup":
      return "https://vetster.com/?utm_source=pawdoc";
    case "prevention":
      return "https://www.chewy.com/b/flea-tick-14?utm_source=pawdoc";
    default:
      return "";
  }
}

const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐶",
  cat: "🐱",
  other: "🐾",
};

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function SectionLabel({ label }: { label: string }) {
  return (
    <Text
      className="text-sm text-text-secondary mb-2 mt-5"
      style={{ fontFamily: "Inter_600SemiBold" }}
    >
      {label.toUpperCase()}
    </Text>
  );
}

function OptionChips<T extends string>({
  options,
  selected,
  onSelect,
  getLabel,
  getKey,
}: {
  options: T[];
  selected: T;
  onSelect: (v: T) => void;
  getLabel: (v: T) => string;
  getKey: (v: T) => string;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => (
        <TouchableOpacity
          key={getKey(opt)}
          onPress={() => onSelect(opt)}
          className="rounded-full px-4 py-2 border"
          style={{
            backgroundColor: selected === opt ? "#2D6A4F" : "#FFFFFF",
            borderColor: selected === opt ? "#2D6A4F" : "#E5E7EB",
          }}
          accessibilityLabel={getLabel(opt)}
          accessibilityRole="button"
        >
          <Text
            style={{
              fontSize: 13,
              color: selected === opt ? "#FFFFFF" : "#6B7280",
              fontFamily:
                selected === opt ? "Inter_600SemiBold" : "Inter_400Regular",
            }}
          >
            {getLabel(opt)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ReminderFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; pet_id?: string }>();
  const isEditing = !!params.id;

  // Form state
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>(
    params.pet_id ?? ""
  );
  const [reminderType, setReminderType] = useState<ReminderType>("vaccination");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  });
  const [recurrenceIndex, setRecurrenceIndex] = useState(0); // index into RECURRENCE_OPTIONS
  const [affiliateCta, setAffiliateCta] = useState(
    defaultAffiliateCta("vaccination")
  );
  const [isActive, setIsActive] = useState(true);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Load pets ────────────────────────────────────────────────────────────
  const fetchPets = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("pets")
        .select("id, name, species")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPets(data ?? []);

      // Pre-select first pet if none supplied
      if (!params.pet_id && (data ?? []).length > 0) {
        setSelectedPetId(data![0].id);
      }
    } catch {
      Alert.alert("Error", "Could not load your pets.");
    }
  }, [params.pet_id]);

  // ── Load existing reminder for edit ─────────────────────────────────────
  const fetchReminder = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) throw error;
      if (!data) return;

      setSelectedPetId(data.pet_id);
      setReminderType(data.type as ReminderType);
      setTitle(data.title ?? "");
      setDueDate(data.due_date);
      setAffiliateCta(data.affiliate_cta ?? defaultAffiliateCta(data.type));
      setIsActive(data.is_active);

      const idx = RECURRENCE_OPTIONS.findIndex(
        (o) =>
          o.interval === data.recurrence_interval &&
          o.unit === data.recurrence_unit
      );
      setRecurrenceIndex(idx >= 0 ? idx : 0);
    } catch {
      Alert.alert("Error", "Could not load reminder details.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  useEffect(() => {
    fetchReminder();
  }, [fetchReminder]);

  // ── Type change — auto-fill affiliate CTA ────────────────────────────────
  const handleTypeChange = (type: ReminderType) => {
    setReminderType(type);
    // Only auto-fill if user has not customised it (or is a known default URL)
    const knownDefaults = TYPE_OPTIONS.map((o) => defaultAffiliateCta(o.value));
    if (!affiliateCta || knownDefaults.includes(affiliateCta)) {
      setAffiliateCta(defaultAffiliateCta(type));
    }
  };

  // ── Validate due date ────────────────────────────────────────────────────
  const isValidDate = (str: string): boolean =>
    /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str).getTime());

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedPetId) {
      Alert.alert("Validation", "Please select a pet.");
      return;
    }
    if (!isValidDate(dueDate)) {
      Alert.alert("Validation", "Enter a valid date in YYYY-MM-DD format.");
      return;
    }

    const recurrence = RECURRENCE_OPTIONS[recurrenceIndex];
    const payload = {
      pet_id: selectedPetId,
      type: reminderType,
      title: title.trim() || null,
      due_date: dueDate,
      recurrence_interval: recurrence.interval,
      recurrence_unit: recurrence.unit,
      affiliate_cta: affiliateCta.trim() || null,
      is_active: isActive,
    };

    setSaving(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from("reminders")
          .update(payload)
          .eq("id", params.id!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reminders").insert(payload);
        if (error) throw error;
      }
      router.back();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not save reminder.";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = () => {
    Alert.alert("Delete Reminder", "Are you sure you want to delete this reminder?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("reminders")
            .delete()
            .eq("id", params.id!);
          if (error) {
            Alert.alert("Error", "Could not delete reminder.");
            return;
          }
          router.back();
        },
      },
    ]);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
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
        {/* Nav bar */}
        <View className="flex-row items-center px-5 pt-4 pb-2 border-b border-border bg-surface">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4"
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text
              className="text-primary text-base"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              ← Back
            </Text>
          </TouchableOpacity>
          <Text
            className="flex-1 text-lg text-text-primary"
            style={{ fontFamily: "Nunito_700Bold" }}
          >
            {isEditing ? "Edit Reminder" : "New Reminder"}
          </Text>
          {isEditing && (
            <TouchableOpacity
              onPress={handleDelete}
              accessibilityLabel="Delete reminder"
              accessibilityRole="button"
            >
              <Text
                className="text-error text-sm"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                Delete
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 48 }}
        >
          {/* Pet selector */}
          <SectionLabel label="Pet" />
          {pets.length === 0 ? (
            <Text
              className="text-text-secondary text-sm"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              No pets found. Add a pet first.
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {pets.map((pet) => (
                <TouchableOpacity
                  key={pet.id}
                  onPress={() => setSelectedPetId(pet.id)}
                  className="rounded-2xl px-4 py-3 border flex-row items-center"
                  style={{
                    backgroundColor:
                      selectedPetId === pet.id ? "#2D6A4F" : "#FFFFFF",
                    borderColor:
                      selectedPetId === pet.id ? "#2D6A4F" : "#E5E7EB",
                  }}
                  accessibilityLabel={`Select ${pet.name}`}
                  accessibilityRole="button"
                >
                  <Text style={{ fontSize: 16, marginRight: 6 }}>
                    {SPECIES_EMOJI[pet.species] ?? "🐾"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: selectedPetId === pet.id ? "#FFFFFF" : "#374151",
                      fontFamily:
                        selectedPetId === pet.id
                          ? "Inter_600SemiBold"
                          : "Inter_400Regular",
                    }}
                  >
                    {pet.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Reminder type */}
          <SectionLabel label="Reminder Type" />
          <View className="gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleTypeChange(opt.value)}
                className="flex-row items-center rounded-xl px-4 py-3 border"
                style={{
                  backgroundColor:
                    reminderType === opt.value ? "#EBF5F0" : "#FFFFFF",
                  borderColor:
                    reminderType === opt.value ? "#2D6A4F" : "#E5E7EB",
                }}
                accessibilityLabel={opt.label}
                accessibilityRole="radio"
              >
                <Text style={{ fontSize: 20, marginRight: 10 }}>{opt.emoji}</Text>
                <Text
                  style={{
                    fontSize: 14,
                    color:
                      reminderType === opt.value ? "#2D6A4F" : "#374151",
                    fontFamily:
                      reminderType === opt.value
                        ? "Inter_600SemiBold"
                        : "Inter_400Regular",
                  }}
                >
                  {opt.label}
                </Text>
                {reminderType === opt.value && (
                  <Text
                    className="ml-auto text-primary"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    ✓
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Title */}
          <SectionLabel label="Title (Optional)" />
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary"
            style={{ fontFamily: "Inter_400Regular", fontSize: 15 }}
            placeholder={`e.g. Max's rabies booster`}
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
            accessibilityLabel="Reminder title"
          />

          {/* Due date */}
          <SectionLabel label="Due Date" />
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary"
            style={{ fontFamily: "Inter_400Regular", fontSize: 15 }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
            value={dueDate}
            onChangeText={setDueDate}
            keyboardType="numeric"
            maxLength={10}
            accessibilityLabel="Due date (YYYY-MM-DD)"
          />
          {!isValidDate(dueDate) && dueDate.length > 0 && (
            <Text
              className="text-error text-xs mt-1"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Enter a valid date in YYYY-MM-DD format.
            </Text>
          )}

          {/* Recurrence */}
          <SectionLabel label="Recurrence" />
          <OptionChips
            options={RECURRENCE_OPTIONS.map((_, i) => String(i))}
            selected={String(recurrenceIndex)}
            onSelect={(v) => setRecurrenceIndex(Number(v))}
            getLabel={(v) => RECURRENCE_OPTIONS[Number(v)].label}
            getKey={(v) => v}
          />

          {/* Affiliate CTA */}
          <SectionLabel label="Affiliate / Refill Link" />
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary"
            style={{ fontFamily: "Inter_400Regular", fontSize: 13 }}
            placeholder="https://..."
            placeholderTextColor="#9CA3AF"
            value={affiliateCta}
            onChangeText={setAffiliateCta}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="Affiliate CTA URL"
          />
          <Text
            className="text-text-secondary text-xs mt-1"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Auto-populated based on reminder type. Included in push
            notifications as a "Refill Now" link.
          </Text>

          {/* Active toggle (edit only) */}
          {isEditing && (
            <>
              <SectionLabel label="Status" />
              <TouchableOpacity
                onPress={() => setIsActive((v) => !v)}
                className="flex-row items-center bg-surface border border-border rounded-xl px-4 py-3"
                accessibilityLabel={
                  isActive ? "Deactivate this reminder" : "Activate this reminder"
                }
                accessibilityRole="switch"
              >
                <View
                  className="w-10 h-6 rounded-full mr-3 items-center justify-center"
                  style={{ backgroundColor: isActive ? "#2D6A4F" : "#D1D5DB" }}
                >
                  <View
                    className="w-5 h-5 bg-white rounded-full"
                    style={{
                      transform: [{ translateX: isActive ? 4 : -4 }],
                    }}
                  />
                </View>
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    color: isActive ? "#2D6A4F" : "#6B7280",
                  }}
                >
                  {isActive ? "Active — will send notifications" : "Inactive — paused"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Save button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="bg-primary rounded-2xl py-4 mt-8 items-center"
            style={{ opacity: saving ? 0.7 : 1 }}
            accessibilityLabel={isEditing ? "Save changes" : "Create reminder"}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                className="text-white text-base"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                {isEditing ? "Save Changes" : "Create Reminder"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
