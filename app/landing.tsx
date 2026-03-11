import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LandingPage() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Hero Section */}
        <View className="flex-1 px-6 pt-12 pb-8 items-center">
          {/* Logo / Icon placeholder */}
          <View className="w-24 h-24 rounded-full bg-primary items-center justify-center mb-6">
            <Text className="text-4xl">🐾</Text>
          </View>

          <Text
            className="text-4xl text-primary text-center mb-2"
            style={{ fontFamily: "Nunito_700Bold" }}
          >
            PawDoc
          </Text>

          <Text
            className="text-base text-text-secondary text-center mb-8 max-w-xs"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Your pet's AI doctor, always in your pocket
          </Text>

          {/* Value props */}
          <View className="w-full max-w-sm mb-10 gap-4">
            {[
              { icon: "🩺", title: "AI Symptom Triage", desc: "Immediate answers at 2 AM — no panic, no guessing." },
              { icon: "📋", title: "Pet Health Profiles", desc: "Vaccinations, weight, meds — all in one place." },
              { icon: "🔔", title: "Smart Reminders", desc: "Never miss a vaccine, flea treatment, or checkup." },
            ].map((item) => (
              <View
                key={item.title}
                className="flex-row items-start bg-surface rounded-xl p-4 shadow-sm"
              >
                <Text className="text-2xl mr-3">{item.icon}</Text>
                <View className="flex-1">
                  <Text
                    className="text-base text-text-primary mb-1"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    className="text-sm text-text-secondary"
                    style={{ fontFamily: "Inter_400Regular" }}
                  >
                    {item.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* CTAs */}
          <TouchableOpacity
            className="w-full max-w-sm bg-primary rounded-xl py-4 items-center mb-3"
            onPress={() => router.push("/(auth)/login")}
            accessibilityLabel="Get started for free"
            accessibilityRole="button"
          >
            <Text
              className="text-white text-base"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              Get Started — It's Free
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-full max-w-sm border border-primary rounded-xl py-4 items-center"
            onPress={() => router.push("/(auth)/login")}
            accessibilityLabel="Sign in to your account"
            accessibilityRole="button"
          >
            <Text
              className="text-primary text-base"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              Sign In
            </Text>
          </TouchableOpacity>

          {/* Disclaimer */}
          <Text
            className="text-xs text-text-secondary text-center mt-6 max-w-xs"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            PawDoc provides AI-generated guidance only. It is not a substitute
            for professional veterinary advice. Always consult a licensed vet
            for diagnosis and treatment.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
