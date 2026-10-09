// Public — only ever called by the pg_cron job, every 10 minutes. Confirms real delivery via
// Melhor Envio's tracking endpoint for shipped orders, so process-post-purchase-nps only surveys
// customers whose order actually arrived (never a guess based on elapsed time).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { renderEmailTemplate } from "../_shared/render-template.ts";
import { notifyOrderPosted, notifyOrderPrepared } from "../_shared/notify-order-status.ts";
import { postedAtToIso } from "../_shared/melhor-envio-time.ts";

const ME_API = "https://melhorenvio.com.br/api/v2";
const SITE_URL = "https://store.alna.sale";

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
      .select(
        "id, melhor_envio_shipment_id, customer_name, customer_email, tracking_code, prepared_email_sent_at, posted_email_sent_at",
      )
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
            "User-Agent": "ALNA (noreply@alna.sale)",
          },
          body: JSON.stringify({ orders: [order.melhor_envio_shipment_id] }),
        });
        if (!resp.ok) continue;
        const json = await resp.json();
        const entry = json[order.melhor_envio_shipment_id];

        // Order history: the carrier has the parcel ("deixou na agência / foi postado").
        if (entry?.posted_at) {
          await admin.from("order_events").upsert(
            {
              order_id: order.id,
              kind: "posted",
              title: "Deixado no ponto de coleta",
              detail: "Seu pedido foi deixado no ponto de coleta e está a caminho.",
              occurred_at: postedAtToIso(entry.posted_at),
            },
            { onConflict: "order_id,kind", ignoreDuplicates: true },
          );
        }
        if (entry?.tracking) {
          await admin
            .from("orders")
            .update({ tracking_code: entry.tracking })
            .eq("id", order.id)
            .is("tracking_code", null);
        }

        // Customer e-mails about the parcel's journey (each goes out once, guarded by a claim column).
        // 1) "Preparado": normally sent when the label is generated; this is the safety net if that failed
        //    (and covers labels generated before this e-mail existed). Skipped once the parcel is posted.
        if (!order.prepared_email_sent_at && !order.posted_email_sent_at && !entry?.posted_at) {
          await notifyOrderPrepared(admin, order.id);
        }
        // 2) "Deixado no ponto de coleta + rastreio": the carrier has scanned the parcel in. Waits for the
        //    tracking code, if it isn't there yet (tries again on the next run).
        if (entry?.posted_at && !order.posted_email_sent_at && !entry?.delivered_at) {
          await notifyOrderPosted(admin, order.id, entry.tracking ?? order.tracking_code);
        }
        if (entry?.delivered_at) {
          const { error: deliveredError } = await admin
            .from("orders")
            .update({ delivered_at: entry.delivered_at, status: "completed" })
            .eq("id", order.id);
          if (deliveredError) {
            // Don't send the "chegou" e-mail if this didn't actually persist — otherwise the
            // order keeps matching the query above and we'd resend it on every run forever.
            console.error("[sync-delivery-status] falha ao gravar entrega", order.id, deliveredError);
            continue;
          }
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
              await sendEmail(resendKey, { to: order.customer_email, subject: rendered.subject, html: rendered.html, template: rendered.templateId });
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
