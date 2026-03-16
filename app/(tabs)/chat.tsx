/**
 * PawDoc — AI Symptom Triage Chat Screen
 * PRD Feature 1: AI Symptom Triage Chat
 *
 * - Conversational interface: message bubbles (user right, AI left)
 * - Pet selector dropdown at top (if user has multiple pets)
 * - Input bar at bottom with send button
 * - AI response renders: assessment, severity badge, home care steps,
 *   vet urgency label, emergency banner (severity 8+), affiliate CTA card
 * - Mandatory disclaimer shown below every AI response
 * - Severity 8+: red emergency banner "Seek emergency vet now"
 * - Logs affiliate_events impression when CTA card is shown
 * - NativeWind styling, brand colours
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pet {
  id: string;
  name: string;
  species: string;
}

interface AffiliateCTA {
  affiliate_name: string;
  affiliate_url: string;
  commission_type: string;
}

interface TriageResponse {
  severity: number;
  topic_keyword: string | null;
  assessment: string;
  likely_causes: string[];
  home_care: string[] | null;
  vet_urgency: string;
  emergency_steps: string[] | null;
  disclaimer: string;
  affiliate_cta: AffiliateCTA | null;
}

interface ClarifyingResponse {
  type: "clarifying";
  questions: string[];
  tier: number;
  model: string;
}

interface TriageAPIResponse {
  type: "triage";
  tier: number;
  model: string;
  session_id: string;
  response: TriageResponse;
}

type APIResponse = ClarifyingResponse | TriageAPIResponse;

type ChatMessageRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: Date;
  triageData?: TriageResponse;
  isClarifying?: boolean;
  clarifyingQuestions?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function severityColor(severity: number): string {
  if (severity >= 8) return "#EF4444"; // red
  if (severity >= 5) return "#F59E0B"; // amber
  return "#10B981"; // green
}

function severityLabel(severity: number): string {
  if (severity >= 8) return "Critical";
  if (severity >= 5) return "Moderate";
  return "Mild";
}

function vetUrgencyLabel(vet_urgency: string): string {
  switch (vet_urgency) {
    case "emergency":
      return "EMERGENCY — Go to vet NOW";
    case "urgent":
      return "Urgent — See vet today";
    case "see_vet_soon":
      return "See vet within 24-48 hrs";
    case "monitor":
      return "Monitor at home";
    default:
      return vet_urgency;
  }
}

function vetUrgencyColor(vet_urgency: string): string {
  switch (vet_urgency) {
    case "emergency":
      return "#EF4444";
    case "urgent":
      return "#F59E0B";
    case "see_vet_soon":
      return "#3B82F6";
    default:
      return "#10B981";
  }
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// ---------------------------------------------------------------------------
// Emergency Gatekeeper — keyword list mirrors supabase/functions/triage
// ---------------------------------------------------------------------------

const EMERGENCY_KEYWORDS = [
  "emergency",
  "seizure",
  "poison",
  "unresponsive",
  "bleeding",
  "choking",
  "cant breathe",
  "cannot breathe",
  "not breathing",
  "collapsed",
  "unconscious",
];

function isEmergencyQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw));
}

// ---------------------------------------------------------------------------
// Affiliate impression logger
// ---------------------------------------------------------------------------

async function logAffiliateImpression(
  userId: string,
  petId: string,
  affiliateName: string,
  affiliateUrl: string
): Promise<void> {
  try {
    await supabase.from("affiliate_events").insert({
      user_id: userId,
      pet_id: petId,
      affiliate_name: affiliateName,
      affiliate_url: affiliateUrl,
      event_type: "impression",
    });
  } catch {
    // non-blocking
  }
}

async function logAffiliateClick(
  userId: string,
  petId: string,
  affiliateName: string,
  affiliateUrl: string
): Promise<void> {
  try {
    await supabase.from("affiliate_events").insert({
      user_id: userId,
      pet_id: petId,
      affiliate_name: affiliateName,
      affiliate_url: affiliateUrl,
      event_type: "click",
    });
  } catch {
    // non-blocking
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SeverityBadge({ severity }: { severity: number }) {
  const color = severityColor(severity);
  const label = severityLabel(severity);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: color + "20",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
        marginBottom: 8,
        borderWidth: 1,
        borderColor: color + "60",
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          marginRight: 6,
        }}
      />
      <Text style={{ color: color, fontSize: 13, fontWeight: "600" }}>
        Severity {severity}/10 — {label}
      </Text>
    </View>
  );
}

function EmergencyBanner() {
  const openMap = () => {
    const url = "https://maps.google.com/maps?q=emergency+vet+near+me";
    if (Platform.OS === "web") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).open(url, "_blank");
    } else {
      Linking.openURL(url);
    }
  };

  const openVetster = () => {
    const url = "https://vetster.com/referral";
    if (Platform.OS === "web") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).open(url, "_blank");
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <View
      style={{
        backgroundColor: "#FEE2E2",
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#EF4444",
      }}
    >
      <Text
        style={{
          color: "#EF4444",
          fontSize: 15,
          fontWeight: "700",
          marginBottom: 6,
        }}
      >
        Seek emergency vet now
      </Text>
      <Text style={{ color: "#7F1D1D", fontSize: 13, marginBottom: 10 }}>
        This situation may be life-threatening. Do not wait.
      </Text>
      <TouchableOpacity
        onPress={openVetster}
        style={{
          backgroundColor: "#EF4444",
          borderRadius: 8,
          paddingVertical: 10,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>
          Connect with a Vet Now (Vetster)
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={openMap}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 8,
          paddingVertical: 10,
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#EF4444",
        }}
      >
        <Text style={{ color: "#EF4444", fontWeight: "600", fontSize: 14 }}>
          Find Emergency Vet Near Me
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// GateBlockedBanner — shown when an emergency query is blocked by the gatekeeper
// ---------------------------------------------------------------------------

interface GateBlockedBannerProps {
  nearestVetUrl: string;
  onDismiss: () => void;
}

function GateBlockedBanner({ nearestVetUrl, onDismiss }: GateBlockedBannerProps) {
  const openMap = () => {
    if (Platform.OS === "web") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).open(nearestVetUrl, "_blank");
    } else {
      Linking.openURL(nearestVetUrl);
    }
  };

  return (
    <View
      style={{
        backgroundColor: "#FEF2F2",
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#EF4444",
      }}
    >
      <Text
        style={{
          color: "#EF4444",
          fontSize: 15,
          fontWeight: "700",
          marginBottom: 6,
        }}
      >
        Pet Profile Required
      </Text>
      <Text style={{ color: "#7F1D1D", fontSize: 13, lineHeight: 18, marginBottom: 12 }}>
        To receive AI-powered emergency guidance, please complete your pet's
        profile first. In the meantime, find the nearest emergency vet now.
      </Text>

      <TouchableOpacity
        onPress={openMap}
        style={{
          backgroundColor: "#EF4444",
          borderRadius: 8,
          paddingVertical: 10,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>
          Find Emergency Vet Near Me
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onDismiss}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 8,
          paddingVertical: 8,
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#D1D5DB",
        }}
      >
        <Text style={{ color: "#6B7280", fontSize: 13 }}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
}

interface AffiliateCTACardProps {
  cta: AffiliateCTA;
  userId: string;
  petId: string;
  alreadyLogged: boolean;
  onImpression: () => void;
}

function AffiliateCTACard({
  cta,
  userId,
  petId,
  alreadyLogged,
  onImpression,
}: AffiliateCTACardProps) {
  useEffect(() => {
    if (!alreadyLogged) {
      logAffiliateImpression(userId, petId, cta.affiliate_name, cta.affiliate_url);
      onImpression();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = () => {
    logAffiliateClick(userId, petId, cta.affiliate_name, cta.affiliate_url);
    if (Platform.OS === "web") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).open(cta.affiliate_url, "_blank");
    } else {
      Linking.openURL(cta.affiliate_url);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        backgroundColor: "#FFF7ED",
        borderRadius: 10,
        padding: 14,
        marginTop: 10,
        borderWidth: 1,
        borderColor: "#F4A261",
        flexDirection: "row",
        alignItems: "center",
      }}
      accessibilityLabel={`Sponsored: ${cta.affiliate_name}`}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#92400E", fontSize: 11, marginBottom: 2 }}>
          Sponsored Partner
        </Text>
        <Text
          style={{ color: "#1A1A1A", fontWeight: "700", fontSize: 14, marginBottom: 2 }}
        >
          {cta.affiliate_name}
        </Text>
        <Text style={{ color: "#6B7280", fontSize: 12 }}>
          Tap to learn more
        </Text>
      </View>
      <View
        style={{
          backgroundColor: "#F4A261",
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
          View
        </Text>
      </View>
    </TouchableOpacity>
  );
}

interface TriageResponseCardProps {
  triage: TriageResponse;
  userId: string;
  petId: string;
  shownAffiliates: React.MutableRefObject<Set<string>>;
}

function TriageResponseCard({
  triage,
  userId,
  petId,
  shownAffiliates,
}: TriageResponseCardProps) {
  const isEmergency = triage.severity >= 8;
  const urgencyColor = vetUrgencyColor(triage.vet_urgency);

  const affiliateAlreadyLogged =
    triage.affiliate_cta
      ? shownAffiliates.current.has(triage.affiliate_cta.affiliate_name)
      : false;

  const handleImpression = () => {
    if (triage.affiliate_cta) {
      shownAffiliates.current.add(triage.affiliate_cta.affiliate_name);
    }
  };

  return (
    <View style={{ marginTop: 4 }}>
      {/* Emergency Banner */}
      {isEmergency && <EmergencyBanner />}

      {/* Severity Badge */}
      <SeverityBadge severity={triage.severity} />

      {/* Assessment */}
      <Text
        style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 20, marginBottom: 10 }}
      >
        {triage.assessment}
      </Text>

      {/* Likely Causes */}
      {triage.likely_causes && triage.likely_causes.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          <Text
            style={{ color: "#374151", fontWeight: "700", fontSize: 13, marginBottom: 4 }}
          >
            Likely Causes
          </Text>
          {triage.likely_causes.map((cause, i) => (
            <Text
              key={i}
              style={{ color: "#4B5563", fontSize: 13, marginBottom: 2 }}
            >
              {"\u2022"} {cause}
            </Text>
          ))}
        </View>
      )}

      {/* Home Care (Tier 1 & 2 only) */}
      {triage.home_care && triage.home_care.length > 0 && (
        <View
          style={{
            backgroundColor: "#F0FDF4",
            borderRadius: 8,
            padding: 12,
            marginBottom: 10,
            borderLeftWidth: 3,
            borderLeftColor: "#10B981",
          }}
        >
          <Text
            style={{ color: "#065F46", fontWeight: "700", fontSize: 13, marginBottom: 4 }}
          >
            Home Care Steps
          </Text>
          {triage.home_care.map((step, i) => (
            <Text
              key={i}
              style={{ color: "#064E3B", fontSize: 13, marginBottom: 2 }}
            >
              {i + 1}. {step}
            </Text>
          ))}
        </View>
      )}

      {/* Emergency Steps (Tier 3 only) */}
      {triage.emergency_steps && triage.emergency_steps.length > 0 && (
        <View
          style={{
            backgroundColor: "#FEF2F2",
            borderRadius: 8,
            padding: 12,
            marginBottom: 10,
            borderLeftWidth: 3,
            borderLeftColor: "#EF4444",
          }}
        >
          <Text
            style={{ color: "#7F1D1D", fontWeight: "700", fontSize: 13, marginBottom: 4 }}
          >
            Immediate Steps
          </Text>
          {triage.emergency_steps.map((step, i) => (
            <Text
              key={i}
              style={{ color: "#7F1D1D", fontSize: 13, marginBottom: 2 }}
            >
              {i + 1}. {step}
            </Text>
          ))}
        </View>
      )}

      {/* Vet Urgency */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 10,
          backgroundColor: urgencyColor + "15",
          borderRadius: 8,
          padding: 10,
        }}
      >
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: urgencyColor,
            marginRight: 8,
          }}
        />
        <Text
          style={{ color: urgencyColor, fontWeight: "600", fontSize: 13 }}
        >
          {vetUrgencyLabel(triage.vet_urgency)}
        </Text>
      </View>

      {/* Affiliate CTA (non-emergency only) */}
      {!isEmergency && triage.affiliate_cta && (
        <AffiliateCTACard
          cta={triage.affiliate_cta}
          userId={userId}
          petId={petId}
          alreadyLogged={affiliateAlreadyLogged}
          onImpression={handleImpression}
        />
      )}

      {/* Disclaimer */}
      <View
        style={{
          marginTop: 10,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
        }}
      >
        <Text style={{ color: "#9CA3AF", fontSize: 11, lineHeight: 16 }}>
          {triage.disclaimer}
        </Text>
      </View>
    </View>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  userId: string;
  petId: string;
  shownAffiliates: React.MutableRefObject<Set<string>>;
}

function MessageBubble({ message, userId, petId, shownAffiliates }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          marginBottom: 12,
          paddingLeft: 48,
        }}
      >
        <View
          style={{
            backgroundColor: "#2D6A4F",
            borderRadius: 16,
            borderBottomRightRadius: 4,
            paddingHorizontal: 14,
            paddingVertical: 10,
            maxWidth: "85%",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 14, lineHeight: 20 }}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  // Assistant bubble
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "flex-start",
        marginBottom: 12,
        paddingRight: 48,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: "#2D6A4F",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 8,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <Text style={{ fontSize: 16 }}>🐾</Text>
      </View>
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          borderBottomLeftRadius: 4,
          paddingHorizontal: 14,
          paddingVertical: 12,
          maxWidth: "88%",
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
          flex: 1,
        }}
      >
        {/* Clarifying questions */}
        {message.isClarifying && message.clarifyingQuestions && (
          <View>
            <Text
              style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 20, marginBottom: 8 }}
            >
              {message.content}
            </Text>
            {message.clarifyingQuestions.map((q, i) => (
              <Text
                key={i}
                style={{
                  color: "#2D6A4F",
                  fontSize: 14,
                  lineHeight: 20,
                  marginBottom: 4,
                  fontWeight: "500",
                }}
              >
                {i + 1}. {q}
              </Text>
            ))}
          </View>
        )}

        {/* Triage response */}
        {message.triageData && (
          <TriageResponseCard
            triage={message.triageData}
            userId={userId}
            petId={petId}
            shownAffiliates={shownAffiliates}
          />
        )}

        {/* Plain text */}
        {!message.isClarifying && !message.triageData && (
          <Text style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 20 }}>
            {message.content}
          </Text>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pet Selector
// ---------------------------------------------------------------------------

interface PetSelectorProps {
  pets: Pet[];
  selectedPetId: string;
  onSelect: (petId: string) => void;
}

function PetSelector({ pets, selectedPetId, onSelect }: PetSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = pets.find((p) => p.id === selectedPetId);

  if (pets.length <= 1) {
    return (
      <View
        style={{
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 16, marginRight: 6 }}>
          {selected?.species === "cat" ? "🐱" : "🐶"}
        </Text>
        <Text
          style={{ color: "#1A1A1A", fontWeight: "600", fontSize: 15 }}
        >
          {selected?.name ?? "Your Pet"}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
      }}
    >
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 16, marginRight: 6 }}>
            {selected?.species === "cat" ? "🐱" : "🐶"}
          </Text>
          <Text style={{ color: "#1A1A1A", fontWeight: "600", fontSize: 15 }}>
            {selected?.name ?? "Select Pet"}
          </Text>
        </View>
        <Text style={{ color: "#6B7280", fontSize: 12 }}>{open ? "v" : ">"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={{ borderTopWidth: 1, borderTopColor: "#E5E7EB" }}>
          {pets.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => {
                onSelect(p.id);
                setOpen(false);
              }}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: p.id === selectedPetId ? "#F0FDF4" : "#FFFFFF",
              }}
            >
              <Text style={{ fontSize: 14, marginRight: 8 }}>
                {p.species === "cat" ? "🐱" : "🐶"}
              </Text>
              <Text
                style={{
                  color: p.id === selectedPetId ? "#2D6A4F" : "#1A1A1A",
                  fontWeight: p.id === selectedPetId ? "600" : "400",
                  fontSize: 14,
                }}
              >
                {p.name}
              </Text>
              {p.id === selectedPetId && (
                <Text style={{ color: "#2D6A4F", marginLeft: 6 }}>ok</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main ChatScreen
// ---------------------------------------------------------------------------

export default function ChatScreen() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState<string>(generateSessionId);
  const [conversationHistory, setConversationHistory] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [clarifyingCount, setClarifyingCount] = useState(0);
  const [loadingPets, setLoadingPets] = useState(true);
  const [gateBlocked, setGateBlocked] = useState(false);
  const [gateNearestVetUrl, setGateNearestVetUrl] = useState(
    "https://maps.google.com/maps?q=emergency+vet+near+me"
  );

  const scrollRef = useRef<ScrollView>(null);
  const shownAffiliates = useRef<Set<string>>(new Set());

  // Load user and pets
  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoadingPets(false);
        return;
      }

      setUserId(user.id);

      const { data: petsData } = await supabase
        .from("pets")
        .select("id, name, species")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (petsData && petsData.length > 0) {
        setPets(petsData as Pet[]);
        setSelectedPetId(petsData[0].id);

        // Welcome message
        const petName = (petsData[0] as Pet).name;
        setMessages([
          {
            id: generateId(),
            role: "assistant",
            content: `Hi! I'm PawDoc. How is ${petName} feeling today? Describe any symptoms and I'll help assess what's going on.`,
            timestamp: new Date(),
          },
        ]);
      }

      setLoadingPets(false);
    }

    loadData();
  }, []);

  // Update welcome message when pet changes
  const handlePetChange = useCallback(
    (petId: string) => {
      setSelectedPetId(petId);
      const pet = pets.find((p) => p.id === petId);
      // Reset conversation
      setMessages([
        {
          id: generateId(),
          role: "assistant",
          content: `Switched to ${pet?.name ?? "your pet"}. How are they feeling today? Describe any symptoms and I'll help assess what's going on.`,
          timestamp: new Date(),
        },
      ]);
      setConversationHistory([]);
      setClarifyingCount(0);
      shownAffiliates.current = new Set();
      setGateBlocked(false);
    },
    [pets]
  );

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || loading || !selectedPetId) return;

    setInputText("");
    setLoading(true);

    // Add user message to UI
    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Build updated conversation history
    const updatedHistory = [
      ...conversationHistory,
      { role: "user" as const, content: text },
    ];

    // is_final_turn: if we've already gone through clarifying questions (>=1 clarifying turn)
    const isFinalTurn = clarifyingCount >= 1;

    try {
      // Use the authenticated user's JWT. The edge function calls getUser(jwt)
      // to verify identity — the anon key is NOT a valid user token.
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) {
        throw new Error("Session expired. Please sign in again.");
      }
      const accessToken = authSession.access_token;

      // ── Emergency Gatekeeper ───────────────────────────────────────────────
      // If the message contains emergency keywords, verify the user has a
      // complete pet profile before routing to the expensive Tier 3 model.
      // All attempts (allowed and blocked) are logged server-side.
      if (isEmergencyQuery(text)) {
        setGateBlocked(false); // reset any previous block banner
        try {
          const gateResp = await fetch(
            `${SUPABASE_URL}/functions/v1/emergency-gate`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                pet_id: selectedPetId,
                query_text: text,
              }),
            }
          );

          if (gateResp.ok) {
            const gateData = await gateResp.json();
            if (!gateData.allowed) {
              setGateNearestVetUrl(
                gateData.nearest_vet_url ??
                  "https://maps.google.com/maps?q=emergency+vet+near+me"
              );
              setGateBlocked(true);
              setLoading(false);
              return;
            }
          }
          // If the gatekeeper call itself fails (network error, 5xx), fall
          // through and allow the triage call — do not block on infra issues.
        } catch {
          // non-blocking — gate failure should not prevent emergency triage
        }
      }

      const resp = await fetch(
        `${SUPABASE_URL}/functions/v1/triage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            pet_id: selectedPetId,
            message: text,
            session_id: sessionId,
            conversation_history: updatedHistory,
            is_final_turn: isFinalTurn,
          }),
        }
      );

      if (!resp.ok) {
        throw new Error(`Edge function error: ${resp.status}`);
      }

      const data: APIResponse = await resp.json();

      if (data.type === "clarifying") {
        const clarifData = data as ClarifyingResponse;
        const clarifMsg: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: "To give you the best assessment, I have a few quick questions:",
          timestamp: new Date(),
          isClarifying: true,
          clarifyingQuestions: clarifData.questions,
        };
        setMessages((prev) => [...prev, clarifMsg]);

        // Update conversation history with clarifying questions as assistant turn
        const questionsText = clarifData.questions
          .map((q, i) => `${i + 1}. ${q}`)
          .join("\n");
        setConversationHistory([
          ...updatedHistory,
          { role: "assistant", content: questionsText },
        ]);
        setClarifyingCount((c) => c + 1);
      } else {
        // Triage response
        const triageAPIData = data as TriageAPIResponse;
        const triageData = triageAPIData.response;
        const aiMsg: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: "",
          timestamp: new Date(),
          triageData,
        };
        setMessages((prev) => [...prev, aiMsg]);

        // Update history
        setConversationHistory([
          ...updatedHistory,
          { role: "assistant", content: triageData.assessment },
        ]);
        // Reset clarifying count for new topics
        setClarifyingCount(0);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Something went wrong";
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: `Sorry, I could not process that right now. Please try again. (${errMsg})`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loadingPets) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F8F6" }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#1B4332" />
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedPetId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F8F6" }} edges={["top"]}>
        <LinearGradient
          colors={["#1B4332", "#2D6A4F"]}
          style={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 20,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 22, marginRight: 10 }}>🩺</Text>
          <View>
            <Text
              style={{ color: "#FFFFFF", fontSize: 22, fontFamily: "Nunito_700Bold" }}
            >
              Symptom Triage
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" }}>
              AI-powered pet health guidance
            </Text>
          </View>
        </LinearGradient>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}
        >
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🐾</Text>
          <Text
            style={{
              color: "#0F1F17",
              fontSize: 18,
              fontFamily: "Nunito_700Bold",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            No pet profile found
          </Text>
          <Text
            style={{ color: "#52796F", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 }}
          >
            Set up your pet profile first to use the AI triage chat.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F8F6" }} edges={["top"]}>
      {/* Header */}
      <LinearGradient
        colors={["#1B4332", "#2D6A4F"]}
        style={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 16,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 22, marginRight: 10 }}>🩺</Text>
        <View>
          <Text
            style={{ color: "#FFFFFF", fontSize: 22, fontFamily: "Nunito_700Bold" }}
          >
            Symptom Triage
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" }}>
            AI-powered pet health guidance
          </Text>
        </View>
      </LinearGradient>

      {/* Pet Selector */}
      <PetSelector
        pets={pets}
        selectedPetId={selectedPetId}
        onSelect={handlePetChange}
      />

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Emergency Gate Blocked Banner */}
        {gateBlocked && (
          <GateBlockedBanner
            nearestVetUrl={gateNearestVetUrl}
            onDismiss={() => setGateBlocked(false)}
          />
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            userId={userId}
            petId={selectedPetId}
            shownAffiliates={shownAffiliates}
          />
        ))}

        {/* Loading indicator */}
        {loading && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
              paddingRight: 48,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#2D6A4F",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
              }}
            >
              <Text style={{ fontSize: 16 }}>🐾</Text>
            </View>
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                borderBottomLeftRadius: 4,
                paddingHorizontal: 16,
                paddingVertical: 12,
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
            >
              <ActivityIndicator size="small" color="#2D6A4F" />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 100,
          flexDirection: "row",
          alignItems: "flex-end",
        }}
      >
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Describe your pet's symptoms..."
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={500}
          style={{
            flex: 1,
            backgroundColor: "#F3F4F6",
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 10,
            fontSize: 14,
            color: "#1A1A1A",
            maxHeight: 100,
            marginRight: 8,
          }}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={loading || !inputText.trim()}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor:
              loading || !inputText.trim() ? "#D1FAE5" : "#2D6A4F",
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel="Send message"
        >
          <Text style={{ color: "#FFFFFF", fontSize: 18 }}>{"^"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

