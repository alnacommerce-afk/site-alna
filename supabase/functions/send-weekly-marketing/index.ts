// Public — only ever called by the pg_cron job, weekly. Sends to everyone in
// `marketing_subscribers` (opted in by giving a promoter NPS score) who hasn't unsubscribed.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { renderEmailTemplate, resolveTemplateCoupon } from "../_shared/render-template.ts";

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

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: subscribers } = await admin.from("marketing_subscribers").select("email, name");
    if (!subscribers?.length) return jsonResponse({ ok: true, sent: 0, reason: "sem assinantes" });

    const { data: suppressions } = await admin.from("email_suppressions").select("email");
    const suppressed = new Set((suppressions ?? []).map((s) => s.email.toLowerCase()));

    const { data: template } = await admin
      .from("email_templates")
      .select("featured_product_ids")
      .eq("id", "weekly_marketing")
      .maybeSingle();
    const productIds = template?.featured_product_ids ?? [];

    let productsHtml = "";
    if (productIds.length) {
      const { data: products } = await admin
        .from("products")
        .select("id, title, slug, product_images(storage_path, position), product_variants(price_cents)")
        .in("id", productIds);
      productsHtml = `<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin:16px 0;">${(products ?? [])
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
    }

    const coupon = await resolveTemplateCoupon(admin, "weekly_marketing");
    const cupomBlocoHtml = coupon
      ? `<p style="text-align:center;margin:20px 0;">Use o cupom <strong style="color:#16a34a;">${coupon.code}</strong> e ganhe ${coupon.discountPercent}% OFF!</p>`
      : "";

    const resendKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "resend" })
      .then((r) => r.data as string | null);

    let sent = 0;
    for (const sub of subscribers) {
      if (suppressed.has(sub.email.toLowerCase())) continue;
      const rendered = await renderEmailTemplate(
        admin,
        "weekly_marketing",
        {
          nome: sub.name ?? "cliente",
          produtos_html: productsHtml,
          cupom_bloco_html: cupomBlocoHtml,
        },
        { unsubscribeLink: `${supabaseUrl}/functions/v1/unsubscribe-email?email=${encodeURIComponent(sub.email)}` },
      );
      if (rendered) {
        await sendEmail(resendKey, { to: sub.email, subject: rendered.subject, html: rendered.html });
        sent++;
      }
    }

    return jsonResponse({ ok: true, sent });
  } catch (error) {
    console.error("[send-weekly-marketing]", error);
    const message = error instanceof Error ? error.message : "Erro ao enviar marketing semanal.";
    return jsonResponse({ error: message }, 500);
  }
});
