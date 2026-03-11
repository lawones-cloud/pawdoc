import { Tabs } from "expo-router";
import { Colors } from "@/constants/theme";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <span style={{ fontSize: focused ? 26 : 22, opacity: focused ? 1 : 0.6 }}>
      {emoji}
    </span>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: "#E5E7EB",
          borderTopWidth: 1,
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="pets"
        options={{
          title: "My Pets",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🐾" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Triage",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🩺" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: "Reminders",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🔔" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: "Nutrition",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🥗" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
