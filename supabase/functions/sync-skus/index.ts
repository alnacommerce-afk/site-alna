// Admin-only (verify_jwt: true). Pulls SKU costs from FinMarket HUB and stores them on the matching
// product variants. It only UPDATES variants whose SKU already exists here — it never creates
// products or variants, and never touches price or stock.
//
// Contract with FinMarket HUB: GET {base_url}/api/public/skus with header `x-api-key`, returning
// { data: [{ sku, title, cost_cents, extra_cost_cents }] }. `base_url` lives in
// integration_connections.public_config for id "finmarket_hub_skus"; the key is its Vault secret.
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

type RemoteSku = { sku?: string; cost_cents?: number | null; extra_cost_cents?: number | null };

const isCents = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

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
    if (userError || !userData?.user) return jsonResponse({ error: "Não autenticado." }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return jsonResponse({ error: "Acesso restrito a administradores." }, 403);

    const { data: connection } = await admin
      .from("integration_connections")
      .select("public_config")
      .eq("id", "finmarket_hub_skus")
      .maybeSingle();
    const baseUrl = (connection?.public_config as { base_url?: string } | null)?.base_url
      ?.trim()
      .replace(/\/+$/, "");
    const apiKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "finmarket_hub_skus" })
      .then((r) => r.data as string | null);
    if (!baseUrl || !apiKey) {
      return jsonResponse({ error: "FinMarket HUB não configurado (endereço ou chave ausente)." }, 503);
    }
    if (!baseUrl.startsWith("https://")) {
      return jsonResponse({ error: "O endereço do FinMarket HUB precisa começar com https://." }, 503);
    }

    const resp = await fetch(`${baseUrl}/api/public/skus`, {
      headers: { "x-api-key": apiKey, Accept: "application/json" },
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`FinMarket HUB skus ${resp.status}: ${errText.slice(0, 300)}`);
    }
    const remote: RemoteSku[] = (await resp.json())?.data ?? [];

    const { data: variants, error: variantsError } = await admin
      .from("product_variants")
      .select("id, sku");
    if (variantsError) throw variantsError;
    const idsBySku = new Map<string, string[]>();
    for (const v of variants ?? []) {
      idsBySku.set(v.sku, [...(idsBySku.get(v.sku) ?? []), v.id]);
    }

    let updated = 0;
    let skipped = 0;
    const unmatched: string[] = [];
    const now = new Date().toISOString();
    for (const item of remote) {
      if (!item.sku || !isCents(item.cost_cents)) {
        skipped++;
        continue;
      }
      const ids = idsBySku.get(item.sku);
      if (!ids) {
        unmatched.push(item.sku);
        continue;
      }
      const { error } = await admin
        .from("product_variants")
        .update({
          cost_cents: item.cost_cents,
          extra_cost_cents: isCents(item.extra_cost_cents) ? item.extra_cost_cents : 0,
          cost_synced_at: now,
        })
        .in("id", ids);
      if (error) throw error;
      updated += ids.length;
    }

    return jsonResponse({
      updated_variants: updated,
      skipped_invalid: skipped,
      skus_not_found_here: unmatched.length,
      unmatched_sample: unmatched.slice(0, 20),
    });
  } catch (error) {
    console.error("[sync-skus]", error);
    const message = error instanceof Error ? error.message : "Erro ao sincronizar SKUs.";
    return jsonResponse({ error: message }, 500);
  }
});
