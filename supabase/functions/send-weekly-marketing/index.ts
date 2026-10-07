// Public — only ever called by the pg_cron job, daily. One marketing campaign goes out every 20 days
// (site_settings.marketing_last_campaign_at marks the last one) to everyone on the marketing list
// (customers who gave a 4-10 note in the survey, minus anyone who opted out). Each campaign shows the
// products that entered the store since the previous one (newest first, up to 6); if nothing new came
// in, it falls back to the products the admin picked on the template, and if there are none it waits
// (and tries again the next day). It always carries the coupon linked to the template (RECOMPRA5%OFF).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { renderEmailTemplate, resolveTemplateCoupon } from "../_shared/render-template.ts";

const SITE_URL = "https://store.alna.sale";
const CAMPAIGN_EVERY_DAYS = 20;
const MAX_PRODUCTS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: settings } = await admin
      .from("site_settings")
      .select("marketing_last_campaign_at")
      .eq("id", "default")
      .maybeSingle();
    const lastCampaignAt: string | null = settings?.marketing_last_campaign_at ?? null;
    if (!lastCampaignAt) {
      // First run ever: start the 20-day clock instead of firing a campaign out of nowhere.
      await admin
        .from("site_settings")
        .update({ marketing_last_campaign_at: new Date().toISOString() })
        .eq("id", "default");
      return jsonResponse({ ok: true, sent: 0, reason: "relógio de 20 dias iniciado" });
    }
    if (Date.now() - new Date(lastCampaignAt).getTime() < CAMPAIGN_EVERY_DAYS * DAY_MS) {
      return jsonResponse({ ok: true, sent: 0, reason: "ainda não passaram 20 dias" });
    }

    const { data: subscribers } = await admin.from("marketing_subscribers").select("email, name");
    const { data: suppressions } = await admin.from("email_suppressions").select("email");
    const suppressed = new Set((suppressions ?? []).map((s) => s.email.toLowerCase()));
    const recipients = (subscribers ?? []).filter((s) => !suppressed.has(s.email.toLowerCase()));

    // Products that entered since the last campaign, newest first.
    const productSelect = "id, title, slug, product_images(storage_path, position), product_variants(price_cents)";
    const { data: newProducts } = await admin
      .from("products")
      .select(productSelect)
      .eq("status", "published")
      .gt("created_at", lastCampaignAt)
      .order("created_at", { ascending: false })
      .limit(MAX_PRODUCTS);

    let products = newProducts ?? [];
    let usedFallback = false;
    if (!products.length) {
      const { data: template } = await admin
        .from("email_templates")
        .select("featured_product_ids")
        .eq("id", "weekly_marketing")
        .maybeSingle();
      const featuredIds = template?.featured_product_ids ?? [];
      if (featuredIds.length) {
        const { data: featured } = await admin
          .from("products")
          .select(productSelect)
          .eq("status", "published")
          .in("id", featuredIds);
        products = featured ?? [];
        usedFallback = true;
      }
    }
    if (!products.length) return jsonResponse({ ok: true, sent: 0, reason: "sem produtos para mostrar" });
    if (!recipients.length) {
      // Nobody to send to yet: keep waiting without burning the 20-day cycle.
      return jsonResponse({ ok: true, sent: 0, reason: "lista de marketing vazia" });
    }

    // Claim this cycle (a second concurrent run finds the date already changed and stops).
    const { data: claimed } = await admin
      .from("site_settings")
      .update({ marketing_last_campaign_at: new Date().toISOString() })
      .eq("id", "default")
      .eq("marketing_last_campaign_at", lastCampaignAt)
      .select("id")
      .maybeSingle();
    if (!claimed) return jsonResponse({ ok: true, sent: 0, reason: "outra execução já cuidou deste ciclo" });

    const productsHtml = `<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin:16px 0;">${products
      .map((p) => {
        const image = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position)[0];
        const imageUrl = image
          ? admin.storage.from("product-media").getPublicUrl(image.storage_path).data.publicUrl
          : "";
        const price = (p.product_variants ?? [])[0]?.price_cents;
        return `<a href="${SITE_URL}/produto/${p.slug}" style="display:block;width:140px;text-decoration:none;color:#12294f;">
            ${imageUrl ? `<img src="${imageUrl}" style="width:140px;height:140px;object-fit:cover;border-radius:8px;" />` : ""}
            <p style="margin:6px 0 0;font-size:12px;font-weight:600;">${p.title}</p>
            ${price != null ? `<p style="margin:2px 0 0;font-size:13px;font-weight:bold;color:#16a34a;">${formatBRL(price)}</p>` : ""}
          </a>`;
      })
      .join("")}</div>`;

    const coupon = await resolveTemplateCoupon(admin, "weekly_marketing");
    const cupomBlocoHtml = coupon
      ? `<p style="text-align:center;margin:20px 0;">Use o cupom <strong style="color:#16a34a;">${coupon.code}</strong> e ganhe ${coupon.discountPercent}% de desconto${coupon.minOrderCents > 0 ? ` em compras acima de ${formatBRL(coupon.minOrderCents)}` : " na sua próxima compra"}!</p>`
      : "";

    const resendKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "resend" })
      .then((r) => r.data as string | null);

    let sent = 0;
    for (const sub of recipients) {
      const rendered = await renderEmailTemplate(
        admin,
        "weekly_marketing",
        {
          nome: sub.name ?? "cliente",
          produtos_html: productsHtml,
          cupom_bloco_html: cupomBlocoHtml,
          link_loja: `${SITE_URL}/loja`,
        },
        {
          unsubscribeLink: `${supabaseUrl}/functions/v1/unsubscribe-email?email=${encodeURIComponent(sub.email)}`,
          recipientEmail: sub.email,
        },
      );
      if (rendered) {
        await sendEmail(resendKey, { to: sub.email, subject: rendered.subject, html: rendered.html, template: rendered.templateId });
        sent++;
      }
    }

    return jsonResponse({ ok: true, sent, products: products.length, usedFallback });
  } catch (error) {
    console.error("[send-weekly-marketing]", error);
    const message = error instanceof Error ? error.message : "Erro ao enviar marketing.";
    return jsonResponse({ error: message }, 500);
  }
});
