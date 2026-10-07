// Public. Submission target for the /pesquisa/$orderId landing page linked from the
// post_purchase_nps e-mail. Trusts the order UUID the same way get-order-status/unsubscribe-email
// do. First submission wins — the score can't be overwritten by revisiting the page later.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { randomPassword } from "../_shared/random-password.ts";

// From this score up the customer sees the referral link on the page.
const PROMOTER_THRESHOLD = 5;
// Notes 0-3 never enter the marketing list; 4-10 do.
const MARKETING_MIN_SCORE = 4;
// Notes up to this score get the "conte o que aconteceu" box on the landing page; the text is kept
// for the admin (Marketing > NPS) to follow up on.
const FEEDBACK_MAX_SCORE = 5;
const FEEDBACK_MAX_LENGTH = 1000;
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

// Almost every order already has a user_id (checkout-create always finds-or-creates an account),
// but a handful of legacy orders predate that — resolve or create one here too, the same way,
// so the referral link in the "obrigado" popup is never silently missing.
async function getOrCreateCustomerUserId(
  admin: ReturnType<typeof createClient>,
  email: string,
  name: string | null,
) {
  const existing = await admin
    .rpc("get_customer_user_id", { p_email: email })
    .then((r) => r.data as string | null);
  if (existing) return existing;

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: randomPassword(12),
    email_confirm: true,
    user_metadata: name ? { name } : undefined,
  });
  if (error || !created?.user) {
    console.error("[submit-nps-survey] falha ao criar conta para gerar link de indicação", error);
    return null;
  }
  await admin.from("user_roles").insert({ user_id: created.user.id, role: "customer" });
  return created.user.id;
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // GET — the landing page calls this on load so it already knows who is answering (for the
  // greeting) and whether this order already has a recorded response, before showing any form.
  if (req.method === "GET") {
    const orderId = new URL(req.url).searchParams.get("orderId");
    if (!orderId) return jsonResponse({ error: "orderId obrigatório." }, 400);
    const { data: order } = await admin
      .from("orders")
      .select("customer_name, nps_score")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return jsonResponse({ error: "Pedido não encontrado." }, 404);
    return jsonResponse({ customerName: order.customer_name, alreadyAnswered: order.nps_score != null });
  }

  try {
    const body = await req.json();
    const orderId = body?.orderId as string | undefined;

    // Second step of the page: after the score was recorded, a customer who gave a low note can tell
    // us what happened. Accepted once, and only for orders whose recorded score asks for it.
    if (body?.action === "feedback") {
      if (!orderId || typeof body?.feedback !== "string") {
        return jsonResponse({ error: "Dados da pesquisa inválidos." }, 400);
      }
      const text = body.feedback.trim().slice(0, FEEDBACK_MAX_LENGTH);
      if (!text) return jsonResponse({ error: "Escreva a sua mensagem antes de enviar." }, 400);
      const { data: saved } = await admin
        .from("orders")
        .update({ nps_feedback: text })
        .eq("id", orderId)
        .lte("nps_score", FEEDBACK_MAX_SCORE)
        .is("nps_feedback", null)
        .select("id")
        .maybeSingle();
      if (!saved) return jsonResponse({ ok: true, alreadySent: true });
      return jsonResponse({ ok: true });
    }

    const score = Number(body?.score);
    const wouldRecommend = body?.wouldRecommend;
    if (!orderId || !Number.isInteger(score) || score < 0 || score > 10 || typeof wouldRecommend !== "boolean") {
      return jsonResponse({ error: "Dados da pesquisa inválidos." }, 400);
    }

    const { data: order } = await admin
      .from("orders")
      .select("id, user_id, customer_name, customer_email, nps_score")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return jsonResponse({ error: "Pedido não encontrado." }, 404);
    if (order.nps_score != null) {
      return jsonResponse({ ok: true, alreadyAnswered: true });
    }

    const feedback =
      score <= FEEDBACK_MAX_SCORE && typeof body?.feedback === "string"
        ? body.feedback.trim().slice(0, FEEDBACK_MAX_LENGTH) || null
        : null;

    await admin
      .from("orders")
      .update({ nps_score: score, nps_would_recommend: wouldRecommend, nps_feedback: feedback })
      .eq("id", orderId);

    const promoter = score >= PROMOTER_THRESHOLD;
    let referralLink: string | null = null;

    if (order.customer_email) {
      // Referral link shown on the page (and in Minha Conta) — only for customers who liked the experience.
      // The "obrigado" e-mail that used to carry it was discontinued: the page itself says thanks.
      if (promoter) {
        const customerUserId =
          order.user_id ?? (await getOrCreateCustomerUserId(admin, order.customer_email, order.customer_name));
        const referralCode = customerUserId ? await getOrCreateReferralCode(admin, customerUserId) : null;
        if (referralCode) referralLink = `${SITE_URL}/loja?ref=${referralCode}`;
      }

      // Marketing list: notes 0-3 stay out, 4-10 join (unless the person opted out before). The campaign
      // e-mail (send-weekly-marketing) goes to everyone on the list every 20 days.
      if (score >= MARKETING_MIN_SCORE) {
        const [{ data: existingSubscriber }, { data: suppressed }] = await Promise.all([
          admin.from("marketing_subscribers").select("email").eq("email", order.customer_email).maybeSingle(),
          admin.from("email_suppressions").select("email").ilike("email", order.customer_email).maybeSingle(),
        ]);
        if (!existingSubscriber && !suppressed) {
          await admin.from("marketing_subscribers").insert({
            email: order.customer_email,
            name: order.customer_name,
            source: "nps_promoter",
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
