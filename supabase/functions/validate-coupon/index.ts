// Public. Gives the cart page immediate feedback on a coupon code. This is a PREVIEW only —
// checkout-create always re-validates and applies the discount server-side, never trusting this.
import { createClient } from "jsr:@supabase/supabase-js@2";

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

  try {
    const { code } = (await req.json()) as { code?: string };
    if (!code) return jsonResponse({ valid: false, error: "Informe um código." }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: coupon } = await admin
      .from("coupons")
      .select("code, discount_percent, valid_from, valid_until, active")
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();

    const now = new Date();
    const withinWindow =
      coupon?.active &&
      (!coupon.valid_from || new Date(coupon.valid_from) <= now) &&
      (!coupon.valid_until || new Date(coupon.valid_until) >= now);

    if (!withinWindow) {
      return jsonResponse({ valid: false, error: "Cupom inválido ou expirado." });
    }

    return jsonResponse({ valid: true, code: coupon.code, discountPercent: Number(coupon.discount_percent) });
  } catch (error) {
    console.error("[validate-coupon]", error);
    return jsonResponse({ valid: false, error: "Erro ao validar cupom." }, 500);
  }
});
