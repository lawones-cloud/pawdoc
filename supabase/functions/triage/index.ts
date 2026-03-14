/**
 * PawDoc — AI Symptom Triage Edge Function
 * PRD Section 9: AI Triage Architecture
 *
 * Receives: { pet_id, message, session_id, conversation_history? }
 * - Keyword pre-scan selects model tier (Haiku / Sonnet / Opus)
 * - Fetches pet profile from Supabase
 * - Builds system prompt with pet profile injected
 * - Calls OpenRouter with selected model
 * - Runs affiliate lookup (except Tier 3 emergency)
 * - Inserts row to health_logs (terminal triage turns only)
 * - Returns full Unified AI Response Envelope to client
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TriageRequest {
  pet_id: string;
  message: string;
  session_id: string;
  conversation_history?: ChatMessage[];
  is_final_turn?: boolean; // true when the user has answered all 3 clarifying questions
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface PetProfile {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  dob: string | null;
  weight: number | null;
  allergies: string[] | null;
  conditions: string[] | null;
}

interface AffiliateMapRow {
  affiliate_name: string;
  affiliate_url: string;
  commission_type: string;
}

interface AffiliateCTA {
  affiliate_name: string;
  affiliate_url: string;
  commission_type: string;
}

interface UnifiedTriageResponse {
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISCLAIMER =
  "PawDoc provides guidance, not diagnosis. Always consult a licensed veterinarian for medical decisions.";

const EMERGENCY_KEYWORDS = [
  "emergency",
  "seizure",
  "poison",
  "poisoning",
  "unresponsive",
  "bleeding",
  "choking",
  "cant breathe",
  "cannot breathe",
  "not breathing",
  "collapsed",
  "unconscious",
];

const MODERATE_KEYWORDS = [
  "pain",
  "not eating",
  "lethargy",
  "lethargic",
  "vomiting",
  "limping",
];

const MODELS = {
  tier1: "anthropic/claude-3.5-haiku",
  tier2: "anthropic/claude-sonnet-4.5",
  tier3: "anthropic/claude-opus-4",
} as const;

type RoutingTier = 1 | 2 | 3;

// ---------------------------------------------------------------------------
// Keyword pre-scan
// ---------------------------------------------------------------------------

function selectTier(message: string): RoutingTier {
  const lower = message.toLowerCase();
  if (EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw))) return 3;
  if (MODERATE_KEYWORDS.some((kw) => lower.includes(kw))) return 2;
  return 1;
}

function selectModel(tier: RoutingTier): string {
  if (tier === 3) return MODELS.tier3;
  if (tier === 2) return MODELS.tier2;
  return MODELS.tier1;
}

// ---------------------------------------------------------------------------
// Approximate age from dob
// ---------------------------------------------------------------------------

function approximateAge(dob: string | null): string {
  if (!dob) return "unknown";
  const birth = new Date(dob);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  return `${years} year${years !== 1 ? "s" : ""}`;
}

// ---------------------------------------------------------------------------
// System prompt builders — one per tier
// ---------------------------------------------------------------------------

function buildSystemPromptTier1(pet: PetProfile): string {
  const age = approximateAge(pet.dob);
  const conditions = pet.conditions?.join(", ") || "none";
  const allergies = pet.allergies?.join(", ") || "none";
  return `You are PawDoc, a friendly AI pet health assistant. You provide guidance, not diagnosis.
Pet Profile: Name: ${pet.name}, Species: ${pet.species}, Breed: ${pet.breed || "unknown"}, Age: ${age}, Conditions: ${conditions}, Allergies: ${allergies}.

First, ask exactly 3 clarifying questions about: (1) duration of symptoms, (2) severity (ask user to rate 1-10), and (3) recent changes in behavior or appetite.
After the user has answered all clarifying questions, provide a triage assessment.

You MUST respond with a valid JSON object conforming exactly to this schema:
{
  "severity": <integer 1-4>,
  "topic_keyword": <one of: "fresh_food", "auto_ship", "insurance", "telemedicine", "joint_pain", "supplements", "pharmacy", "subscription_box", "gear", or null>,
  "assessment": "<concise summary>",
  "likely_causes": ["<cause 1>", "<cause 2>"],
  "home_care": ["<step 1>", "<step 2>"],
  "vet_urgency": "<monitor or see_vet_soon>",
  "emergency_steps": null,
  "disclaimer": "${DISCLAIMER}",
  "affiliate_cta": null
}

If you are asking clarifying questions (not yet providing the final assessment), respond ONLY with a JSON object in this format:
{
  "clarifying": true,
  "questions": ["<question 1>", "<question 2>", "<question 3>"]
}`;
}

function buildSystemPromptTier2(pet: PetProfile): string {
  const age = approximateAge(pet.dob);
  const conditions = pet.conditions?.join(", ") || "none";
  const allergies = pet.allergies?.join(", ") || "none";
  return `You are PawDoc, a veterinary expert. You provide guidance, not diagnosis.
Pet Profile: Name: ${pet.name}, Species: ${pet.species}, Breed: ${pet.breed || "unknown"}, Age: ${age}, Conditions: ${conditions}, Allergies: ${allergies}.

The query suggests moderate concern. Ask exactly 3 clarifying questions about: (1) duration, (2) severity (ask user to rate 1-10), and (3) whether symptoms are worsening.
After the user has answered all clarifying questions, provide a detailed assessment emphasizing the "When to see a vet" section.

You MUST respond with a valid JSON object conforming exactly to this schema:
{
  "severity": <integer 5-7>,
  "topic_keyword": <one of: "fresh_food", "auto_ship", "insurance", "telemedicine", "joint_pain", "supplements", "pharmacy", "subscription_box", "gear", or null>,
  "assessment": "<detailed summary>",
  "likely_causes": ["<cause 1>", "<cause 2>", "<cause 3>"],
  "home_care": ["<step 1>", "<step 2>"],
  "vet_urgency": "<see_vet_soon or urgent>",
  "emergency_steps": null,
  "disclaimer": "${DISCLAIMER}",
  "affiliate_cta": null
}

If you are asking clarifying questions (not yet providing the final assessment), respond ONLY with a JSON object in this format:
{
  "clarifying": true,
  "questions": ["<question 1>", "<question 2>", "<question 3>"]
}

Prioritize telemedicine or insurance topic_keyword for this tier.`;
}

function buildSystemPromptTier3(pet: PetProfile): string {
  return `You are PawDoc. CRITICAL PRIORITY. This query indicates a potential life-threatening emergency.
Pet Profile: Name: ${pet.name}, Species: ${pet.species}, Breed: ${pet.breed || "unknown"}.

Do NOT ask clarifying questions. Provide immediate first aid steps and STRONGLY URGE the user to go to an emergency vet immediately.

You MUST respond with a valid JSON object conforming exactly to this schema:
{
  "severity": <integer 8-10>,
  "topic_keyword": null,
  "assessment": "<brief critical summary>",
  "likely_causes": ["<most likely cause>"],
  "home_care": null,
  "vet_urgency": "emergency",
  "emergency_steps": ["<immediate step 1>", "<immediate step 2>", "<immediate step 3>"],
  "disclaimer": "${DISCLAIMER}",
  "affiliate_cta": null
}`;
}

// ---------------------------------------------------------------------------
// OpenRouter call
// ---------------------------------------------------------------------------

async function callOpenRouter(
  systemPrompt: string,
  messages: ChatMessage[],
  model: string,
  apiKey: string
): Promise<string> {
  const payload = {
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    max_tokens: 1500,
    temperature: 0.3,
  };

  // 9-second timeout — Supabase free tier kills functions at 10s.
  // Abort early so the function can return a proper error with CORS headers.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  let resp: Response;
  try {
    resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://pawdoc.ai",
        "X-Title": "PawDoc",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenRouter error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ---------------------------------------------------------------------------
// Parse AI JSON response
// ---------------------------------------------------------------------------

function parseAIResponse(raw: string): Record<string, unknown> {
  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleaned);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Top-level catch — ensures CORS headers are always present even on crash.
  try {
    return await handleRequest(req);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[triage] unhandled exception:", msg);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: msg }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !OPENROUTER_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing environment configuration" }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }

  // -------------------------------------------------------------------------
  // 0. Authenticate caller — extract JWT and resolve user ID
  // -------------------------------------------------------------------------
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
  const jwt = authHeader.replace("Bearer ", "").trim();

  // Use an anon-scoped client to verify the JWT
  const supabaseAuth = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser(jwt);

  if (authError || !authUser) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  const userId = authUser.id;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let body: TriageRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  const { pet_id, message, session_id, conversation_history = [], is_final_turn = false } = body;

  if (!pet_id || !message || !session_id) {
    return new Response(
      JSON.stringify({ error: "pet_id, message, and session_id are required" }),
      { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }

  // -------------------------------------------------------------------------
  // 0b. Verify pet ownership — pet must belong to the authenticated user
  // -------------------------------------------------------------------------
  const { data: ownedPet, error: ownershipError } = await supabase
    .from("pets")
    .select("id")
    .eq("id", pet_id)
    .eq("user_id", userId)
    .single();

  if (ownershipError || !ownedPet) {
    return new Response(JSON.stringify({ error: "Pet not found or access denied" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  // -------------------------------------------------------------------------
  // 1. Fetch pet profile
  // -------------------------------------------------------------------------
  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, name, species, breed, dob, weight, allergies, conditions")
    .eq("id", pet_id)
    .single();

  if (petError || !pet) {
    return new Response(
      JSON.stringify({ error: "Pet not found", detail: petError?.message }),
      { status: 404, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }

  // -------------------------------------------------------------------------
  // 2. Keyword pre-scan → select tier + model
  // -------------------------------------------------------------------------
  const tier: RoutingTier = selectTier(message);
  const model = selectModel(tier);

  // -------------------------------------------------------------------------
  // 3. Build system prompt
  // -------------------------------------------------------------------------
  let systemPrompt: string;
  if (tier === 3) {
    systemPrompt = buildSystemPromptTier3(pet as PetProfile);
  } else if (tier === 2) {
    systemPrompt = buildSystemPromptTier2(pet as PetProfile);
  } else {
    systemPrompt = buildSystemPromptTier1(pet as PetProfile);
  }

  // -------------------------------------------------------------------------
  // 4. Build messages array (conversation history + current message)
  // -------------------------------------------------------------------------
  const messages: ChatMessage[] = [
    ...conversation_history,
    { role: "user", content: message },
  ];

  // -------------------------------------------------------------------------
  // 5. Call OpenRouter
  // -------------------------------------------------------------------------
  let rawAI: string;
  try {
    rawAI = await callOpenRouter(systemPrompt, messages, model, OPENROUTER_KEY);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "AI call failed", detail: msg }),
      { status: 502, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }

  // -------------------------------------------------------------------------
  // 6. Parse AI response
  // -------------------------------------------------------------------------
  let parsed: Record<string, unknown>;
  try {
    parsed = parseAIResponse(rawAI);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "Failed to parse AI response", detail: msg, raw: rawAI }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }

  // -------------------------------------------------------------------------
  // 7. If clarifying questions turn — return early (no DB write)
  // -------------------------------------------------------------------------
  if (parsed.clarifying === true) {
    return new Response(
      JSON.stringify({
        type: "clarifying",
        questions: parsed.questions,
        tier,
        model,
      }),
      {
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      }
    );
  }

  // -------------------------------------------------------------------------
  // 8. Affiliate lookup (skip for Tier 3 / emergency)
  // -------------------------------------------------------------------------
  let affiliateCTA: AffiliateCTA | null = null;

  if (tier !== 3 && parsed.topic_keyword && typeof parsed.topic_keyword === "string") {
    const { data: affiliateRow } = await supabase
      .from("affiliate_map")
      .select("affiliate_name, affiliate_url, commission_type")
      .eq("topic_keyword", parsed.topic_keyword)
      .eq("is_active", true)
      .order("priority_rank", { ascending: false })
      .limit(1)
      .single();

    if (affiliateRow) {
      affiliateCTA = {
        affiliate_name: (affiliateRow as AffiliateMapRow).affiliate_name,
        affiliate_url: (affiliateRow as AffiliateMapRow).affiliate_url,
        commission_type: (affiliateRow as AffiliateMapRow).commission_type,
      };
    }
  }

  // -------------------------------------------------------------------------
  // 9. Build final Unified AI Response Envelope
  // -------------------------------------------------------------------------
  const triageResponse: UnifiedTriageResponse = {
    severity: (parsed.severity as number) ?? 1,
    topic_keyword: (parsed.topic_keyword as string | null) ?? null,
    assessment: (parsed.assessment as string) ?? "",
    likely_causes: (parsed.likely_causes as string[]) ?? [],
    home_care: (parsed.home_care as string[] | null) ?? null,
    vet_urgency: (parsed.vet_urgency as string) ?? "monitor",
    emergency_steps: (parsed.emergency_steps as string[] | null) ?? null,
    disclaimer: DISCLAIMER,
    affiliate_cta: affiliateCTA,
  };

  // -------------------------------------------------------------------------
  // 10. Insert to health_logs (terminal triage turns only — when is_final_turn)
  // -------------------------------------------------------------------------
  if (is_final_turn || tier === 3) {
    await supabase.from("health_logs").insert({
      pet_id,
      type: "triage",
      summary: message,
      ai_response: triageResponse,
      severity_score: triageResponse.severity,
    });
  }

  // -------------------------------------------------------------------------
  // 11. Return response
  // -------------------------------------------------------------------------
  return new Response(
    JSON.stringify({
      type: "triage",
      tier,
      model,
      session_id,
      response: triageResponse,
    }),
    {
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    }
  );
}
