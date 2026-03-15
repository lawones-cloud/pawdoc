# PawDoc Build Log

## 2026-03-15 — Phase 7 QA: Emergency Gate Schema

**Task:** Complete JSON schema for emergency gatekeeper validation
**File:** `src/features/emergency/emergency-gate.schema.json`

### What was done

Created `emergency-gate.schema.json` (JSON Schema draft-07) covering all three payload shapes used by the `emergency-gate` Edge Function:

| Definition | Description |
|---|---|
| `RequestBody` | Optional `pet_id` (UUID) and `query_text` — `additionalProperties: false` |
| `SuccessResponse` | HTTP 200 — exactly `allowed` (boolean), `reason` (enum string), `nearest_vet_url` (https:// string) — `additionalProperties: false` |
| `ErrorResponse` | HTTP 401/405/500 — exactly `error` (string) |

### Acceptance criteria coverage

| Test | Schema field(s) validated |
|---|---|
| 200 response contains exactly: allowed, reason, nearest_vet_url | `SuccessResponse.required` + `additionalProperties: false` |
| `allowed` is boolean | `SuccessResponse.properties.allowed.type: boolean` |
| `reason` is non-empty string | `SuccessResponse.properties.reason.minLength: 1` |
| `reason` values match gate logic | `SuccessResponse.properties.reason.enum` |
| `nearest_vet_url` is https:// string | `SuccessResponse.properties.nearest_vet_url.pattern: ^https://` |
| nearest_vet_url present when blocked | same field in required[] — always present |
| Error responses have `error` field | `ErrorResponse.required: [error]` |

**Status:** complete
**Edge Functions modified:** none (schema is documentation/validation artifact only)
