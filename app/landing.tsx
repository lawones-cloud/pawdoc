import { View, Text, TouchableOpacity, ScrollView, Linking } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const FEATURES = [
  {
    icon: "🩺",
    title: "AI Symptom Triage",
    desc: "Ask anything. Get instant, vet-informed guidance — any time of day.",
  },
  {
    icon: "📋",
    title: "Health Records",
    desc: "Never forget a vaccine or weight check again.",
  },
  {
    icon: "🥗",
    title: "Smart Nutrition",
    desc: "Personalized food recommendations delivered to your door.",
  },
  {
    icon: "🔔",
    title: "Smart Reminders",
    desc: "Never miss a medication dose or vaccination. We'll remind you.",
  },
  {
    icon: "🚨",
    title: "Emergency Guide",
    desc: "15 first-aid scenarios, available offline when seconds count.",
  },
];

const INCLUDED = [
  "Unlimited triage sessions",
  "2 Pet Profiles",
  "Smart Reminders",
  "Emergency Guide",
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO ── */}
        <View className="items-center px-6 pt-14 pb-10 bg-background">
          <View className="w-24 h-24 rounded-full bg-primary items-center justify-center mb-6">
            <Text className="text-5xl">🐾</Text>
          </View>

          <Text
            className="text-4xl text-primary text-center mb-3"
            style={{ fontFamily: "Nunito_700Bold" }}
          >
            PawDoc
          </Text>

          <Text
            className="text-2xl text-text-primary text-center mb-3 leading-tight"
            style={{ fontFamily: "Nunito_700Bold" }}
          >
            Your pet's AI doctor,{"\n"}always in your pocket.
          </Text>

          <Text
            className="text-base text-text-secondary text-center mb-8 max-w-xs"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Instant triage, health tracking, and nutrition advice.{"\n"}Free,
            forever.
          </Text>

          <TouchableOpacity
            className="w-full max-w-sm bg-accent rounded-xl py-4 items-center mb-3"
            onPress={() => router.push("/(auth)/login")}
            accessibilityRole="button"
            accessibilityLabel="Get started for free"
          >
            <Text
              className="text-white text-base"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              Get Started Free
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-full max-w-sm border border-primary rounded-xl py-4 items-center"
            onPress={() => router.push("/(auth)/login")}
            accessibilityRole="button"
            accessibilityLabel="Sign in to your account"
          >
            <Text
              className="text-primary text-base"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              Sign In
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── FEATURES ── */}
        <View className="px-6 py-10 bg-surface">
          <Text
            className="text-2xl text-primary text-center mb-6"
            style={{ fontFamily: "Nunito_700Bold" }}
          >
            Everything your pet needs
          </Text>

          <View className="gap-4">
            {FEATURES.map((feature) => (
              <View
                key={feature.title}
                className="flex-row items-start bg-background rounded-xl p-4 border border-border"
              >
                <Text className="text-2xl mr-4 mt-0.5">{feature.icon}</Text>
                <View className="flex-1">
                  <Text
                    className="text-base text-text-primary mb-1"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {feature.title}
                  </Text>
                  <Text
                    className="text-sm text-text-secondary"
                    style={{ fontFamily: "Inter_400Regular" }}
                  >
                    {feature.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── PRICING ── */}
        <View className="px-6 py-10 bg-background">
          <Text
            className="text-2xl text-primary text-center mb-2"
            style={{ fontFamily: "Nunito_700Bold" }}
          >
            Pricing
          </Text>
          <Text
            className="text-sm text-text-secondary text-center mb-6"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Revenue is generated via affiliate partnerships — not your wallet.
          </Text>

          <View className="bg-surface rounded-2xl p-6 border border-primary max-w-sm self-center w-full">
            {/* Badge */}
            <View className="bg-accent rounded-full px-3 py-1 self-start mb-4">
              <Text
                className="text-white text-xs"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Free Plan
              </Text>
            </View>

            <Text
              className="text-5xl text-primary mb-1"
              style={{ fontFamily: "Nunito_700Bold" }}
            >
              $0
            </Text>
            <Text
              className="text-sm text-text-secondary mb-5"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              No credit card required. Ever.
            </Text>

            <View className="gap-3 mb-6">
              {INCLUDED.map((item) => (
                <View key={item} className="flex-row items-center">
                  <Text className="text-success text-base mr-2">✓</Text>
                  <Text
                    className="text-sm text-text-primary"
                    style={{ fontFamily: "Inter_400Regular" }}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              className="bg-primary rounded-xl py-3 items-center"
              onPress={() => router.push("/(auth)/login")}
              accessibilityRole="button"
              accessibilityLabel="Get started for free"
            >
              <Text
                className="text-white text-base"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Get Started Free
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View className="px-6 py-8 bg-primary items-center">
          <Text
            className="text-white text-xl mb-1"
            style={{ fontFamily: "Nunito_700Bold" }}
          >
            PawDoc
          </Text>
          <Text
            className="text-white/70 text-sm text-center mb-6"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Your pet's AI doctor, always in your pocket
          </Text>

          <View className="flex-row gap-6 mb-4">
            <TouchableOpacity
              onPress={() => router.push("/privacy" as any)}
              accessibilityRole="link"
            >
              <Text
                className="text-white/80 text-sm"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                Privacy Policy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/terms" as any)}
              accessibilityRole="link"
            >
              <Text
                className="text-white/80 text-sm"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                Terms
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Linking.openURL("mailto:hello@pawdoc.app")}
              accessibilityRole="link"
            >
              <Text
                className="text-white/80 text-sm"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                Contact
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            className="text-white/50 text-xs text-center mb-2"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            PawDoc may earn a commission if you purchase through our partner
            links, at no additional cost to you.
          </Text>
          <Text
            className="text-white/50 text-xs text-center"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            © 2026 PawDoc
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
