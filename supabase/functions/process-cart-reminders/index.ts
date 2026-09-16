// Public — only ever called by the pg_cron job (see migration), every 5 minutes. Never spends
// money or touches payment state, only reads pending orders and sends reminder e-mails, so it's
// safe to be public; the `reminder_10min_sent_at`/`reminder_24h_sent_at` guards make every run
// idempotent even if triggered more than once.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { renderEmailTemplate, resolveTemplateCoupon } from "../_shared/render-template.ts";

const SITE_URL = "https://alnacommerce.com";
const ASAAS_API = "https://api.asaas.com/v3";

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

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type PendingOrder = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  payment_method: string | null;
  payment_id: string | null;
  total_cents: number;
};

async function buildPaymentBlocks(admin: SupabaseClient, order: PendingOrder) {
  if (order.payment_method === "pix" && order.payment_id) {
    const asaasKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "payment_gateway" })
      .then((r) => r.data as string | null);
    if (asaasKey) {
      try {
        const qrResp = await fetch(`${ASAAS_API}/payments/${order.payment_id}/pixQrCode`, {
          headers: { access_token: asaasKey },
        });
        if (qrResp.ok) {
          const qr = await qrResp.json();
          return {
            pixQrHtml: `
              <img src="data:image/png;base64,${qr.encodedImage}" alt="QR Code Pix" style="width:200px;height:200px;display:block;margin:16px auto;" />
              <p style="text-align:center;font-family:monospace;font-size:12px;word-break:break-all;background:#f3f4f6;padding:8px;border-radius:6px;">${qr.payload}</p>`,
            botaoCheckout: `<p style="margin-top:16px;text-align:center;"><a href="${SITE_URL}/pedido/${order.id}" style="color:#16a34a;">Ver meu pedido</a></p>`,
          };
        }
      } catch (error) {
        console.error("[process-cart-reminders] falha ao buscar QR Pix", error);
      }
    }
  }
  // Card (or Pix QR unavailable): send them back to checkout to try again.
  return {
    pixQrHtml: "",
    botaoCheckout: `<p style="margin-top:16px;text-align:center;"><a href="${SITE_URL}/checkout" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;font-weight:bold;text-decoration:none;">Voltar ao checkout</a></p>`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const resendKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "resend" })
      .then((r) => r.data as string | null);

    const { data: suppressions } = await admin.from("email_suppressions").select("email");
    const suppressed = new Set((suppressions ?? []).map((s) => s.email.toLowerCase()));

    const now = Date.now();
    const tenMinAgo = new Date(now - 10 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    let sent10min = 0;
    let sent24h = 0;

    // Step 1: 10-minute nudge.
    const { data: due10min } = await admin
      .from("orders")
      .select("id, customer_name, customer_email, payment_method, payment_id, total_cents")
      .eq("status", "pending")
      .lte("created_at", tenMinAgo)
      .is("reminder_10min_sent_at", null);

    for (const order of due10min ?? []) {
      if (!order.customer_email || suppressed.has(order.customer_email.toLowerCase())) {
        await admin.from("orders").update({ reminder_10min_sent_at: new Date().toISOString() }).eq("id", order.id);
        continue;
      }
      const { pixQrHtml, botaoCheckout } = await buildPaymentBlocks(admin, order);
      const rendered = await renderEmailTemplate(
        admin,
        "cart_reminder_10min",
        {
          nome: order.customer_name ?? "cliente",
          pedido_curto: order.id.slice(0, 8),
          total: formatBRL(order.total_cents),
          pix_qr_html: pixQrHtml,
          botao_checkout: botaoCheckout,
        },
        { unsubscribeLink: `${supabaseUrl}/functions/v1/unsubscribe-email?orderId=${order.id}` },
      );
      if (rendered) {
        await sendEmail(resendKey, { to: order.customer_email, subject: rendered.subject, html: rendered.html });
        sent10min++;
      }
      await admin.from("orders").update({ reminder_10min_sent_at: new Date().toISOString() }).eq("id", order.id);
    }

    // Step 2: 24-hour follow-up (only for orders that already got the 10-minute nudge).
    const coupon = await resolveTemplateCoupon(admin, "cart_reminder_24h");

    const { data: due24h } = await admin
      .from("orders")
      .select("id, customer_name, customer_email, payment_method, payment_id, total_cents")
      .eq("status", "pending")
      .lte("created_at", oneDayAgo)
      .not("reminder_10min_sent_at", "is", null)
      .is("reminder_24h_sent_at", null);

    for (const order of due24h ?? []) {
      if (!order.customer_email || suppressed.has(order.customer_email.toLowerCase())) {
        await admin.from("orders").update({ reminder_24h_sent_at: new Date().toISOString() }).eq("id", order.id);
        continue;
      }
      const { botaoCheckout } = await buildPaymentBlocks(admin, order);
      const rendered = await renderEmailTemplate(
        admin,
        "cart_reminder_24h",
        {
          nome: order.customer_name ?? "cliente",
          pedido_curto: order.id.slice(0, 8),
          total: formatBRL(order.total_cents),
          cupom_codigo: coupon?.code ?? "",
          cupom_desconto: coupon ? String(coupon.discountPercent) : "",
          botao_checkout: botaoCheckout,
        },
        { unsubscribeLink: `${supabaseUrl}/functions/v1/unsubscribe-email?orderId=${order.id}` },
      );
      if (rendered) {
        await sendEmail(resendKey, { to: order.customer_email, subject: rendered.subject, html: rendered.html });
        sent24h++;
      }
      await admin.from("orders").update({ reminder_24h_sent_at: new Date().toISOString() }).eq("id", order.id);
    }

    return jsonResponse({ ok: true, sent10min, sent24h });
  } catch (error) {
    console.error("[process-cart-reminders]", error);
    const message = error instanceof Error ? error.message : "Erro ao processar lembretes.";
    return jsonResponse({ error: message }, 500);
  }
});
