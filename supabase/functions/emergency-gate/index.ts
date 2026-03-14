/**
 * PawDoc — Emergency Gatekeeper Edge Function
 *
 * Called by the triage chat BEFORE routing to the Tier 3 (Opus) model when
 * emergency keywords are detected in the user's message.
 *
 * Responsibilities:
 * 1. Authenticate the caller via JWT → getUser()
 * 2. Verify the user has a pet profile with name + species populated ("verified")
 * 3. Log every attempt (allowed or blocked) to emergency_gate_logs
 * 4. Return { allowed, reason, nearest_vet_url } to the client
 *
 * Blocked callers (no verified pet profile) are directed to the nearest
 * emergency vet via the Google Maps universal URL instead of the AI endpoint.
 *
 * DEPLOY: supabase functions deploy emergency-gate --no-verify-jwt
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const NEAREST_VET_URL = "https://maps.google.com/maps?q=emergency+vet+near+me";

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { pet_id, query_text } = body as {
      pet_id?: string;
      query_text?: string;
    };

    // ── Verify pet profile ────────────────────────────────────────────────────
    // A "verified" pet profile has both name and species populated and belongs
    // to the authenticated user.
    let allowed = false;
    let reason = "No verified pet profile found";
    let verifiedPetId: string | null = null;

    if (pet_id) {
      // Verify the specific pet supplied by the caller
      const { data: pet, error: petError } = await supabase
        .from("pets")
        .select("id, name, species")
        .eq("id", pet_id)
        .eq("user_id", user.id)
        .not("name", "is", null)
        .not("species", "is", null)
        .maybeSingle();

      if (!petError && pet && pet.name && pet.species) {
        allowed = true;
        reason = "Pet profile verified";
        verifiedPetId = pet.id as string;
      }
    } else {
      // No specific pet — check whether the user owns any verified pet at all
      const { data: pets, error: petsError } = await supabase
        .from("pets")
        .select("id, name, species")
        .eq("user_id", user.id)
        .not("name", "is", null)
        .not("species", "is", null)
        .limit(1);

      if (!petsError && pets && pets.length > 0) {
        allowed = true;
        reason = "Pet profile verified";
        verifiedPetId = pets[0].id as string;
      }
    }

    // ── Log attempt ───────────────────────────────────────────────────────────
    // Fire-and-forget — do not let a log failure block the gate response.
    supabase
      .from("emergency_gate_logs")
      .insert({
        user_id: user.id,
        pet_id: verifiedPetId ?? pet_id ?? null,
        query_text: query_text ?? null,
        allowed,
        reason,
      })
      .then(({ error: logError }) => {
        if (logError) {
          console.error("emergency-gate: failed to write log:", logError.message);
        }
      });

    // ── Respond ───────────────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        allowed,
        reason,
        nearest_vet_url: NEAREST_VET_URL,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("emergency-gate unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
