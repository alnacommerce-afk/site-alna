// Public. Feeds the "cupom + termômetro" box on the shop, product page and cart: returns the coupon
// the admin marked "Divulgar no site" (Admin > Marketing > Cupons) with how many uses are left.
// Only that one coupon is ever exposed — no code lookup, so nobody can probe for other codes here.
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: coupon } = await admin
      .from("coupons")
      .select("code, discount_percent, min_order_cents, max_uses, uses_count, valid_from, valid_until")
      .eq("show_on_site", true)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const now = new Date();
    const inWindow =
      coupon &&
      (!coupon.valid_from || new Date(coupon.valid_from) <= now) &&
      (!coupon.valid_until || new Date(coupon.valid_until) >= now);
    if (!coupon || !inWindow) return jsonResponse({ coupon: null });

    return jsonResponse({
      coupon: {
        code: coupon.code,
        discountPercent: Number(coupon.discount_percent),
        minOrderCents: Number(coupon.min_order_cents ?? 0),
        maxUses: coupon.max_uses,
        remaining: coupon.max_uses === null ? null : coupon.max_uses - coupon.uses_count,
      },
    });
  } catch (error) {
    console.error("[promoted-coupon]", error);
    return jsonResponse({ coupon: null });
  }
});
