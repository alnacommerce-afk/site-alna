// Public — only ever called by the pg_cron job, hourly. Surveys customers 7 days after their
// order's REAL confirmed delivery (set by sync-delivery-status) — never a time-based guess.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { renderEmailTemplate } from "../_shared/render-template.ts";

const FUNCTIONS_URL_SUFFIX = "/functions/v1";

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

function buildNpsLinksHtml(functionsUrl: string, orderId: string) {
  const cells = Array.from({ length: 11 }, (_, score) => {
    const color = score <= 6 ? "#dc2626" : score <= 8 ? "#f59e0b" : "#16a34a";
    return `<a href="${functionsUrl}/record-nps?orderId=${orderId}&score=${score}" style="display:inline-block;width:28px;height:28px;line-height:28px;margin:2px;border-radius:6px;background:${color};color:#fff;font-weight:bold;text-decoration:none;font-size:13px;">${score}</a>`;
  }).join("");
  return `<div style="text-align:center;margin:20px 0;">${cells}</div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const functionsUrl = `${supabaseUrl}${FUNCTIONS_URL_SUFFIX}`;

  try {
    const resendKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "resend" })
      .then((r) => r.data as string | null);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: due } = await admin
      .from("orders")
      .select("id, customer_name, customer_email, total_cents")
      .not("delivered_at", "is", null)
      .lte("delivered_at", sevenDaysAgo)
      .is("nps_survey_sent_at", null);

    let sent = 0;
    for (const order of due ?? []) {
      if (order.customer_email) {
        const rendered = await renderEmailTemplate(admin, "post_purchase_nps", {
          nome: order.customer_name ?? "cliente",
          pedido_curto: order.id.slice(0, 8),
          total: formatBRL(order.total_cents),
          nps_links_html: buildNpsLinksHtml(functionsUrl, order.id),
        });
        if (rendered) {
          await sendEmail(resendKey, { to: order.customer_email, subject: rendered.subject, html: rendered.html });
          sent++;
        }
      }
      await admin.from("orders").update({ nps_survey_sent_at: new Date().toISOString() }).eq("id", order.id);
    }

    return jsonResponse({ ok: true, sent });
  } catch (error) {
    console.error("[process-post-purchase-nps]", error);
    const message = error instanceof Error ? error.message : "Erro ao processar pesquisa de satisfação.";
    return jsonResponse({ error: message }, 500);
  }
});
