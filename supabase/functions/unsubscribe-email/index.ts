// Public. One-click unsubscribe link target from marketing/cart-recovery e-mails. Trusts the order
// UUID the same way get-order-status does (unguessable, and only reveals which e-mail to suppress —
// nothing sensitive). Never touches transactional e-mails (order received / payment confirmed),
// only the cart-recovery reminders sent by process-cart-reminders.
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    if (!orderId) return htmlResponse("Link inválido.", 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: order } = await admin
      .from("orders")
      .select("customer_email")
      .eq("id", orderId)
      .maybeSingle();
    if (!order?.customer_email) return htmlResponse("Pedido não encontrado.", 404);

    await admin
      .from("email_suppressions")
      .upsert({ email: order.customer_email, unsubscribed_at: new Date().toISOString() });

    return htmlResponse(
      "Você não vai mais receber nossos e-mails de carrinho abandonado e promoções. Você continuará recebendo apenas os e-mails essenciais sobre pedidos que você mesmo fizer.",
    );
  } catch (error) {
    console.error("[unsubscribe-email]", error);
    return htmlResponse("Erro ao processar seu pedido de descadastro.", 500);
  }
});
