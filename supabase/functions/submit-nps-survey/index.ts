// Public. Submission target for the /pesquisa/$orderId landing page linked from the
// post_purchase_nps e-mail. Trusts the order UUID the same way get-order-status/unsubscribe-email
// do. First submission wins — the score can't be overwritten by revisiting the page later.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { randomPassword } from "../_shared/random-password.ts";
import { sendEmail } from "../_shared/send-email.ts";
import { renderEmailTemplate } from "../_shared/render-template.ts";

const PROMOTER_THRESHOLD = 5;
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

async function getOrCreateReferralCode(admin: ReturnType<typeof createClient>, userId: string) {
  const { data: existing } = await admin
    .from("referral_codes")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing.code;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomPassword(6).toUpperCase();
    const { data: created, error } = await admin
      .from("referral_codes")
      .insert({ user_id: userId, code })
      .select("code")
      .maybeSingle();
    if (created) return created.code;
    if (error?.code !== "23505") break; // anything but a unique-code collision is unexpected — stop retrying
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const orderId = body?.orderId as string | undefined;
    const score = Number(body?.score);
    const wouldRecommend = body?.wouldRecommend;
    if (!orderId || !Number.isInteger(score) || score < 0 || score > 10 || typeof wouldRecommend !== "boolean") {
      return jsonResponse({ error: "Dados da pesquisa inválidos." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: order } = await admin
      .from("orders")
      .select("id, user_id, customer_name, customer_email, nps_score")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return jsonResponse({ error: "Pedido não encontrado." }, 404);
    if (order.nps_score != null) {
      return jsonResponse({ ok: true, alreadyAnswered: true });
    }

    await admin
      .from("orders")
      .update({ nps_score: score, nps_would_recommend: wouldRecommend })
      .eq("id", orderId);

    const promoter = score >= PROMOTER_THRESHOLD;
    let referralLink: string | null = null;

    if (order.customer_email) {
      const resendKey = await admin
        .rpc("get_integration_secret", { p_integration_id: "resend" })
        .then((r) => r.data as string | null);
      const referralCode = order.user_id ? await getOrCreateReferralCode(admin, order.user_id) : null;
      if (referralCode) referralLink = `${SITE_URL}/loja?ref=${referralCode}`;

      const rendered = await renderEmailTemplate(admin, "nps_thank_you", {
        nome: order.customer_name ?? "cliente",
        link_indicacao: referralLink ?? `${SITE_URL}/conta`,
      });
      if (rendered) {
        await sendEmail(resendKey, { to: order.customer_email, subject: rendered.subject, html: rendered.html });
      }

      if (promoter) {
        // next_email_at starts the 15-day wait for their first marketing e-mail (send-weekly-marketing
        // reschedules it after every send — 20 days after the 1st, 15 days after every one since).
        const { data: existingSubscriber } = await admin
          .from("marketing_subscribers")
          .select("email")
          .eq("email", order.customer_email)
          .maybeSingle();
        if (!existingSubscriber) {
          await admin.from("marketing_subscribers").insert({
            email: order.customer_email,
            name: order.customer_name,
            source: "nps_promoter",
            next_email_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }
      }
    }

    return jsonResponse({ ok: true, promoter, referralLink });
  } catch (error) {
    console.error("[submit-nps-survey]", error);
    const message = error instanceof Error ? error.message : "Erro ao registrar sua resposta.";
    return jsonResponse({ error: message }, 500);
  }
});
