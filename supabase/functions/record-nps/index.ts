// Public. One-click NPS scoring link target from post_purchase_nps e-mails. Trusts the order UUID
// the same way get-order-status/unsubscribe-email do. First click wins — the score can't be
// overwritten by clicking a different link or reopening the e-mail later.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { renderEmailTemplate, resolveTemplateCoupon } from "../_shared/render-template.ts";

const PROMOTER_THRESHOLD = 5;

function htmlResponse(message: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
      <title>Alna Commerce</title>
      <style>body{font-family:Arial,sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#12294f;}</style>
     </head><body><h1>Alna Commerce</h1><p>${message}</p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");
    const scoreStr = url.searchParams.get("score");
    const score = scoreStr ? Number(scoreStr) : NaN;
    if (!orderId || !Number.isInteger(score) || score < 0 || score > 10) {
      return htmlResponse("Link inválido.", 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: order } = await admin
      .from("orders")
      .select("id, customer_name, customer_email, nps_score")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return htmlResponse("Pedido não encontrado.", 404);
    if (order.nps_score != null) {
      return htmlResponse("Você já enviou sua nota — obrigado por participar!");
    }

    await admin.from("orders").update({ nps_score: score }).eq("id", orderId);

    if (order.customer_email) {
      const resendKey = await admin
        .rpc("get_integration_secret", { p_integration_id: "resend" })
        .then((r) => r.data as string | null);
      const coupon = await resolveTemplateCoupon(admin, "nps_thank_you");
      const rendered = await renderEmailTemplate(admin, "nps_thank_you", {
        nome: order.customer_name ?? "cliente",
        cupom_codigo: coupon?.code ?? "",
      });
      if (rendered) {
        await sendEmail(resendKey, { to: order.customer_email, subject: rendered.subject, html: rendered.html });
      }

      if (score >= PROMOTER_THRESHOLD) {
        await admin.from("marketing_subscribers").upsert({
          email: order.customer_email,
          name: order.customer_name,
          source: "nps_promoter",
        });
      }
    }

    return htmlResponse(`Nota ${score} registrada — muito obrigado pelo seu feedback! 🎁`);
  } catch (error) {
    console.error("[record-nps]", error);
    return htmlResponse("Erro ao registrar sua nota.", 500);
  }
});
