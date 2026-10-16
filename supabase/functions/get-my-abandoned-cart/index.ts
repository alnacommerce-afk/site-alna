// Logado. Devolve o carrinho salvo do PRÓPRIO e-mail da conta (aberto e dos últimos 90 dias), com o preço e o
// estoque de hoje. Não aceita e-mail nem id vindos do cliente: a identidade vem só do login (JWT).
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

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    const email = userData?.user?.email?.trim().toLowerCase();
    if (userError || !email) return jsonResponse({ error: "Não autenticado." }, 401);

    // Mesma regra do carrinho salvo: e-mail em minúsculas; carrinho já comprado (recovered_at) ou encerrado
    // (stopped_at) não aparece; carrinho parado há mais de 90 dias também não.
    const since = new Date(Date.now() - NINETY_DAYS_MS).toISOString();
    const { data: cart, error } = await admin
      .from("abandoned_carts")
      .select("items, last_activity_at")
      .eq("email", email)
      .is("recovered_at", null)
      .is("stopped_at", null)
      .gte("last_activity_at", since)
      .order("last_activity_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!cart) return jsonResponse({ items: [], unavailable: 0, lastActivityAt: null });

    const saved = sanitizeCartLines(cart.items);
    const live = await loadLiveCartLines(admin, saved);
    return jsonResponse({
      items: live.map((line) => ({
        variantId: line.variantId,
        quantity: line.quantity,
        productSlug: line.productSlug,
        productTitle: line.productTitle,
        variantName: line.variantName,
        thumbnailUrl: line.thumbnailUrl,
        priceCents: line.priceCents,
        maxQuantity: line.maxQuantity,
      })),
      unavailable: saved.length - live.length,
      lastActivityAt: cart.last_activity_at,
    });
  } catch (error) {
    console.error("[get-my-abandoned-cart]", error);
    const message = error instanceof Error ? error.message : "Erro ao carregar o carrinho salvo.";
    return jsonResponse({ error: message }, 500);
  }
});
