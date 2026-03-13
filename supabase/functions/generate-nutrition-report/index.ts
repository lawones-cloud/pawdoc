/**
 * PawDoc — Generate Nutrition Report Edge Function
 * Feature 4: AI Nutrition Advisor
 *
 * POST { pet_id }
 * - Fetches pet profile (breed, species, age, weight, allergies, conditions)
 * - Calls OpenRouter claude-sonnet-4-6 with veterinary nutritionist system prompt
 * - Structured JSON output: diet_type, daily_calories, meal_frequency,
 *   recommended_foods, foods_to_avoid, supplements, hydration_notes,
 *   weight_management, special_notes
 * - Queries affiliate_map for topic_keywords: nutrition, supplements, pet_food
 * - Upserts to nutrition_reports (pet_id, report_json, recommended_affiliates JSONB)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NutritionRequest {
  pet_id: string;
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

interface FoodItem {
  name: string;
  reason: string;
}

interface Supplement {
  name: string;
  reason: string;
  affiliate_product: string | null;
}

interface NutritionReport {
  diet_type: string;
  daily_calories: number;
  meal_frequency: string;
  recommended_foods: FoodItem[];
  foods_to_avoid: FoodItem[];
  supplements: Supplement[];
  hydration_notes: string;
  weight_management: string;
  special_notes: string;
}

interface AffiliateRow {
  affiliate_name: string;
  affiliate_url: string;
  commission_type: string;
  topic_keyword: string;
}

interface RecommendedAffiliate {
  affiliate_name: string;
  affiliate_url: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function approximateAge(dob: string | null): string {
  if (!dob) return "unknown";
  const birth = new Date(dob);
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""}`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? "s" : ""}`;
}

function buildSystemPrompt(pet: PetProfile): string {
  const age = approximateAge(pet.dob);
  const weight = pet.weight ? `${pet.weight} kg` : "unknown";
  const conditions = pet.conditions?.length
    ? pet.conditions.join(", ")
    : "none";
  const allergies = pet.allergies?.length
    ? pet.allergies.join(", ")
    : "none";

  return `You are PawDoc's Nutrition Advisor, an expert in veterinary dietary science with 20+ years of experience. You provide evidence-based dietary guidance tailored to individual pet profiles. You do not diagnose medical conditions; you provide nutritional guidance only.

Pet Profile:
- Name: ${pet.name}
- Species: ${pet.species}
- Breed: ${pet.breed ?? "unknown"}
- Age: ${age}
- Weight: ${weight}
- Current Conditions: ${conditions}
- Known Allergies/Intolerances: ${allergies}

Generate a comprehensive, personalised nutrition report for this pet. Consider breed-specific needs, life stage (puppy/kitten/adult/senior), weight status, and any health conditions or allergies.

You MUST respond with a valid JSON object conforming EXACTLY to this schema (no markdown, no extra fields):
{
  "diet_type": "<e.g. 'High-protein kibble with fresh food toppers' or 'Raw diet' or 'Prescription diet'>",
  "daily_calories": <integer — estimated kcal/day>,
  "meal_frequency": "<e.g. 'Twice daily' or 'Three times daily for puppies'>",
  "recommended_foods": [
    { "name": "<food name>", "reason": "<why it benefits this pet>" },
    { "name": "<food name>", "reason": "<why it benefits this pet>" },
    { "name": "<food name>", "reason": "<why it benefits this pet>" }
  ],
  "foods_to_avoid": [
    { "name": "<food or ingredient>", "reason": "<why it is harmful or unsuitable>" },
    { "name": "<food or ingredient>", "reason": "<why it is harmful or unsuitable>" }
  ],
  "supplements": [
    { "name": "<supplement name>", "reason": "<benefit for this pet>", "affiliate_product": "<specific product name or null>" },
    { "name": "<supplement name>", "reason": "<benefit for this pet>", "affiliate_product": "<specific product name or null>" }
  ],
  "hydration_notes": "<personalised hydration guidance>",
  "weight_management": "<weight goal and feeding strategy — 'maintain', 'reduce', or 'increase' with specific tips>",
  "special_notes": "<any breed-specific, condition-specific, or allergy-specific dietary notes — ingredient watchlist items if applicable>"
}`;
}

async function callOpenRouter(
  systemPrompt: string,
  petName: string,
  apiKey: string
): Promise<string> {
  const payload = {
    model: "anthropic/claude-sonnet-4-5",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Please generate the nutrition report for ${petName} now.`,
      },
    ],
    max_tokens: 2000,
    temperature: 0.2,
  };

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
        "X-Title": "PawDoc Nutrition Advisor",
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

function parseReport(raw: string): NutritionReport {
  const cleaned = raw
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleaned) as NutritionReport;
}

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
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
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      }
    );
  }

  // ── Authenticate caller — extract JWT and resolve user ID ───────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
  const jwt = authHeader.replace("Bearer ", "").trim();

  const supabaseAuth = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser(jwt);

  if (authError || !authUser) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  const userId = authUser.id;

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ── Parse body ─────────────────────────────────────────────────────────
  let body: NutritionRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  const { pet_id } = body;

  if (!pet_id) {
    return new Response(
      JSON.stringify({ error: "pet_id is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      }
    );
  }

  // ── Verify pet ownership — pet must belong to the authenticated user ────
  const { data: ownedPet, error: ownershipError } = await db
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

  // ── 1. Fetch pet profile ───────────────────────────────────────────────
  const { data: pet, error: petError } = await db
    .from("pets")
    .select("id, name, species, breed, dob, weight, allergies, conditions")
    .eq("id", pet_id)
    .single();

  if (petError || !pet) {
    return new Response(
      JSON.stringify({ error: "Pet not found", detail: petError?.message }),
      {
        status: 404,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      }
    );
  }

  const petProfile = pet as PetProfile;

  // ── 2. Build system prompt ─────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(petProfile);

  // ── 3. Call OpenRouter ─────────────────────────────────────────────────
  let rawAI: string;
  try {
    rawAI = await callOpenRouter(systemPrompt, petProfile.name, OPENROUTER_KEY);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "AI call failed", detail: msg }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      }
    );
  }

  // ── 4. Parse AI response ───────────────────────────────────────────────
  let report: NutritionReport;
  try {
    report = parseReport(rawAI);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({
        error: "Failed to parse AI response",
        detail: msg,
        raw: rawAI,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      }
    );
  }

  // ── 5. Query affiliate_map for nutrition/supplements/pet_food ─────────
  const NUTRITION_KEYWORDS = ["nutrition", "supplements", "pet_food"];
  let recommendedAffiliates: RecommendedAffiliate[] = [];

  try {
    const { data: affiliateRows } = await db
      .from("affiliate_map")
      .select("affiliate_name, affiliate_url, commission_type, topic_keyword")
      .in("topic_keyword", NUTRITION_KEYWORDS)
      .eq("is_active", true)
      .order("priority_rank", { ascending: false })
      .limit(3);

    if (affiliateRows && affiliateRows.length > 0) {
      recommendedAffiliates = (affiliateRows as AffiliateRow[]).map((row) => ({
        affiliate_name: row.affiliate_name,
        affiliate_url: row.affiliate_url,
        reason: `Top-rated ${row.topic_keyword.replace("_", " ")} partner for ${petProfile.species}s`,
      }));
    }
  } catch {
    // Non-blocking — continue without affiliates
  }

  // ── 6. Upsert to nutrition_reports ────────────────────────────────────
  const { error: upsertError } = await db
    .from("nutrition_reports")
    .upsert(
      {
        pet_id,
        report_json: report,
        recommended_affiliates: recommendedAffiliates,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "pet_id" }
    );

  if (upsertError) {
    return new Response(
      JSON.stringify({ error: "Failed to save report", detail: upsertError.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      }
    );
  }

  // ── 7. Return report ───────────────────────────────────────────────────
  return new Response(
    JSON.stringify({
      success: true,
      pet_id,
      report,
      recommended_affiliates: recommendedAffiliates,
    }),
    {
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    }
  );
});
