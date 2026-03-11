/**
 * OpenRouter API helper with model routing logic.
 *
 * Routing tiers (per PRD Section 13):
 *  Tier 1 — Haiku 3.5   : default (severity 1-4, no emergency keywords)
 *  Tier 2 — Sonnet 4.5  : severity 5-7
 *  Tier 3 — Opus 4      : severity >= 8 OR emergency keywords detected
 *
 * NOTE: The OpenRouter API key is never exposed to the client.
 * All AI calls are proxied through Supabase Edge Functions in production.
 * This module is a thin helper used by the Edge Function runtime (Deno).
 */

const EMERGENCY_KEYWORDS = [
  "seizure",
  "poison",
  "poisoning",
  "unresponsive",
  "collapse",
  "collapsed",
  "not breathing",
  "unconscious",
];

const MODELS = {
  tier1: "anthropic/claude-haiku-3-5",
  tier2: "anthropic/claude-sonnet-4-5",
  tier3: "anthropic/claude-opus-4",
} as const;

export type RoutingTier = 1 | 2 | 3;

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterOptions {
  severity?: number;
  userMessage?: string;
  maxTokens?: number;
}

export function selectModel(options: OpenRouterOptions): {
  model: string;
  tier: RoutingTier;
} {
  const { severity = 0, userMessage = "" } = options;
  const lowerMsg = userMessage.toLowerCase();

  const hasEmergencyKeyword = EMERGENCY_KEYWORDS.some((kw) =>
    lowerMsg.includes(kw)
  );

  if (severity >= 8 || hasEmergencyKeyword) {
    return { model: MODELS.tier3, tier: 3 };
  }

  if (severity >= 5) {
    return { model: MODELS.tier2, tier: 2 };
  }

  return { model: MODELS.tier1, tier: 1 };
}

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: OpenRouterOptions & { apiKey: string }
): Promise<{ content: string; model: string; tier: RoutingTier }> {
  const { apiKey, maxTokens = 1024, ...routingOptions } = options;
  const { model, tier } = selectModel(routingOptions);

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://pawdoc.ai",
        "X-Title": "PawDoc",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  return { content, model, tier };
}
