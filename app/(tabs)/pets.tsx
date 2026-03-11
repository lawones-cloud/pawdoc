import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PetsScreen() {
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
            className="bg-primary rounded-xl px-4 py-2"
            accessibilityLabel="Add a pet"
            accessibilityRole="button"
          >
            <Text
              className="text-white text-sm"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              + Add Pet
            </Text>
          </TouchableOpacity>
        </View>

        {/* Placeholder */}
        <View className="flex-1 bg-surface border border-border rounded-xl items-center justify-center p-8">
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
            Add your first pet to track their health records, vaccinations, and
            more.
          </Text>
          <TouchableOpacity
            className="bg-primary rounded-xl px-6 py-3"
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

        {/* Free tier note */}
        <Text
          className="text-xs text-text-secondary text-center mt-4"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          Free accounts support up to 2 pets.
        </Text>
      </View>
    </SafeAreaView>
  );
}
