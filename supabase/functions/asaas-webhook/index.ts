// Public (called by Asaas, not by our own frontend). Verifies the `asaas-access-token` header
// against a token we generated ourselves (Vault, Admin > Conexões de API, id "asaas_webhook") —
// register this same token in Asaas > Configurações > Integração > Webhooks when adding the URL.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { paymentConfirmedEmailHtml } from "../_shared/email-templates.ts";

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
    if (!eventType || !payment?.id) {
      return jsonResponse({ ok: true, ignored: "missing event/payment" });
    }

    let orderStatus: "paid" | "cancelled" | "pending" | null = null;
    if (PAID_EVENTS.has(eventType)) orderStatus = "paid";
    else if (FAILED_EVENTS.has(eventType)) orderStatus = "cancelled";
    else if (REFUNDED_EVENTS.has(eventType)) orderStatus = "cancelled";

    // Fetch the order first so we know its PREVIOUS status — needed to send the "payment
    // confirmed" e-mail exactly once, even if Asaas retries this webhook.
    const { data: existingOrder } = await admin
      .from("orders")
      .select("id, status, customer_name, customer_email, total_cents")
      .eq("payment_id", payment.id)
      .maybeSingle();

    const update: Record<string, unknown> = { payment_status: payment.status ?? eventType };
    if (orderStatus) update.status = orderStatus;

    const { error } = await admin.from("orders").update(update).eq("payment_id", payment.id);
    if (error) throw error;

    if (orderStatus === "paid" && existingOrder && existingOrder.status !== "paid" && existingOrder.customer_email) {
      const resendKey = await admin
        .rpc("get_integration_secret", { p_integration_id: "resend" })
        .then((r) => r.data as string | null);
      await sendEmail(resendKey, {
        to: existingOrder.customer_email,
        subject: `Pagamento confirmado #${existingOrder.id.slice(0, 8)} — Alna Commerce`,
        html: paymentConfirmedEmailHtml({
          orderId: existingOrder.id,
          customerName: existingOrder.customer_name ?? "cliente",
          totalCents: existingOrder.total_cents,
        }),
      });
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("[asaas-webhook]", error);
    const message = error instanceof Error ? error.message : "Erro ao processar webhook.";
    return jsonResponse({ error: message }, 500);
  }
});
