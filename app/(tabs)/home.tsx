import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-6 pt-8 pb-6">
          {/* Header */}
          <Text
            className="text-2xl text-primary mb-1"
            style={{ fontFamily: "Nunito_700Bold" }}
          >
            Good morning 👋
          </Text>
          <Text
            className="text-sm text-text-secondary mb-8"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            How are your pets doing today?
          </Text>

          {/* Quick Actions */}
          <Text
            className="text-base text-text-primary mb-4"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            Quick Actions
          </Text>

          <View className="gap-3 mb-8">
            <TouchableOpacity
              className="bg-primary rounded-xl p-4 flex-row items-center"
              onPress={() => router.push("/(tabs)/chat")}
              accessibilityLabel="Start AI triage"
              accessibilityRole="button"
            >
              <Text className="text-3xl mr-4">🩺</Text>
              <View className="flex-1">
                <Text
                  className="text-white text-base"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  Check Symptoms
                </Text>
                <Text
                  className="text-white/80 text-sm"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  AI-powered triage, anytime
                </Text>
              </View>
              <Text className="text-white text-xl">→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-surface border border-border rounded-xl p-4 flex-row items-center"
              onPress={() => router.push("/(tabs)/pets")}
              accessibilityLabel="View my pets"
              accessibilityRole="button"
            >
              <Text className="text-3xl mr-4">🐾</Text>
              <View className="flex-1">
                <Text
                  className="text-text-primary text-base"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  My Pets
                </Text>
                <Text
                  className="text-text-secondary text-sm"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  Profiles and health records
                </Text>
              </View>
              <Text className="text-text-secondary text-xl">→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-surface border border-border rounded-xl p-4 flex-row items-center"
              onPress={() => router.push("/(tabs)/reminders")}
              accessibilityLabel="View reminders"
              accessibilityRole="button"
            >
              <Text className="text-3xl mr-4">🔔</Text>
              <View className="flex-1">
                <Text
                  className="text-text-primary text-base"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  Reminders
                </Text>
                <Text
                  className="text-text-secondary text-sm"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  Vaccines, meds, and checkups
                </Text>
              </View>
              <Text className="text-text-secondary text-xl">→</Text>
            </TouchableOpacity>
          </View>

          {/* Placeholder recent activity */}
          <Text
            className="text-base text-text-primary mb-4"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            Recent Activity
          </Text>
          <View className="bg-surface border border-border rounded-xl p-6 items-center">
            <Text className="text-4xl mb-3">📋</Text>
            <Text
              className="text-text-secondary text-sm text-center"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              No recent activity yet.{"\n"}Add a pet to get started!
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
