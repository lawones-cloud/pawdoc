import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-8 pb-6">
        {/* Header */}
        <Text
          className="text-2xl text-primary mb-1"
          style={{ fontFamily: "Nunito_700Bold" }}
        >
          Symptom Triage
        </Text>
        <Text
          className="text-sm text-text-secondary mb-8"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          Describe your pet's symptoms for AI-powered guidance
        </Text>

        {/* Placeholder */}
        <View className="flex-1 bg-surface border border-border rounded-xl items-center justify-center p-8">
          <Text className="text-5xl mb-4">🩺</Text>
          <Text
            className="text-lg text-text-primary text-center mb-2"
            style={{ fontFamily: "Nunito_700Bold" }}
          >
            Triage Chat
          </Text>
          <Text
            className="text-sm text-text-secondary text-center"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            AI symptom triage coming in the next session.{"\n"}
            Powered by Claude via OpenRouter.
          </Text>
        </View>

        {/* Disclaimer */}
        <Text
          className="text-xs text-text-secondary text-center mt-4"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          PawDoc is not a substitute for professional veterinary advice.
          In an emergency, contact your vet or emergency animal hospital immediately.
        </Text>
      </View>
    </SafeAreaView>
  );
}
