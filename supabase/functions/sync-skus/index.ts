// Called by the daily pg_cron job (and by the "Sincronizar custos" button in Admin >
// Precificação). Public like the other scheduled functions — it doesn't trust any caller input,
// it only pulls from the FinMarket HUB using the server-stored secret and writes cost/price on
// product_variants via the service role. It never creates products or variants, and never
// touches name, SKU or stock.
//
// Contract with FinMarket HUB (see alnacommerce-afk/finmarket-hub-supabase,
// src/routes/api/public/v1/skus.ts): GET {base_url}/api/public/v1/skus with header `x-api-key`
// (or `Authorization: Bearer`), paginated via `limit`/`offset` (up to 500 per page), returning
// { data: [{ sku, cost_cents, extra_cost_cents, ... }], total }. `base_url` lives in
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

type RemoteSku = {
  sku?: string;
  cost_cents?: number | null;
  extra_cost_cents?: number | null;
  freight_cost_cents?: number | null;
};

const isCents = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

// Mesma fórmula da tela Precificação: Preço = Custo ÷ [1 − (imposto% + cartão% + margem%)], e
// preço "de" (vitrine) = Preço ÷ (1 − desconto%). Mantida aqui também para que o preço fique
// correto mesmo quando ninguém está com a tela aberta no momento da sincronização diária.
// Custo = compra + extra + frete — os 3 valores que o FinMarket HUB reporta por SKU.
function calculatePriceCents(
  custoTotalCents: number,
  taxRatePct: number,
  cardFeePct: number,
  marginPct: number,
): number | null {
  const denom = 1 - (taxRatePct + cardFeePct + marginPct) / 100;
  return denom > 0 ? Math.round(custoTotalCents / denom) : null;
}

function calculateCompareAtPriceCents(priceCents: number, discountPct: number): number | null {
  return discountPct > 0 && discountPct < 100
    ? Math.round(priceCents / (1 - discountPct / 100))
    : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
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
      return jsonResponse(
        { error: "FinMarket HUB não configurado (endereço ou chave ausente)." },
        503,
      );
    }
    if (!baseUrl.startsWith("https://")) {
      return jsonResponse(
        { error: "O endereço do FinMarket HUB precisa começar com https://." },
        503,
      );
    }

    const PAGE_SIZE = 500;
    const remote: RemoteSku[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const resp = await fetch(
        `${baseUrl}/api/public/v1/skus?limit=${PAGE_SIZE}&offset=${offset}`,
        { headers: { "x-api-key": apiKey, Accept: "application/json" } },
      );
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`FinMarket HUB skus ${resp.status}: ${errText.slice(0, 300)}`);
      }
      const page = (await resp.json()) as { data?: RemoteSku[] };
      const rows = page.data ?? [];
      remote.push(...rows);
      if (rows.length < PAGE_SIZE) break;
    }

    const { data: variants, error: variantsError } = await admin
      .from("product_variants")
      .select("id, sku, tax_rate_pct, card_fee_pct, margin_pct, discount_pct");
    if (variantsError) throw variantsError;
    const variantsBySku = new Map<string, typeof variants>();
    for (const v of variants ?? []) {
      variantsBySku.set(v.sku, [...(variantsBySku.get(v.sku) ?? []), v]);
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
      const matches = variantsBySku.get(item.sku);
      if (!matches || matches.length === 0) {
        unmatched.push(item.sku);
        continue;
      }
      const costCents = item.cost_cents;
      const extraCostCents = isCents(item.extra_cost_cents) ? item.extra_cost_cents : 0;
      const freightCostCents = isCents(item.freight_cost_cents) ? item.freight_cost_cents : 0;
      const custoTotalCents = costCents + extraCostCents + freightCostCents;

      for (const variant of matches) {
        const priceCents = calculatePriceCents(
          custoTotalCents,
          variant.tax_rate_pct,
          variant.card_fee_pct,
          variant.margin_pct,
        );
        const { error } = await admin
          .from("product_variants")
          .update({
            cost_cents: costCents,
            extra_cost_cents: extraCostCents,
            freight_cost_cents: freightCostCents,
            cost_synced_at: now,
            ...(priceCents != null
              ? {
                  price_cents: priceCents,
                  compare_at_price_cents: calculateCompareAtPriceCents(
                    priceCents,
                    variant.discount_pct,
                  ),
                }
              : {}),
          })
          .eq("id", variant.id);
        if (error) throw error;
        updated++;
      }
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
