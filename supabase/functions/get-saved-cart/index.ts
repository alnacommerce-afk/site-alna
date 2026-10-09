// Public. The "Voltar ao meu carrinho" button of the reminder e-mails opens /carrinho?c=<token>; the cart page
// calls this to rebuild the cart. The token is unguessable (it only travels in the e-mail sent to the shopper).
// Returns what can still be bought today with today's price and stock, plus the e-mail masked — never the
// full address or the phone.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { loadLiveCartLines, sanitizeCartLines } from "../_shared/cart-items.ts";

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

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "";
  return `${user.slice(0, 1)}${"*".repeat(Math.max(2, Math.min(user.length - 1, 6)))}@${domain}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const token = new URL(req.url).searchParams.get("token")?.trim() ?? "";
    if (!/^[0-9a-f]{32}$/i.test(token)) return jsonResponse({ error: "Link inválido." }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: cart } = await admin
      .from("abandoned_carts")
      .select("email, items")
      .eq("token", token)
      .maybeSingle();
    if (!cart) return jsonResponse({ error: "Carrinho não encontrado." }, 404);

    const saved = sanitizeCartLines(cart.items);
    const live = await loadLiveCartLines(admin, saved);
    return jsonResponse({
      items: live,
      unavailable: saved.length - live.length,
      emailMasked: maskEmail(cart.email),
    });
  } catch (error) {
    console.error("[get-saved-cart]", error);
    return jsonResponse({ error: "Não foi possível abrir o carrinho agora." }, 500);
  }
});
