/**
 * PawDoc — Reminders Screen
 * Feature 3: Smart Reminder System
 *
 * Lists all reminders for the user's pets, grouped by pet.
 * FAB → reminder-form for add.
 * Tap card → reminder-form for edit.
 * Long-press → confirm delete.
 * Toggle button → activate / deactivate.
 */

import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SectionList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Reminder {
  id: string;
  pet_id: string;
  type: "vaccination" | "medication" | "checkup" | "prevention";
  title?: string | null;
  due_date: string;
  recurrence_interval: number | null;
  recurrence_unit: "days" | "weeks" | "months" | "years" | null;
  last_sent: string | null;
  affiliate_cta: string | null;
  is_active: boolean;
  created_at: string;
  // joined from pets
  pet_name?: string;
  pet_species?: string;
}

interface ReminderSection {
  pet_name: string;
  pet_id: string;
  data: Reminder[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<Reminder["type"], string> = {
  vaccination: "Vaccination",
  medication: "Medication",
  checkup: "Vet Checkup",
  prevention: "Flea / Tick / Heartworm",
};

const TYPE_EMOJI: Record<Reminder["type"], string> = {
  vaccination: "💉",
  medication: "💊",
  checkup: "🩺",
  prevention: "🛡️",
};

const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐶",
  cat: "🐱",
  other: "🐾",
};

function formatDueDate(dateStr: string): string {
  const due = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays <= 7) return `Due in ${diffDays}d`;
  return due.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function dueDateColor(dateStr: string): string {
  const due = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return "#EF4444";
  if (diffDays <= 3) return "#F59E0B";
  return "#10B981";
}

function recurrenceLabel(r: Reminder): string {
  if (!r.recurrence_interval || !r.recurrence_unit) return "One-time";
  return `Every ${r.recurrence_interval} ${r.recurrence_unit}`;
}

// ---------------------------------------------------------------------------
// Reminder card
// ---------------------------------------------------------------------------

function ReminderCard({
  reminder,
  onToggle,
  onDelete,
  onEdit,
}: {
  reminder: Reminder;
  onToggle: (r: Reminder) => void;
  onDelete: (r: Reminder) => void;
  onEdit: (r: Reminder) => void;
}) {
  const label = TYPE_LABELS[reminder.type] ?? reminder.type;
  const emoji = TYPE_EMOJI[reminder.type] ?? "🔔";
  const dueColor = reminder.is_active
    ? dueDateColor(reminder.due_date)
    : "#9CA3AF";

  return (
    <TouchableOpacity
      className="bg-surface border border-border rounded-2xl p-4 mb-3 flex-row items-center"
      onPress={() => onEdit(reminder)}
      onLongPress={() =>
        Alert.alert(
          "Delete Reminder",
          `Delete "${reminder.title ?? label}"?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => onDelete(reminder),
            },
          ]
        )
      }
      accessibilityLabel={`Reminder: ${reminder.title ?? label}`}
      accessibilityRole="button"
      style={{ opacity: reminder.is_active ? 1 : 0.55 }}
    >
      {/* Icon */}
      <View className="w-12 h-12 bg-primary/10 rounded-xl items-center justify-center mr-3">
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
      </View>

      {/* Info */}
      <View className="flex-1">
        <Text
          className="text-text-primary text-sm mb-0.5"
          style={{ fontFamily: "Nunito_700Bold" }}
          numberOfLines={1}
        >
          {reminder.title ?? label}
        </Text>
        <Text
          className="text-xs mb-1"
          style={{ color: dueColor, fontFamily: "Inter_600SemiBold" }}
        >
          {formatDueDate(reminder.due_date)}
        </Text>
        <Text
          className="text-text-secondary text-xs"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {label} · {recurrenceLabel(reminder)}
        </Text>
        {reminder.affiliate_cta ? (
          <Text
            className="text-xs mt-1"
            style={{ color: "#F4A261", fontFamily: "Inter_500Medium" }}
            numberOfLines={1}
          >
            Refill: {reminder.affiliate_cta}
          </Text>
        ) : null}
      </View>

      {/* Active toggle */}
      <TouchableOpacity
        onPress={() => onToggle(reminder)}
        className="ml-3 px-3 py-1.5 rounded-full"
        style={{
          backgroundColor: reminder.is_active ? "#D1FAE5" : "#F3F4F6",
        }}
        accessibilityLabel={
          reminder.is_active ? "Deactivate reminder" : "Activate reminder"
        }
        accessibilityRole="switch"
      >
        <Text
          className="text-xs"
          style={{
            color: reminder.is_active ? "#065F46" : "#6B7280",
            fontFamily: "Inter_600SemiBold",
          }}
        >
          {reminder.is_active ? "Active" : "Off"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Filter chip options
// ---------------------------------------------------------------------------

const FILTER_OPTIONS: Array<{
  key: "all" | Reminder["type"];
  label: string;
}> = [
  { key: "all", label: "All" },
  { key: "vaccination", label: "Vaccines" },
  { key: "prevention", label: "Flea/Tick" },
  { key: "medication", label: "Meds" },
  { key: "checkup", label: "Checkup" },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function RemindersScreen() {
  const router = useRouter();
  const [sections, setSections] = useState<ReminderSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | Reminder["type"]>("all");

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchReminders = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSections([]);
        return;
      }

      const { data, error } = await supabase
        .from("reminders")
        .select(
          `id, pet_id, type, due_date, recurrence_interval, recurrence_unit,
           last_sent, affiliate_cta, is_active, created_at,
           pets!inner(name, species, user_id)`
        )
        .eq("pets.user_id", user.id)
        .order("due_date", { ascending: true });

      if (error) throw error;

      type RawRow = Reminder & {
        pets: { name: string; species: string; user_id: string };
      };
      const rows = (data ?? []) as unknown as RawRow[];

      // Group by pet
      const petMap = new Map<string, ReminderSection>();
      for (const row of rows) {
        const petName = row.pets?.name ?? "Unknown Pet";
        if (!petMap.has(row.pet_id)) {
          petMap.set(row.pet_id, {
            pet_name: petName,
            pet_id: row.pet_id,
            data: [],
          });
        }
        petMap.get(row.pet_id)!.data.push({
          ...row,
          pet_name: petName,
          pet_species: row.pets?.species,
        });
      }

      setSections(Array.from(petMap.values()));
    } catch {
      Alert.alert("Error", "Failed to load reminders. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchReminders();
    }, [fetchReminders])
  );

  // ── Actions ────────────────────────────────────────────────────────────
  const handleToggle = async (reminder: Reminder) => {
    const newValue = !reminder.is_active;
    const { error } = await supabase
      .from("reminders")
      .update({ is_active: newValue })
      .eq("id", reminder.id);
    if (error) {
      Alert.alert("Error", "Could not update reminder.");
      return;
    }
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        data: section.data.map((r) =>
          r.id === reminder.id ? { ...r, is_active: newValue } : r
        ),
      }))
    );
  };

  const handleDelete = async (reminder: Reminder) => {
    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("id", reminder.id);
    if (error) {
      Alert.alert("Error", "Could not delete reminder.");
      return;
    }
    setSections((prev) =>
      prev
        .map((section) => ({
          ...section,
          data: section.data.filter((r) => r.id !== reminder.id),
        }))
        .filter((section) => section.data.length > 0)
    );
  };

  const handleEdit = (reminder: Reminder) => {
    router.push({
      pathname: "/reminder-form",
      params: { id: reminder.id, pet_id: reminder.pet_id },
    });
  };

  const handleAdd = () => {
    router.push("/reminder-form");
  };

  // ── Filtered sections ──────────────────────────────────────────────────
  const filteredSections: ReminderSection[] = sections
    .map((section) => ({
      ...section,
      data:
        filter === "all"
          ? section.data
          : section.data.filter((r) => r.type === filter),
    }))
    .filter((section) => section.data.length > 0);

  const totalCount = sections.reduce((acc, s) => acc + s.data.length, 0);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-5 pt-6">
        {/* Header */}
        <View className="mb-5">
          <Text
            className="text-2xl text-primary"
            style={{ fontFamily: "Nunito_700Bold" }}
          >
            Reminders
          </Text>
          <Text
            className="text-xs text-text-secondary mt-0.5"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {totalCount} reminder{totalCount !== 1 ? "s" : ""} for your pets
          </Text>
        </View>

        {/* Filter chips */}
        <FlatList
          data={FILTER_OPTIONS}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setFilter(item.key)}
              className="rounded-full px-4 py-1.5 mr-2 border"
              style={{
                backgroundColor:
                  filter === item.key ? "#2D6A4F" : "#FFFFFF",
                borderColor:
                  filter === item.key ? "#2D6A4F" : "#E5E7EB",
              }}
              accessibilityLabel={`Filter by ${item.label}`}
              accessibilityRole="button"
            >
              <Text
                style={{
                  fontSize: 13,
                  color: filter === item.key ? "#FFFFFF" : "#6B7280",
                  fontFamily:
                    filter === item.key
                      ? "Inter_600SemiBold"
                      : "Inter_400Regular",
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Content */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2D6A4F" />
          </View>
        ) : filteredSections.length === 0 ? (
          <View className="flex-1 bg-surface border border-border rounded-2xl items-center justify-center p-8">
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🔔</Text>
            <Text
              className="text-lg text-text-primary text-center mb-2"
              style={{ fontFamily: "Nunito_700Bold" }}
            >
              No reminders yet
            </Text>
            <Text
              className="text-sm text-text-secondary text-center mb-6"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Set reminders for vaccinations, flea treatments, medications, and
              annual checkups. We'll send push notifications so you never miss
              anything.
            </Text>
            <TouchableOpacity
              className="bg-accent rounded-xl px-6 py-3"
              onPress={handleAdd}
              accessibilityLabel="Set your first reminder"
              accessibilityRole="button"
            >
              <Text
                className="text-white text-sm"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Set Your First Reminder
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <SectionList
            sections={filteredSections}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchReminders();
                }}
                tintColor="#2D6A4F"
              />
            }
            renderSectionHeader={({ section }) => (
              <View
                className="flex-row items-center mb-2 mt-3"
              >
                <Text style={{ fontSize: 18, marginRight: 6 }}>
                  {SPECIES_EMOJI[
                    section.data[0]?.pet_species ?? "other"
                  ] ?? "🐾"}
                </Text>
                <Text
                  className="text-base text-text-primary"
                  style={{ fontFamily: "Nunito_700Bold" }}
                >
                  {section.pet_name}
                </Text>
                <View className="ml-2 px-2 py-0.5 rounded-full bg-primary/10">
                  <Text
                    className="text-xs text-primary"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {section.data.length}
                  </Text>
                </View>
              </View>
            )}
            renderItem={({ item }) => (
              <ReminderCard
                reminder={item}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            )}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity
        onPress={handleAdd}
        className="absolute bottom-8 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 6,
          elevation: 6,
        }}
        accessibilityLabel="Add a reminder"
        accessibilityRole="button"
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 30,
            lineHeight: 34,
            fontFamily: "Inter_400Regular",
          }}
        >
          +
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
