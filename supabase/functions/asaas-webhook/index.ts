// Public (called by Asaas, not by our own frontend). Verifies the `asaas-access-token` header
// against a token we generated ourselves (Vault, Admin > Conexões de API, id "asaas_webhook") —
// register this same token in Asaas > Configurações > Integração > Webhooks when adding the URL.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { notifyPaymentConfirmed } from "../_shared/notify-payment-confirmed.ts";
import { reportPaymentProblem } from "../_shared/payment-alert.ts";
import { notifyOrderCancelled, notifyOrderRefunded } from "../_shared/notify-order-status.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PAID_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const FAILED_EVENTS = new Set([
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
  "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
  "PAYMENT_DELETED",
]);
const REFUNDED_EVENTS = new Set(["PAYMENT_REFUNDED", "PAYMENT_PARTIALLY_REFUNDED"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const receivedToken = req.headers.get("asaas-access-token");
    const { data: expectedToken } = await admin.rpc("get_integration_secret", {
      p_integration_id: "asaas_webhook",
    });
    if (!expectedToken || receivedToken !== expectedToken) {
      return jsonResponse({ error: "Token inválido." }, 401);
    }

    const event = await req.json();
    const eventType = event?.event as string | undefined;
    const payment = event?.payment as { id?: string; status?: string } | undefined;

    // API-key lifecycle events (docs.asaas.com/docs/eventos-para-chaves-de-api): the key is about to
    // expire from inactivity, or was disabled / expired / deleted. Warn the admin before checkout breaks.
    if (eventType === "ACCESS_TOKEN_EXPIRING_SOON" || eventType === "ACCESS_TOKEN_DISABLED" ||
      eventType === "ACCESS_TOKEN_EXPIRED" || eventType === "ACCESS_TOKEN_DELETED") {
      await reportPaymentProblem(admin, "asaas_api_key", `A Asaas avisou: ${eventType}.`);
      return jsonResponse({ ok: true });
    }

    if (!eventType || !payment?.id) {
      return jsonResponse({ ok: true, ignored: "missing event/payment" });
    }

    let orderStatus: "paid" | "cancelled" | "refunded" | "pending" | null = null;
    if (PAID_EVENTS.has(eventType)) orderStatus = "paid";
    else if (FAILED_EVENTS.has(eventType)) orderStatus = "cancelled";
    // Distinct from "cancelled" — the customer's order-timeline dialog and the order_events
    // trigger both have a dedicated "Pagamento estornado" message for this, since money that was
    // actually paid and then returned is a different story than a payment that never went through.
    else if (REFUNDED_EVENTS.has(eventType)) orderStatus = "refunded";

    // Fetch the order first so we know its PREVIOUS status — needed to send the "payment
    // confirmed" e-mail exactly once, even if Asaas retries this webhook.
    const { data: existingOrder } = await admin
      .from("orders")
      .select("id, status, user_id, customer_name, customer_email, total_cents, is_new_account, referrer_user_id")
      .eq("payment_id", payment.id)
      .maybeSingle();

    const update: Record<string, unknown> = { payment_status: payment.status ?? eventType };
    if (orderStatus) update.status = orderStatus;

    const { error } = await admin.from("orders").update(update).eq("payment_id", payment.id);
    if (error) throw error;

    if (orderStatus === "paid" && existingOrder && existingOrder.status !== "paid") {
      await notifyPaymentConfirmed(admin, {
        id: existingOrder.id,
        user_id: existingOrder.user_id,
        customer_name: existingOrder.customer_name,
        customer_email: existingOrder.customer_email,
        total_cents: existingOrder.total_cents,
        is_new_account: existingOrder.is_new_account,
        referrer_user_id: existingOrder.referrer_user_id,
      });
    }

    // Customer e-mails for the sad paths, once per order (Asaas retries webhooks, and sends several
    // events for one payment, so we only act on an actual change of status).
    if (existingOrder && orderStatus && existingOrder.status !== orderStatus) {
      const statusEmailOrder = {
        id: existingOrder.id,
        customer_name: existingOrder.customer_name,
        customer_email: existingOrder.customer_email,
        total_cents: existingOrder.total_cents,
      };
      if (orderStatus === "refunded") {
        await notifyOrderRefunded(admin, statusEmailOrder);
      } else if (orderStatus === "cancelled") {
        // A refused card / risk-analysis rejection always deserves an explanation. PAYMENT_DELETED on a
        // still-unpaid order is just the charge being cleaned up (customer never paid), so stay quiet
        // there; on an already-paid order it's a real cancellation the customer must hear about.
        const refused = eventType !== "PAYMENT_DELETED";
        const wasPaid = ["paid", "shipped", "completed"].includes(existingOrder.status);
        if (refused || wasPaid) await notifyOrderCancelled(admin, statusEmailOrder);
      }
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("[asaas-webhook]", error);
    const message = error instanceof Error ? error.message : "Erro ao processar webhook.";
    return jsonResponse({ error: message }, 500);
  }
});
