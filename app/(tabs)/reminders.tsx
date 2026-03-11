import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RemindersScreen() {
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
              Reminders
            </Text>
            <Text
              className="text-sm text-text-secondary"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Vaccines, meds, and checkups
            </Text>
          </View>
          <TouchableOpacity
            className="bg-primary rounded-xl px-4 py-2"
            accessibilityLabel="Add a reminder"
            accessibilityRole="button"
          >
            <Text
              className="text-white text-sm"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              + New
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reminder types */}
        <View className="flex-row flex-wrap gap-2 mb-6">
          {["All", "Vaccine", "Flea/Tick", "Medication", "Checkup"].map(
            (label) => (
              <TouchableOpacity
                key={label}
                className={`rounded-full px-4 py-2 border ${
                  label === "All"
                    ? "bg-primary border-primary"
                    : "bg-surface border-border"
                }`}
                accessibilityLabel={`Filter by ${label}`}
                accessibilityRole="button"
              >
                <Text
                  className={`text-sm ${
                    label === "All" ? "text-white" : "text-text-secondary"
                  }`}
                  style={{
                    fontFamily:
                      label === "All" ? "Inter_600SemiBold" : "Inter_400Regular",
                  }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Placeholder */}
        <View className="flex-1 bg-surface border border-border rounded-xl items-center justify-center p-8">
          <Text className="text-5xl mb-4">🔔</Text>
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
            accessibilityLabel="Add your first reminder"
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
      </View>
    </SafeAreaView>
  );
}
