// Public. The `orders` table is admin-only via RLS, so the order confirmation page uses this
// function (service role) to read back just the safe, minimal fields for one order by id.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ASAAS_API = "https://api.asaas.com/v3";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");
    if (!orderId) return jsonResponse({ error: "orderId obrigatório." }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error } = await admin
      .from("orders")
      .select(
        "id, status, payment_status, payment_method, payment_id, total_cents, subtotal_cents, shipping_cost_cents, installment_count, created_at",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) return jsonResponse({ error: "Pedido não encontrado." }, 404);

    let pix: { encodedImage: string; payload: string; expirationDate: string } | null = null;
    if (order.payment_method === "pix" && order.status === "pending" && order.payment_id) {
      const asaasKey = await admin
        .rpc("get_integration_secret", { p_integration_id: "payment_gateway" })
        .then((r) => r.data as string | null);
      if (asaasKey) {
        const qrResp = await fetch(`${ASAAS_API}/payments/${order.payment_id}/pixQrCode`, {
          headers: { access_token: asaasKey },
        });
        if (qrResp.ok) pix = await qrResp.json();
      }
    }

    return jsonResponse({ order, pix });
  } catch (error) {
    console.error("[get-order-status]", error);
    const message = error instanceof Error ? error.message : "Erro ao consultar o pedido.";
    return jsonResponse({ error: message }, 500);
  }
});
