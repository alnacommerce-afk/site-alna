// Public. Saves the shopper's cart together with the e-mail (and optional WhatsApp) they chose to leave, so
// process-abandoned-carts can remind them if they never finish the purchase. The shopper gives explicit
// consent in the cart / checkout box before this is ever called.
//
// Two ways to call it (JSON body):
//   - { email, phone?, items }   first save (or save again after clearing the browser): finds/creates the
//                                 single row of that e-mail and returns its `token`;
//   - { token, items }           later changes of the same cart (the browser remembers the token);
//   - { token, action: "stop" }  "I don't want reminders": nothing is sent for this cart anymore.
// Prices and stock are always read from the database here — nothing the browser sends about money is trusted.
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  cartSubtotalCents,
  cartSummary,
  loadLiveCartLines,
  sanitizeCartLines,
} from "../_shared/cart-items.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
// After reminders went out, a new cycle for the same e-mail only starts after this long.
const NEW_CYCLE_AFTER_DAYS = 7;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanPhone(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13 ? digits : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonResponse({ error: "Pedido inválido." }, 400);

    const token = typeof body.token === "string" ? body.token.trim() : "";
    const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    let row: {
      id: string;
      token: string;
      email: string;
      recovered_at: string | null;
      reminder_1_sent_at: string | null;
      reminder_2_sent_at: string | null;
      stopped_at: string | null;
    } | null = null;
    const columns = "id, token, email, recovered_at, reminder_1_sent_at, reminder_2_sent_at, stopped_at";
    if (token) {
      const { data } = await admin.from("abandoned_carts").select(columns).eq("token", token).maybeSingle();
      row = data;
      if (!row) return jsonResponse({ error: "Carrinho não encontrado." }, 404);
    } else if (emailRaw) {
      if (emailRaw.length > 254 || !EMAIL_RE.test(emailRaw)) {
        return jsonResponse({ error: "Informe um e-mail válido." }, 400);
      }
      const { data } = await admin.from("abandoned_carts").select(columns).eq("email", emailRaw).maybeSingle();
      row = data;
    } else {
      return jsonResponse({ error: "Informe o e-mail." }, 400);
    }

    if (body.action === "stop") {
      if (!row) return jsonResponse({ ok: true });
      await admin.from("abandoned_carts").update({ stopped_at: new Date().toISOString() }).eq("id", row.id);
      return jsonResponse({ ok: true });
    }

    const live = await loadLiveCartLines(admin, sanitizeCartLines(body.items));
    const now = new Date();
    const cartFields = {
      items: live.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      item_count: live.reduce((sum, l) => sum + l.quantity, 0),
      subtotal_cents: cartSubtotalCents(live),
      summary: live.length ? cartSummary(live) : null,
      last_activity_at: now.toISOString(),
    };
    const phone = cleanPhone(body.phone);

    if (!row) {
      const { data: created, error } = await admin
        .from("abandoned_carts")
        .insert({ email: emailRaw, phone, ...cartFields })
        .select("token")
        .single();
      if (error || !created) throw error ?? new Error("Falha ao salvar o carrinho.");
      return jsonResponse({ ok: true, token: created.token });
    }

    // Existing row. A cycle that already sent reminders (or ended in a purchase) only starts over after a week;
    // before that the dates stay as they are, so the same e-mail never gets more than 2 reminders per cycle.
    const lastReminderAt = row.reminder_2_sent_at ?? row.reminder_1_sent_at;
    const cycleOver =
      !lastReminderAt || now.getTime() - new Date(lastReminderAt).getTime() >= NEW_CYCLE_AFTER_DAYS * DAY_MS;
    const update: Record<string, unknown> = { ...cartFields };
    if (phone) update.phone = phone;
    if (token === "" && emailRaw) {
      // The shopper typed the e-mail again and consented again: reminders are welcome again.
      update.stopped_at = null;
      update.consented_at = now.toISOString();
    }
    if (cycleOver && live.length > 0) {
      update.reminder_1_sent_at = null;
      update.reminder_2_sent_at = null;
      update.recovered_at = null;
      update.recovered_order_id = null;
    }
    const { error: updateError } = await admin.from("abandoned_carts").update(update).eq("id", row.id);
    if (updateError) throw updateError;
    return jsonResponse({ ok: true, token: row.token });
  } catch (error) {
    console.error("[save-cart]", error);
    return jsonResponse({ error: "Não foi possível salvar o carrinho agora." }, 500);
  }
});
