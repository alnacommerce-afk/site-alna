// Public. One-click unsubscribe link target from marketing/cart-recovery e-mails. Accepts either
// `orderId` (trusted the same way get-order-status does — unguessable, only reveals which e-mail
// to suppress) or a direct `email` (used by the weekly marketing list, which isn't order-scoped).
// Never touches transactional e-mails (order received / payment confirmed / NPS thank-you), only
// the cart-recovery and weekly marketing sends.
import { createClient } from "jsr:@supabase/supabase-js@2";

function htmlResponse(message: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
      <title>ALNA</title>
      <style>body{font-family:Arial,sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#12294f;}</style>
     </head><body><h1>ALNA</h1><p>${message}</p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");
    const emailParam = url.searchParams.get("email");
    if (!orderId && !emailParam) return htmlResponse("Link inválido.", 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceRoleKey);

    let email = emailParam;
    if (!email && orderId) {
      const { data: order } = await admin
        .from("orders")
        .select("customer_email")
        .eq("id", orderId)
        .maybeSingle();
      email = order?.customer_email ?? null;
    }
    if (!email) return htmlResponse("Pedido não encontrado.", 404);

    await admin
      .from("email_suppressions")
      .upsert({ email, unsubscribed_at: new Date().toISOString() });

    return htmlResponse(
      "Você não vai mais receber nossos e-mails de carrinho abandonado e promoções. Você continuará recebendo apenas os e-mails essenciais sobre pedidos que você mesmo fizer.",
    );
  } catch (error) {
    console.error("[unsubscribe-email]", error);
    return htmlResponse("Erro ao processar seu pedido de descadastro.", 500);
  }
});
