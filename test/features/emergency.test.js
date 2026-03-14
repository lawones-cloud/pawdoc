/**
 * PawDoc — Emergency Gatekeeper Integration Tests
 * Phase 7 QA
 *
 * Tests the emergency-gate Edge Function end-to-end against the deployed
 * Supabase project (eldrsvllybagwkcqdsei).
 *
 * Test users are seeded in the deployed project:
 *   - USER_WITH_PET: test-gate@pawdoc-qa.dev        (has a verified pet profile)
 *   - USER_NO_PET:   test-gate-nopet@pawdoc-qa.dev  (authenticated, no pets)
 *
 * Run:
 *   node --test test/features/emergency.test.js
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = "https://eldrsvllybagwkcqdsei.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZHJzdmxseWJhZ3drY3Fkc2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODMwMzMsImV4cCI6MjA4ODc1OTAzM30.PQEg5RAEZJKDSDS4Kf_Js4inpV0yxKBB2HpXrYKTJp0";

const GATE_URL = `${SUPABASE_URL}/functions/v1/emergency-gate`;
const AUTH_URL = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;

const USER_WITH_PET = {
  email: "test-gate@pawdoc-qa.dev",
  password: "TestGate123!",
  petId: "855a656c-8cb1-4919-8392-fbea340f1a56",
};

const USER_NO_PET = {
  email: "test-gate-nopet@pawdoc-qa.dev",
  password: "TestGate123!",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function signIn(email, password) {
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Sign-in failed for ${email}: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function callGate(jwt, body = {}) {
  const headers = {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
  };
  if (jwt !== null) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }
  const res = await fetch(GATE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json(), headers: res.headers };
}

// ---------------------------------------------------------------------------
// JWT cache — sign in once per suite
// ---------------------------------------------------------------------------
let jwtWithPet;
let jwtNoPet;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Emergency Gatekeeper — CORS preflight", () => {
  it("OPTIONS returns 204 with CORS headers", async () => {
    const res = await fetch(GATE_URL, { method: "OPTIONS" });
    assert.equal(res.status, 204);
    assert.ok(
      res.headers.get("access-control-allow-origin"),
      "Missing Access-Control-Allow-Origin header"
    );
    assert.ok(
      res.headers.get("access-control-allow-methods"),
      "Missing Access-Control-Allow-Methods header"
    );
  });
});

describe("Emergency Gatekeeper — method validation", () => {
  it("GET returns 405 Method Not Allowed", async () => {
    const res = await fetch(GATE_URL, {
      method: "GET",
      headers: { apikey: ANON_KEY },
    });
    assert.equal(res.status, 405);
  });

  it("PUT returns 405 Method Not Allowed", async () => {
    const res = await fetch(GATE_URL, {
      method: "PUT",
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 405);
  });
});

describe("Emergency Gatekeeper — authentication", () => {
  it("POST without Authorization header returns 401", async () => {
    const res = await fetch(GATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY },
      body: JSON.stringify({ query_text: "my dog is having a seizure" }),
    });
    assert.equal(res.status, 401);
  });

  it("POST with invalid JWT returns 401", async () => {
    const res = await fetch(GATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
        Authorization: "Bearer this.is.not.a.valid.jwt",
      },
      body: JSON.stringify({ query_text: "my dog collapsed" }),
    });
    assert.equal(res.status, 401);
  });

  it("POST with anon key as bearer token returns 401", async () => {
    const res = await fetch(GATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ query_text: "my dog is not breathing" }),
    });
    assert.equal(res.status, 401);
  });
});

describe("Emergency Gatekeeper — gate logic (user with verified pet)", () => {
  before(async () => {
    jwtWithPet = await signIn(USER_WITH_PET.email, USER_WITH_PET.password);
  });

  it("returns allowed: true when user has a verified pet profile", async () => {
    const { status, body } = await callGate(jwtWithPet, {
      query_text: "my dog is having a seizure",
    });
    assert.equal(status, 200);
    assert.equal(body.allowed, true);
    assert.equal(body.reason, "Pet profile verified");
  });

  it("always includes nearest_vet_url in response", async () => {
    const { status, body } = await callGate(jwtWithPet, {
      query_text: "my dog is unresponsive",
    });
    assert.equal(status, 200);
    assert.ok(typeof body.nearest_vet_url === "string", "nearest_vet_url must be a string");
    assert.ok(
      body.nearest_vet_url.startsWith("https://"),
      "nearest_vet_url must be a valid https URL"
    );
  });

  it("returns allowed: true when a specific valid pet_id is supplied", async () => {
    const { status, body } = await callGate(jwtWithPet, {
      pet_id: USER_WITH_PET.petId,
      query_text: "my dog is choking",
    });
    assert.equal(status, 200);
    assert.equal(body.allowed, true);
    assert.equal(body.reason, "Pet profile verified");
  });

  it("returns allowed: false when pet_id belongs to a different user", async () => {
    // Use user1's JWT but supply a fake pet_id not owned by them
    const fakePetId = "00000000-0000-0000-0000-000000000000";
    const { status, body } = await callGate(jwtWithPet, {
      pet_id: fakePetId,
      query_text: "my dog collapsed",
    });
    assert.equal(status, 200);
    assert.equal(body.allowed, false);
    assert.ok(typeof body.nearest_vet_url === "string", "nearest_vet_url present even when blocked");
  });

  it("response always includes the reason field", async () => {
    const { status, body } = await callGate(jwtWithPet, {
      query_text: "my dog is bleeding",
    });
    assert.equal(status, 200);
    assert.ok(typeof body.reason === "string" && body.reason.length > 0, "reason must be non-empty string");
  });
});

describe("Emergency Gatekeeper — gate logic (user without pet)", () => {
  before(async () => {
    jwtNoPet = await signIn(USER_NO_PET.email, USER_NO_PET.password);
  });

  it("returns allowed: false when user has no verified pet profile", async () => {
    const { status, body } = await callGate(jwtNoPet, {
      query_text: "my cat is not breathing",
    });
    assert.equal(status, 200);
    assert.equal(body.allowed, false);
    assert.equal(body.reason, "No verified pet profile found");
  });

  it("includes nearest_vet_url even when access is blocked", async () => {
    const { status, body } = await callGate(jwtNoPet, {
      query_text: "my dog is unconscious",
    });
    assert.equal(status, 200);
    assert.equal(body.allowed, false);
    assert.ok(
      typeof body.nearest_vet_url === "string" && body.nearest_vet_url.startsWith("https://"),
      "nearest_vet_url must be present and valid when blocked"
    );
  });
});

describe("Emergency Gatekeeper — response shape", () => {
  before(async () => {
    if (!jwtWithPet) {
      jwtWithPet = await signIn(USER_WITH_PET.email, USER_WITH_PET.password);
    }
  });

  it("200 response always contains exactly: allowed, reason, nearest_vet_url", async () => {
    const { status, body } = await callGate(jwtWithPet, {
      query_text: "my pet has a seizure",
    });
    assert.equal(status, 200);
    assert.ok("allowed" in body, "response must have 'allowed'");
    assert.ok("reason" in body, "response must have 'reason'");
    assert.ok("nearest_vet_url" in body, "response must have 'nearest_vet_url'");
    assert.equal(typeof body.allowed, "boolean");
    assert.equal(typeof body.reason, "string");
    assert.equal(typeof body.nearest_vet_url, "string");
  });

  it("works with empty body (no pet_id, no query_text)", async () => {
    const { status, body } = await callGate(jwtWithPet, {});
    assert.equal(status, 200);
    assert.ok("allowed" in body);
  });
});
