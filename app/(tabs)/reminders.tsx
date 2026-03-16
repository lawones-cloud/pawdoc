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
import { LinearGradient } from "expo-linear-gradient";
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

function statusBorderColor(reminder: Reminder): string {
  if (!reminder.is_active) return "#E2EBE6";
  const due = new Date(reminder.due_date);
  const now = new Date();
  const diffDays = Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return "#DC2626";
  return "#059669";
}

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
    : "#95A89F";
  const leftBorder = statusBorderColor(reminder);

  return (
    <TouchableOpacity
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        borderLeftWidth: 4,
        borderLeftColor: leftBorder,
        opacity: reminder.is_active ? 1 : 0.6,
        shadowColor: "#1B4332",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 2,
      }}
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
    >
      {/* Icon badge */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: "#D8F3DC",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: "#0F1F17",
            fontSize: 14,
            fontFamily: "Nunito_700Bold",
            marginBottom: 2,
            letterSpacing: -0.1,
          }}
          numberOfLines={1}
        >
          {reminder.title ?? label}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: dueColor,
            fontFamily: "Inter_600SemiBold",
            marginBottom: 2,
          }}
        >
          {formatDueDate(reminder.due_date)}
        </Text>
        <Text
          style={{
            color: "#52796F",
            fontSize: 11,
            fontFamily: "Inter_400Regular",
          }}
        >
          {label} · {recurrenceLabel(reminder)}
        </Text>
        {reminder.affiliate_cta ? (
          <Text
            style={{
              color: "#F4A261",
              fontSize: 11,
              fontFamily: "Inter_500Medium",
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            Refill: {reminder.affiliate_cta}
          </Text>
        ) : null}
      </View>

      {/* Active toggle pill */}
      <TouchableOpacity
        onPress={() => onToggle(reminder)}
        style={{
          marginLeft: 10,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: reminder.is_active ? "#D8F3DC" : "#F0F4F2",
        }}
        accessibilityLabel={
          reminder.is_active ? "Deactivate reminder" : "Activate reminder"
        }
        accessibilityRole="switch"
      >
        <Text
          style={{
            fontSize: 11,
            color: reminder.is_active ? "#1B4332" : "#95A89F",
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

const FILTER_OPTIONS: {
  key: "all" | Reminder["type"];
  label: string;
}[] = [
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
          <Text style={{ fontSize: 22, marginRight: 10 }}>🔔</Text>
          <View>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 22,
                fontFamily: "Nunito_700Bold",
                letterSpacing: -0.3,
              }}
            >
              Reminders
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 12,
                fontFamily: "Inter_400Regular",
              }}
            >
              {totalCount} reminder{totalCount !== 1 ? "s" : ""} for your pets
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
        {/* Filter chips */}
        <FlatList
          data={FILTER_OPTIONS}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: 14 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setFilter(item.key)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 7,
                marginRight: 8,
                backgroundColor:
                  filter === item.key ? "#1B4332" : "#FFFFFF",
                borderWidth: 1,
                borderColor:
                  filter === item.key ? "#1B4332" : "#E2EBE6",
                shadowColor: "#1B4332",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: filter === item.key ? 0.15 : 0.04,
                shadowRadius: 4,
                elevation: filter === item.key ? 2 : 1,
              }}
              accessibilityLabel={`Filter by ${item.label}`}
              accessibilityRole="button"
            >
              <Text
                style={{
                  fontSize: 13,
                  color: filter === item.key ? "#FFFFFF" : "#52796F",
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
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#1B4332" />
          </View>
        ) : filteredSections.length === 0 ? (
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
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🔔</Text>
            <Text
              style={{
                fontSize: 18,
                color: "#0F1F17",
                textAlign: "center",
                marginBottom: 8,
                fontFamily: "Nunito_700Bold",
              }}
            >
              No reminders yet
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
              Set reminders for vaccinations, flea treatments, medications, and
              annual checkups.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#F4A261",
                borderRadius: 14,
                paddingHorizontal: 24,
                paddingVertical: 13,
              }}
              onPress={handleAdd}
              accessibilityLabel="Set your first reminder"
              accessibilityRole="button"
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                }}
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
                tintColor="#1B4332"
              />
            }
            renderSectionHeader={({ section }) => (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                  marginTop: 16,
                }}
              >
                <Text style={{ fontSize: 18, marginRight: 6 }}>
                  {SPECIES_EMOJI[
                    section.data[0]?.pet_species ?? "other"
                  ] ?? "🐾"}
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    color: "#0F1F17",
                    fontFamily: "Nunito_700Bold",
                  }}
                >
                  {section.pet_name}
                </Text>
                <View
                  style={{
                    marginLeft: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                    backgroundColor: "#D8F3DC",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#1B4332",
                      fontFamily: "Inter_600SemiBold",
                    }}
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
            contentContainerStyle={{ paddingBottom: 120 }}
          />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity
        onPress={handleAdd}
        style={{
          position: "absolute",
          bottom: 104,
          right: 24,
          width: 56,
          height: 56,
          backgroundColor: "#1B4332",
          borderRadius: 28,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#1B4332",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
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
