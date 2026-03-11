/**
 * PawDoc — check-receipts Edge Function
 * Feature 3: Smart Reminder System
 *
 * Triggered by pg_cron (e.g. every hour):
 *   SELECT cron.schedule('check-receipts', '0 * * * *',
 *     $$SELECT net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/check-receipts',
 *       headers := '{"Authorization":"Bearer <service_role_key>"}'::jsonb
 *     )$$);
 *
 * Algorithm:
 *   1. Fetch push_receipts WHERE status='pending' AND created_at < now()-15min
 *   2. Batch into groups of 100 (Expo limit)
 *   3. Call Expo getReceipts API
 *   4. Update push_receipts.status = 'ok' | 'error'
 *   5. On error status: log — no retry in MVP
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PendingReceipt {
  id: string;
  receipt_id: string;
  reminder_id: string;
  created_at: string;
  status: string;
}

interface ExpoReceiptDetail {
  status: "ok" | "error";
  message?: string;
  details?: Record<string, unknown>;
}

interface ExpoReceiptsResponse {
  data: Record<string, ExpoReceiptDetail>;
  errors?: Array<{ code: string; message: string }>;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(
      JSON.stringify({ error: "Server misconfiguration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── 1. Fetch pending receipts older than 15 minutes ─────────────────────
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data: pendingData, error: fetchError } = await supabase
    .from("push_receipts")
    .select("id, receipt_id, reminder_id, created_at, status")
    .eq("status", "pending")
    .lt("created_at", cutoff);

  if (fetchError) {
    console.error("Failed to fetch pending receipts:", fetchError.message);
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const pending = (pendingData ?? []) as PendingReceipt[];
  console.log(`Checking ${pending.length} pending receipt(s)`);

  if (pending.length === 0) {
    return new Response(
      JSON.stringify({ checked: 0, updated: 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  let totalUpdated = 0;
  const errors: Array<{ receipt_id: string; message: string }> = [];

  // ── 2. Batch into groups of 100 ─────────────────────────────────────────
  const batches = chunkArray(pending, 100);

  for (const batch of batches) {
    const receiptIds = batch.map((r) => r.receipt_id);

    // ── 3. Call Expo receipts API ──────────────────────────────────────────
    let expoData: Record<string, ExpoReceiptDetail> = {};
    try {
      const expoRes = await fetch(
        "https://exp.host/--/api/v2/push/getReceipts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
          },
          body: JSON.stringify({ ids: receiptIds }),
        }
      );

      if (!expoRes.ok) {
        const text = await expoRes.text();
        console.error(
          `Expo receipts API error ${expoRes.status}: ${text}`
        );
        continue; // skip this batch, receipts remain pending
      }

      const json = (await expoRes.json()) as ExpoReceiptsResponse;
      expoData = json.data ?? {};

      if (json.errors?.length) {
        for (const e of json.errors) {
          console.warn(`Expo receipts API warning: [${e.code}] ${e.message}`);
        }
      }
    } catch (err) {
      console.error(
        "Network error calling Expo receipts API:",
        err instanceof Error ? err.message : String(err)
      );
      continue; // leave this batch pending
    }

    // ── 4. Update push_receipts based on Expo response ────────────────────
    for (const receipt of batch) {
      const detail = expoData[receipt.receipt_id];
      if (!detail) {
        // Expo doesn't have this receipt yet — leave pending
        continue;
      }

      const newStatus = detail.status === "ok" ? "ok" : "error";

      const { error: updateError } = await supabase
        .from("push_receipts")
        .update({ status: newStatus })
        .eq("id", receipt.id);

      if (updateError) {
        console.error(
          `Failed to update push_receipt ${receipt.id}:`,
          updateError.message
        );
        continue;
      }

      totalUpdated++;

      // ── 5. Log errors — no retry in MVP ─────────────────────────────────
      if (newStatus === "error") {
        const msg = detail.message ?? "Unknown push delivery error";
        console.error(
          `Push receipt error for reminder ${receipt.reminder_id}: ${msg}`,
          detail.details ?? {}
        );
        errors.push({ receipt_id: receipt.receipt_id, message: msg });
      }
    }
  }

  console.log(
    `Receipt check complete: ${totalUpdated} updated, ${errors.length} error(s)`
  );

  return new Response(
    JSON.stringify({
      checked: pending.length,
      updated: totalUpdated,
      errors: errors.length,
      error_details: errors,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
