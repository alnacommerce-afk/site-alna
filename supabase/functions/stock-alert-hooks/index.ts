// Called only by DB triggers (product_variants stock changes, via pg_net) — never by the browser.
// Two events, both defined in supabase/migrations/20260928000000_stock_alerts_and_restock_notify.sql:
//   - "low_stock": stock crossed down to <=10 for the first time since it was last healthy — tells
//     the admin which SKU it is and how many are left.
//   - "back_in_stock": stock went from 0 to something — e-mails everyone on that SKU's restock
//     waitlist (see Admin > Marketing > Fluxo de E-mail for the visual flow).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { renderEmailTemplate } from "../_shared/render-template.ts";

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

type Body = { event: "low_stock" | "back_in_stock"; variantId: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { event, variantId } = (await req.json()) as Body;
    if (!event || !variantId) return jsonResponse({ ok: true, ignored: "missing event/variantId" });

    const { data: variant } = await admin
      .from("product_variants")
      .select("sku, name, stock_quantity, products(title, slug)")
      .eq("id", variantId)
      .maybeSingle();
    if (!variant) return jsonResponse({ ok: true, ignored: "variant not found" });

    const product = variant.products as { title: string; slug: string } | null;
    const variantSuffix = variant.name ? ` — ${variant.name}` : "";
    const resendKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "resend" })
      .then((r) => r.data as string | null);

    if (event === "low_stock") {
      const { data: settings } = await admin
        .from("site_settings")
        .select("admin_notification_email")
        .eq("id", "default")
        .maybeSingle();
      if (!settings?.admin_notification_email) {
        return jsonResponse({ ok: true, skipped: "no admin_notification_email" });
      }
      const rendered = await renderEmailTemplate(admin, "low_stock_alert", {
        sku: variant.sku,
        produto: product?.title ?? "",
        variante: variantSuffix,
        quantidade: String(variant.stock_quantity),
        link_estoque: `${SITE_URL}/admin/estoque`,
      });
      if (rendered) {
        await sendEmail(resendKey, {
          to: settings.admin_notification_email,
          subject: rendered.subject,
          html: rendered.html,
          template: rendered.templateId,
        });
      }
    }

    if (event === "back_in_stock") {
      const { data: waiters } = await admin
        .from("restock_notifications")
        .select("id, email, name")
        .eq("product_variant_id", variantId)
        .is("notified_at", null);

      for (const waiter of waiters ?? []) {
        const rendered = await renderEmailTemplate(admin, "restock_available", {
          nome: waiter.name?.trim() || "cliente",
          produto: product?.title ?? "",
          variante: variantSuffix,
          link_produto: product?.slug ? `${SITE_URL}/produto/${product.slug}` : SITE_URL,
        });
        if (rendered) {
          await sendEmail(resendKey, {
            to: waiter.email,
            subject: rendered.subject,
            html: rendered.html,
            template: rendered.templateId,
          });
        }
      }

      if (waiters && waiters.length > 0) {
        await admin
          .from("restock_notifications")
          .update({ notified_at: new Date().toISOString() })
          .eq("product_variant_id", variantId)
          .is("notified_at", null);
      }
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("[stock-alert-hooks]", error);
    const message = error instanceof Error ? error.message : "Erro ao processar alerta de estoque.";
    return jsonResponse({ error: message }, 500);
  }
});
