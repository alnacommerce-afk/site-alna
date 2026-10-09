// Public. The welcome pop-up of the store (/loja) calls this with the e-mail the visitor typed.
//   - New e-mail that never bought: a random single-use welcome coupon (BOAS_VINDAS model, valid 30 days) tied to
//     that e-mail is created and e-mailed (the e-mail also proves the address is real), and the visitor joins the
//     marketing list ("novidades"), as the pop-up text says.
//   - E-mail that already has a welcome coupon: nothing new; the visitor is told to check the inbox.
//   - E-mail that already bought: no coupon (it is a first-purchase gift), but joins the list.
// The pop-up never asks for a phone number: WhatsApp is only collected at the checkout.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { renderEmailTemplate, resolveTemplateCoupon } from "../_shared/render-template.ts";
import { issueWelcomeCoupon } from "../_shared/personal-coupon.ts";

const SITE_URL = "https://store.alna.sale";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Safety valve against someone scripting the form: stop when too many welcome coupons appear in a few minutes.
const MAX_COUPONS_PER_10_MIN = 60;

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
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return jsonResponse({ error: "Informe um e-mail válido." }, 400);
    }

    // Typing the e-mail here is an explicit sign-up: it also lifts an earlier opt-out and joins the list.
    await admin.from("email_suppressions").delete().eq("email", email);
    await admin
      .from("marketing_subscribers")
      .upsert({ email, source: "popup_loja" }, { onConflict: "email", ignoreDuplicates: true });

    const model = await resolveTemplateCoupon(admin, "welcome_coupon");
    if (!model) return jsonResponse({ state: "unavailable" });

    // Already a customer? The welcome coupon is for the first purchase only.
    const { data: previousOrder } = await admin
      .from("orders")
      .select("id")
      .ilike("customer_email", email)
      .neq("status", "cancelled")
      .limit(1)
      .maybeSingle();
    if (previousOrder) return jsonResponse({ state: "existing_customer" });

    // One welcome coupon per e-mail, ever.
    const { data: already } = await admin
      .from("coupons")
      .select("id")
      .eq("personal_for_email", email)
      .eq("source_coupon_id", model.id)
      .limit(1)
      .maybeSingle();
    if (already) return jsonResponse({ state: "already" });

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recent } = await admin
      .from("coupons")
      .select("id", { count: "exact", head: true })
      .eq("source_coupon_id", model.id)
      .gte("created_at", tenMinutesAgo);
    if ((recent ?? 0) >= MAX_COUPONS_PER_10_MIN) return jsonResponse({ state: "busy" });

    const coupon = await issueWelcomeCoupon(admin, email, model);
    if (!coupon) return jsonResponse({ error: "Não foi possível gerar o cupom agora." }, 500);

    const resendKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "resend" })
      .then((r) => r.data as string | null);
    const rendered = await renderEmailTemplate(
      admin,
      "welcome_coupon",
      {
        cupom_codigo: coupon.code,
        cupom_desconto: `${coupon.discountPercent}%`,
        cupom_validade: coupon.validUntil.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        botao_loja: `<p style="margin:20px 0;text-align:center;"><a href="${SITE_URL}/loja?cupom=${encodeURIComponent(coupon.code)}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:14px 28px;border-radius:8px;font-size:16px;font-weight:bold;text-decoration:none;">Ir para a loja</a></p>`,
      },
      {
        unsubscribeLink: `${supabaseUrl}/functions/v1/unsubscribe-email?email=${encodeURIComponent(email)}`,
        recipientEmail: email,
      },
    );
    if (rendered) {
      await sendEmail(resendKey, { to: email, subject: rendered.subject, html: rendered.html, template: rendered.templateId });
    }

    return jsonResponse({
      state: "sent",
      code: coupon.code,
      percent: coupon.discountPercent,
      validUntil: coupon.validUntil.toISOString(),
    });
  } catch (error) {
    console.error("[welcome-coupon]", error);
    return jsonResponse({ error: "Não foi possível gerar o cupom agora." }, 500);
  }
});
