/**
 * PawDoc — send-reminders Edge Function
 * Feature 3: Smart Reminder System
 *
 * Triggered by pg_cron (e.g. every 30 minutes):
 *   SELECT cron.schedule('send-reminders', 'every 30 minutes',
 *     $$SELECT net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/send-reminders',
 *       headers := '{"Authorization":"Bearer <service_role_key>"}'::jsonb
 *     )$$);
 *
 * Algorithm per reminder:
 *   1. Fetch due reminders (is_active, due <= now, not sent in last 23 h)
 *   2. For each: fetch users.push_token + display_name + email via pet→user join
 *   3. Send Expo push notification (push_token present) OR Resend email (fallback)
 *   4. Record receipt_id in push_receipts
 *   5. Update reminders.last_sent = now()
 *   6. If recurrence set: advance due_date by interval
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DueReminder {
  id: string;
  pet_id: string;
  type: string;
  title: string | null;
  due_date: string;
  recurrence_interval: number | null;
  recurrence_unit: string | null;
  affiliate_cta: string | null;
  pets: {
    name: string;
    users: {
      id: string;
      email: string;
      display_name: string | null;
      push_token: string | null;
    };
  };
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: Record<string, unknown>;
}

interface ExpoResponse {
  data: ExpoTicket[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Add recurrence_interval × recurrence_unit to a date string.
 * Returns ISO date string (YYYY-MM-DD).
 */
function advanceDueDate(
  dueDateStr: string,
  interval: number,
  unit: string
): string {
  const d = new Date(dueDateStr);
  switch (unit) {
    case "days":
      d.setDate(d.getDate() + interval);
      break;
    case "weeks":
      d.setDate(d.getDate() + interval * 7);
      break;
    case "months":
      d.setMonth(d.getMonth() + interval);
      break;
    case "years":
      d.setFullYear(d.getFullYear() + interval);
      break;
    default:
      break;
  }
  return d.toISOString().split("T")[0];
}

/**
 * Build human-readable notification body.
 * e.g. "Max's vaccination is due today"
 */
function buildNotificationBody(petName: string, type: string): string {
  const typeLabel: Record<string, string> = {
    vaccination: "vaccination",
    medication: "medication",
    checkup: "annual vet checkup",
    prevention: "flea/tick/heartworm prevention",
  };
  return `${petName}'s ${typeLabel[type] ?? type} is due today`;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // Allow only POST (pg_cron uses POST via net.http_post)
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(
      JSON.stringify({ error: "Server misconfiguration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── 1. Fetch due reminders ───────────────────────────────────────────────
  const { data: dueReminders, error: fetchError } = await supabase
    .from("reminders")
    .select(
      `id, pet_id, type, title, due_date, recurrence_interval, recurrence_unit,
       affiliate_cta,
       pets!inner(
         name,
         users!inner(id, email, display_name, push_token)
       )`
    )
    .eq("is_active", true)
    .lte("due_date", new Date().toISOString().split("T")[0])
    .or("last_sent.is.null,last_sent.lt." + new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString());

  if (fetchError) {
    console.error("Failed to fetch due reminders:", fetchError);
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const reminders = (dueReminders ?? []) as DueReminder[];
  console.log(`Processing ${reminders.length} due reminder(s)`);

  const results: Array<{
    reminder_id: string;
    channel: "push" | "email" | "none";
    success: boolean;
    error?: string;
  }> = [];

  // ── 2. Process each reminder ─────────────────────────────────────────────
  for (const reminder of reminders) {
    const pet = reminder.pets;
    const user = pet?.users;
    if (!user) {
      console.warn(`No user found for reminder ${reminder.id}`);
      continue;
    }

    // Verify pet ownership — confirm the pet still belongs to this user in DB
    // (guards against any data inconsistency at processing time)
    const { data: ownedPet, error: ownershipError } = await supabase
      .from("pets")
      .select("id")
      .eq("id", reminder.pet_id)
      .eq("user_id", user.id)
      .single();

    if (ownershipError || !ownedPet) {
      console.warn(
        `Pet ownership check failed for reminder ${reminder.id} (pet_id=${reminder.pet_id}, user_id=${user.id}) — skipping`
      );
      continue;
    }

    const petName = pet.name;
    const notificationBody = buildNotificationBody(petName, reminder.type);
    let channel: "push" | "email" | "none" = "none";
    let sendSuccess = false;
    let sendError: string | undefined;

    // ── 2a. Try Expo push notification ──────────────────────────────────────
    if (user.push_token) {
      try {
        const expoPayload = {
          to: user.push_token,
          title: "PawDoc Reminder",
          body: notificationBody,
          data: {
            reminder_id: reminder.id,
            affiliate_cta: reminder.affiliate_cta ?? null,
            pet_id: reminder.pet_id,
          },
          sound: "default",
          priority: "high",
        };

        const expoRes = await fetch(
          "https://exp.host/--/api/v2/push/send",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              "Accept-Encoding": "gzip, deflate",
            },
            body: JSON.stringify(expoPayload),
          }
        );

        const expoJson = (await expoRes.json()) as ExpoResponse;
        const ticket = expoJson?.data?.[0] ?? (expoJson as unknown as ExpoTicket);

        channel = "push";

        if (ticket.status === "ok" && ticket.id) {
          sendSuccess = true;
          // Record receipt for later verification
          const { error: receiptInsertError } = await supabase
            .from("push_receipts")
            .insert({
              receipt_id: ticket.id,
              reminder_id: reminder.id,
              status: "pending",
            });
          if (receiptInsertError) {
            console.warn(
              `Could not insert push_receipt for reminder ${reminder.id}:`,
              receiptInsertError.message
            );
          }
        } else {
          sendSuccess = false;
          sendError = ticket.message ?? "Expo push failed";
          console.warn(
            `Push failed for reminder ${reminder.id}: ${sendError}`
          );
        }
      } catch (err) {
        channel = "push";
        sendSuccess = false;
        sendError = err instanceof Error ? err.message : String(err);
        console.error(
          `Push error for reminder ${reminder.id}: ${sendError}`
        );
      }
    }

    // ── 2b. Email fallback (no push_token OR push failed) ───────────────────
    if (!sendSuccess && resendApiKey && user.email) {
      channel = "email";
      try {
        const displayName = user.display_name ?? "Pet Parent";
        const affiliateHtml = reminder.affiliate_cta
          ? `<p style="margin-top:16px">
               <a href="${reminder.affiliate_cta}"
                  style="background:#2D6A4F;color:#fff;padding:10px 20px;
                         border-radius:8px;text-decoration:none;font-weight:600">
                 Refill / Book Now
               </a>
             </p>`
          : "";

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "PawDoc <reminders@pawdoc.app>",
            to: [user.email],
            subject: `PawDoc: ${petName}'s ${reminder.type} is due today`,
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
                <h2 style="color:#2D6A4F">PawDoc Reminder 🐾</h2>
                <p>Hi ${displayName},</p>
                <p>${notificationBody}.</p>
                ${affiliateHtml}
                <p style="color:#9CA3AF;font-size:12px;margin-top:32px">
                  You're receiving this because you set up a reminder in PawDoc.
                </p>
              </div>`,
          }),
        });

        if (emailRes.ok) {
          sendSuccess = true;
          sendError = undefined;
        } else {
          const body = await emailRes.text();
          sendSuccess = false;
          sendError = `Resend error ${emailRes.status}: ${body}`;
          console.error(`Email failed for reminder ${reminder.id}: ${sendError}`);
        }
      } catch (err) {
        sendSuccess = false;
        sendError = err instanceof Error ? err.message : String(err);
        console.error(`Email error for reminder ${reminder.id}: ${sendError}`);
      }
    }

    // ── 2c. Update reminder: last_sent + advance due_date if recurrence ──────
    if (sendSuccess) {
      const updates: Record<string, unknown> = {
        last_sent: new Date().toISOString(),
      };

      if (reminder.recurrence_interval && reminder.recurrence_unit) {
        updates.due_date = advanceDueDate(
          reminder.due_date,
          reminder.recurrence_interval,
          reminder.recurrence_unit
        );
      }

      const { error: updateError } = await supabase
        .from("reminders")
        .update(updates)
        .eq("id", reminder.id);

      if (updateError) {
        console.error(
          `Failed to update reminder ${reminder.id}:`,
          updateError.message
        );
      }
    }

    results.push({
      reminder_id: reminder.id,
      channel,
      success: sendSuccess,
      error: sendError,
    });
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(
    `Completed: ${successCount}/${reminders.length} reminder(s) sent`
  );

  return new Response(
    JSON.stringify({
      processed: reminders.length,
      sent: successCount,
      results,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
