# Emergency Gatekeeper — Feature Spec

## Overview

The Emergency Gatekeeper is a server-side gate that runs **before** routing any emergency-keyword message to the expensive Tier 3 (Claude Opus) AI model. It verifies the user has a complete pet profile, logs every attempt, and redirects blocked callers to the nearest emergency vet.

## Architecture

```
User sends emergency message
        │
        ▼
[chat.tsx] keyword pre-scan (EMERGENCY_KEYWORDS)
        │  match
        ▼
[emergency-gate Edge Function]
        │
        ├── allowed: true  → route to [triage Edge Function] → Tier 3 (Opus)
        │
        └── allowed: false → show GateBlockedBanner + nearest_vet_url
```

## Edge Function: `supabase/functions/emergency-gate`

**Endpoint:** `POST /functions/v1/emergency-gate`

**Auth:** Caller must supply a valid user JWT (`Authorization: Bearer <jwt>`). The function verifies via `supabase.auth.getUser(jwt)` — gateway-level JWT verification is disabled (`--no-verify-jwt`).

### Request Body

```json
{
  "pet_id": "uuid (optional) — verify a specific pet",
  "query_text": "string (optional) — the user's emergency message, logged"
}
```

### Response

```json
{
  "allowed": true | false,
  "reason": "Pet profile verified" | "No verified pet profile found",
  "nearest_vet_url": "https://maps.google.com/maps?q=emergency+vet+near+me"
}
```

`nearest_vet_url` is **always present** regardless of `allowed` value so clients can show it in both the blocked banner and the allowed emergency UI.

### Gate Logic

A caller is **allowed** when they have a pet profile row in the `pets` table where:
- `user_id` matches the authenticated user's ID
- `name` is not null
- `species` is not null

If `pet_id` is supplied in the request body, only that specific pet is checked (must also belong to the authenticated user). If no `pet_id` is supplied, any verified pet owned by the user grants access.

### Logging

Every call (allowed and blocked) is logged to `emergency_gate_logs` as a fire-and-forget insert:

```
emergency_gate_logs
  user_id     uuid
  pet_id      uuid | null
  query_text  text | null
  allowed     boolean
  reason      text
  created_at  timestamptz (default now())
```

Log failures do not block the gate response.

### Error codes

| Status | Condition |
|--------|-----------|
| 204    | OPTIONS preflight |
| 401    | Missing or invalid JWT |
| 405    | Non-POST method |
| 500    | Unhandled server error |

## Frontend Integration: `app/(tabs)/chat.tsx`

Before calling the triage Edge Function, `chat.tsx`:

1. Runs `isEmergencyQuery(text)` — mirrors the `EMERGENCY_KEYWORDS` list in the triage function
2. If a keyword matches, calls `emergency-gate` with the user's JWT and `pet_id`
3. If `allowed: false`, sets `gateBlocked = true` and renders `<GateBlockedBanner>` pointing to `nearest_vet_url`
4. If `allowed: true`, or if the gate call fails (network/infra error), proceeds to the triage call

Gate failures are non-blocking — a dead gate never prevents a user from getting emergency triage.

## Tests

```
test/features/emergency.test.js
```

Run with:

```bash
node --test test/features/emergency.test.js
```

Integration tests cover CORS preflight, method validation, auth rejection, allow/block gate logic, and response shape. Requires network access to the deployed Supabase project.

## Deploy

```bash
npx supabase functions deploy emergency-gate \
  --project-ref eldrsvllybagwkcqdsei \
  --no-verify-jwt
```
