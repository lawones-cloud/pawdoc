/**
 * PawDoc — Emergency Guide Screen
 * Feature 5: Offline Emergency First Aid Reference
 *
 * 8 scenarios sourced from ASPCA / VCA Hospitals guidelines.
 * Reads from bundled JSON — zero network calls.
 * Detail view: signs, numbered steps, "Do NOT" list (red), affiliate CTA,
 * and "Find Emergency Vet Near Me" → Google Maps link.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AffiliateCta {
  name: string;
  url: string;
}

interface EmergencyScenario {
  id: string;
  title: string;
  icon: string;
  severity: string;
  signs: string[];
  immediate_steps: string[];
  do_not: string[];
  when_to_call_vet: string;
  affiliate_cta: AffiliateCta;
}

// ---------------------------------------------------------------------------
// Data loading — reads from bundled JSON, caches to AsyncStorage
// ---------------------------------------------------------------------------

const STORAGE_KEY = "emergency_guide_v1";

const bundledData: EmergencyScenario[] =
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("../../assets/emergency_guide.json") as EmergencyScenario[];

async function loadScenarios(): Promise<EmergencyScenario[]> {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached) as EmergencyScenario[];
    }
    // First launch — seed AsyncStorage from bundled JSON
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bundledData));
    return bundledData;
  } catch {
    // Fallback to bundled data if storage fails
    return bundledData;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SearchBar({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (t: string) => void;
}) {
  return (
    <View className="flex-row items-center bg-surface border border-border rounded-xl px-4 py-3 mb-4">
      <Text className="text-lg mr-2">🔍</Text>
      <TextInput
        className="flex-1 text-text-primary text-sm"
        style={{ fontFamily: "Inter_400Regular" }}
        placeholder="Search emergency scenarios…"
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text className="text-text-secondary text-lg">✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ScenarioCard({
  item,
  onPress,
}: {
  item: EmergencyScenario;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="bg-surface border border-red-200 rounded-xl p-4 mb-3 flex-row items-center"
      onPress={onPress}
      accessibilityLabel={`${item.title} emergency guide`}
      accessibilityRole="button"
    >
      {/* Icon */}
      <View className="bg-red-50 rounded-lg w-12 h-12 items-center justify-center mr-4">
        <Text className="text-2xl">{item.icon}</Text>
      </View>

      {/* Info */}
      <View className="flex-1">
        <Text
          className="text-text-primary text-base mb-1"
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          {item.title}
        </Text>
        <Text
          className="text-text-secondary text-xs"
          numberOfLines={1}
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {item.signs[0]}
        </Text>
      </View>

      {/* Chevron */}
      <Text className="text-red-400 text-lg ml-2">›</Text>
    </TouchableOpacity>
  );
}

function EmergencyBanner() {
  const openVetFinder = useCallback(async () => {
    const url = "https://maps.google.com/maps?q=emergency+vet+near+me";
    try {
      if (Platform.OS !== "web") {
        await Linking.openURL(url);
      } else {
        window.open(url, "_blank");
      }
    } catch {
      Alert.alert(
        "Cannot open maps",
        "Please search for 'emergency vet near me' in your browser."
      );
    }
  }, []);

  return (
    <TouchableOpacity
      className="bg-red-600 rounded-xl p-4 mb-4 flex-row items-center"
      onPress={openVetFinder}
      accessibilityLabel="Find emergency vet near me"
      accessibilityRole="button"
    >
      <Text className="text-2xl mr-3">📍</Text>
      <View className="flex-1">
        <Text
          className="text-white text-sm"
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          Find Emergency Vet Near Me
        </Text>
        <Text
          className="text-white/80 text-xs"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          Opens Google Maps
        </Text>
      </View>
      <Text className="text-white text-xl">→</Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Detail view
// ---------------------------------------------------------------------------

function DetailView({
  scenario,
  onBack,
}: {
  scenario: EmergencyScenario;
  onBack: () => void;
}) {
  const openVetFinder = useCallback(async () => {
    const url = "https://maps.google.com/maps?q=emergency+vet+near+me";
    try {
      if (Platform.OS !== "web") {
        await Linking.openURL(url);
      } else {
        window.open(url, "_blank");
      }
    } catch {
      Alert.alert(
        "Cannot open maps",
        "Please search for 'emergency vet near me' in your browser."
      );
    }
  }, []);

  const openAffiliate = useCallback(async () => {
    try {
      await Linking.openURL(scenario.affiliate_cta.url);
    } catch {
      // silently ignore
    }
  }, [scenario.affiliate_cta.url]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-6 pt-4 pb-8">
          {/* Back button */}
          <TouchableOpacity
            className="flex-row items-center mb-4"
            onPress={onBack}
            accessibilityLabel="Back to emergency guide list"
            accessibilityRole="button"
          >
            <Text className="text-primary text-base mr-1">‹</Text>
            <Text
              className="text-primary text-sm"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              Emergency Guide
            </Text>
          </TouchableOpacity>

          {/* Header */}
          <View className="bg-red-50 border border-red-200 rounded-xl p-5 mb-5 items-center">
            <Text className="text-5xl mb-3">{scenario.icon}</Text>
            <Text
              className="text-text-primary text-xl text-center mb-1"
              style={{ fontFamily: "Nunito_700Bold" }}
            >
              {scenario.title}
            </Text>
            <View className="bg-red-600 rounded-full px-3 py-1 mt-1">
              <Text
                className="text-white text-xs uppercase"
                style={{ fontFamily: "Inter_600SemiBold", letterSpacing: 1 }}
              >
                EMERGENCY
              </Text>
            </View>
          </View>

          {/* Find Vet CTA */}
          <TouchableOpacity
            className="bg-red-600 rounded-xl p-4 mb-5 flex-row items-center"
            onPress={openVetFinder}
            accessibilityLabel="Find emergency vet near me"
            accessibilityRole="button"
          >
            <Text className="text-2xl mr-3">📍</Text>
            <View className="flex-1">
              <Text
                className="text-white text-sm"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Find Emergency Vet Near Me
              </Text>
              <Text
                className="text-white/80 text-xs"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                Opens Google Maps — works offline
              </Text>
            </View>
            <Text className="text-white text-xl">→</Text>
          </TouchableOpacity>

          {/* Signs */}
          <View className="mb-5">
            <Text
              className="text-text-primary text-base mb-3"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              ⚠️ Signs to Watch For
            </Text>
            {scenario.signs.map((sign, idx) => (
              <View key={idx} className="flex-row items-start mb-2">
                <Text className="text-warning text-sm mr-2 mt-0.5">•</Text>
                <Text
                  className="text-text-primary text-sm flex-1"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {sign}
                </Text>
              </View>
            ))}
          </View>

          {/* Immediate Steps */}
          <View className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5">
            <Text
              className="text-text-primary text-base mb-3"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              🚨 Immediate Steps
            </Text>
            {scenario.immediate_steps.map((step, idx) => (
              <View key={idx} className="flex-row items-start mb-3">
                <View className="bg-red-600 rounded-full w-6 h-6 items-center justify-center mr-3 mt-0.5 shrink-0">
                  <Text
                    className="text-white text-xs"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {idx + 1}
                  </Text>
                </View>
                <Text
                  className="text-text-primary text-sm flex-1"
                  style={{ fontFamily: "Inter_400Regular", lineHeight: 20 }}
                >
                  {step}
                </Text>
              </View>
            ))}
          </View>

          {/* Do NOT list */}
          <View className="bg-red-50 border border-red-300 rounded-xl p-4 mb-5">
            <Text
              className="text-red-700 text-base mb-3"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              🚫 DO NOT
            </Text>
            {scenario.do_not.map((item, idx) => (
              <View key={idx} className="flex-row items-start mb-2">
                <Text className="text-red-500 text-sm mr-2 mt-0.5 font-bold">✗</Text>
                <Text
                  className="text-red-700 text-sm flex-1"
                  style={{ fontFamily: "Inter_400Regular", lineHeight: 20 }}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>

          {/* When to call vet */}
          <View className="bg-surface border border-border rounded-xl p-4 mb-5">
            <Text
              className="text-text-primary text-sm mb-2"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              📞 When to Call the Vet
            </Text>
            <Text
              className="text-text-primary text-sm"
              style={{ fontFamily: "Inter_400Regular", lineHeight: 20 }}
            >
              {scenario.when_to_call_vet}
            </Text>
          </View>

          {/* Affiliate CTA */}
          <TouchableOpacity
            className="bg-accent rounded-xl p-4 mb-5 flex-row items-center"
            onPress={openAffiliate}
            accessibilityLabel={`Learn more about ${scenario.affiliate_cta.name}`}
            accessibilityRole="button"
          >
            <Text className="text-2xl mr-3">🛡️</Text>
            <View className="flex-1">
              <Text
                className="text-white text-xs mb-0.5 uppercase"
                style={{ fontFamily: "Inter_500Medium", letterSpacing: 0.5 }}
              >
                Protect Your Pet
              </Text>
              <Text
                className="text-white text-sm"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                {scenario.affiliate_cta.name}
              </Text>
              <Text
                className="text-white/80 text-xs"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                Emergency vet bills can exceed $5,000 — be prepared
              </Text>
            </View>
            <Text className="text-white text-xl">→</Text>
          </TouchableOpacity>

          {/* Disclaimer */}
          <View className="bg-surface border border-border rounded-xl p-4">
            <Text
              className="text-text-secondary text-xs leading-relaxed"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              <Text style={{ fontFamily: "Inter_600SemiBold" }}>Disclaimer: </Text>
              This guide provides general first aid information based on ASPCA and VCA Hospitals
              veterinary guidelines. It is not a substitute for professional veterinary care.
              Always contact a licensed veterinarian for evaluation and treatment. In a life-threatening
              emergency, go to the nearest emergency animal hospital immediately.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function EmergencyScreen() {
  const [scenarios, setScenarios] = useState<EmergencyScenario[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EmergencyScenario | null>(null);

  useEffect(() => {
    loadScenarios().then(setScenarios);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return scenarios;
    const q = search.toLowerCase();
    return scenarios.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.signs.some((sign) => sign.toLowerCase().includes(q)) ||
        s.immediate_steps.some((step) => step.toLowerCase().includes(q))
    );
  }, [scenarios, search]);

  // Detail view
  if (selected) {
    return (
      <DetailView
        scenario={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  // List view
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6">
        {/* Header */}
        <View className="mb-4">
          <Text
            className="text-2xl text-text-primary mb-1"
            style={{ fontFamily: "Nunito_700Bold" }}
          >
            ⚠️ Emergency Guide
          </Text>
          <Text
            className="text-sm text-text-secondary"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Offline first aid for critical pet emergencies
          </Text>
        </View>

        {/* Emergency vet finder */}
        <EmergencyBanner />

        {/* Search */}
        <SearchBar value={search} onChangeText={setSearch} />

        {/* Scenario count */}
        <Text
          className="text-xs text-text-secondary mb-3"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {filtered.length} scenario{filtered.length !== 1 ? "s" : ""}
          {search.trim() ? " found" : " available"}
        </Text>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ScenarioCard item={item} onPress={() => setSelected(item)} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-4xl mb-4">🔍</Text>
              <Text
                className="text-text-secondary text-sm text-center"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                No scenarios match &ldquo;{search}&rdquo;
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
