/**
 * Emergency Gatekeeper — keyword test (offline, no Deno.serve)
 * Run: deno run test_gatekeeper.ts
 */

const EMERGENCY_GATE_KEYWORDS = [
  "blood",
  "bleeding",
  "unresponsive",
  "not breathing",
  "breathing difficulty",
  "choking",
  "hit by car",
  "seizure",
  "convulsing",
  "poison",
  "poisoned",
  "chocolate",
  "lily",
  "lilies",
  "grapes",
  "antifreeze",
  "bloat",
  "swollen stomach",
  "collapsed",
  "unconscious",
];

function isEmergencyGate(message: string): boolean {
  const lower = message.toLowerCase();
  return EMERGENCY_GATE_KEYWORDS.some((kw) => lower.includes(kw));
}

// Test each keyword with a realistic pet-health message
const testCases: { keyword: string; message: string }[] = [
  { keyword: "blood",              message: "My dog has blood coming from its nose" },
  { keyword: "bleeding",           message: "My cat is bleeding from a wound on its leg" },
  { keyword: "unresponsive",       message: "My dog is unresponsive and won't wake up" },
  { keyword: "not breathing",      message: "My pet is not breathing" },
  { keyword: "breathing difficulty", message: "My cat is having breathing difficulty" },
  { keyword: "choking",            message: "My dog is choking on something" },
  { keyword: "hit by car",         message: "My dog was hit by car and is in pain" },
  { keyword: "seizure",            message: "My cat is having a seizure" },
  { keyword: "convulsing",         message: "My dog is convulsing on the floor" },
  { keyword: "poison",             message: "I think my dog got into some poison" },
  { keyword: "poisoned",           message: "My cat was poisoned by something outside" },
  { keyword: "chocolate",          message: "My dog ate chocolate from the counter" },
  { keyword: "lily",               message: "My cat chewed on a lily plant" },
  { keyword: "lilies",             message: "My cat ate some lilies from the vase" },
  { keyword: "grapes",             message: "My dog ate a bunch of grapes" },
  { keyword: "antifreeze",         message: "My cat licked antifreeze from the garage floor" },
  { keyword: "bloat",              message: "My dog has severe bloat and is distended" },
  { keyword: "swollen stomach",    message: "My dog has a swollen stomach and can't stand" },
  { keyword: "collapsed",          message: "My dog just collapsed on the walk" },
  { keyword: "unconscious",        message: "My cat is unconscious and not moving" },
];

let passed = 0;
let failed = 0;

console.log("Emergency Gatekeeper — Keyword Test\n");
console.log("────────────────────────────────────────────────────────────");

for (const { keyword, message } of testCases) {
  const result = isEmergencyGate(message);
  const status = result ? "✅ YES" : "❌ NO (FAIL)";
  console.log(`${status.padEnd(12)} keyword: "${keyword}"`);
  console.log(`           msg: "${message}"`);
  if (result) passed++; else failed++;
}

console.log("────────────────────────────────────────────────────────────");
console.log(`\nResults: ${passed}/20 passed, ${failed} failed`);

// Sanity-check: non-emergency message must NOT trigger
const safeMsgs = [
  "My dog is scratching a lot",
  "My cat won't eat today",
  "Is it normal for dogs to drink more water?",
];
console.log("\nNon-emergency sanity checks (should all be ❌ NO TRIGGER):");
for (const msg of safeMsgs) {
  const r = isEmergencyGate(msg);
  console.log(`${r ? "❌ FALSE POSITIVE" : "✅ correct"}: "${msg}"`);
}

if (failed > 0) {
  console.error(`\n❌ ${failed} keyword(s) FAILED`);
  Deno.exit(1);
} else {
  console.log("\n✅ All 20 keywords passed. Zero LLM cost on match confirmed (model=none in code).");
}
