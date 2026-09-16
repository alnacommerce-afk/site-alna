// Public — only ever called by the pg_cron job, every 30 minutes. Confirms real delivery via
// Melhor Envio's tracking endpoint for shipped orders, so process-post-purchase-nps only surveys
// customers whose order actually arrived (never a guess based on elapsed time).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { renderEmailTemplate } from "../_shared/render-template.ts";

const ME_API = "https://melhorenvio.com.br/api/v2";
const SITE_URL = "https://alnacommerce.com";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const meToken = await admin
      .rpc("get_integration_secret", { p_integration_id: "melhor_envio" })
      .then((r) => r.data as string | null);
    if (!meToken) return jsonResponse({ ok: true, updated: 0, reason: "melhor_envio não configurado" });

    const { data: orders } = await admin
      .from("orders")
      .select("id, melhor_envio_shipment_id, customer_name, customer_email")
      .eq("status", "shipped")
      .is("delivered_at", null)
      .not("melhor_envio_shipment_id", "is", null);

    let updated = 0;
    let resendKey: string | null = null;
    for (const order of orders ?? []) {
      if (!order.melhor_envio_shipment_id) continue;
      try {
        const resp = await fetch(`${ME_API}/me/shipment/tracking`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${meToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "Alna Commerce (contato@alna.cc)",
          },
          body: JSON.stringify({ orders: [order.melhor_envio_shipment_id] }),
        });
        if (!resp.ok) continue;
        const json = await resp.json();
        const entry = json[order.melhor_envio_shipment_id];
        if (entry?.delivered_at) {
          await admin
            .from("orders")
            .update({ delivered_at: entry.delivered_at, status: "completed" })
            .eq("id", order.id);
          updated++;

          // Immediate "chegou!" e-mail — additive to (not a replacement for) the 7-day NPS survey
          // that process-post-purchase-nps sends separately once delivered_at is set.
          if (order.customer_email) {
            resendKey ??= await admin
              .rpc("get_integration_secret", { p_integration_id: "resend" })
              .then((r) => r.data as string | null);
            const rendered = await renderEmailTemplate(admin, "delivery_confirmed", {
              nome: order.customer_name ?? "cliente",
              pedido_curto: order.id.slice(0, 8),
              link_conta: `${SITE_URL}/conta`,
            });
            if (rendered) {
              await sendEmail(resendKey, { to: order.customer_email, subject: rendered.subject, html: rendered.html });
            }
          }
        }
      } catch (error) {
        console.error("[sync-delivery-status] falha ao consultar rastreio", order.id, error);
      }
    }

    return jsonResponse({ ok: true, updated });
  } catch (error) {
    console.error("[sync-delivery-status]", error);
    const message = error instanceof Error ? error.message : "Erro ao sincronizar entregas.";
    return jsonResponse({ error: message }, 500);
  }
});
