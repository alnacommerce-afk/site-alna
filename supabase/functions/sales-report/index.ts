// Public URL, protected by an API key (verify_jwt: false). Called by FinMarket HUB — never by our own
// frontend. Read-only: returns orders with gross value, coupon discount, shipping charged, the label price paid,
// the payment method/fees, each item's SKU and the pricing numbers (cost, tax, margin...) the sale was made with.
// The key is stored in Vault (Admin > Conexões de API, id "finmarket_hub_api"); FinMarket HUB sends
// the same value in the `x-api-key` header. No customer personal data is ever returned.
//
// Query parameters (all optional):
//   from / to          ISO dates (created_at >= from, < to)
//   status             comma list of paid,shipped,completed,cancelled,refunded,pending — or "all" (everything except pending).
//                      Default: paid,shipped,completed. Any other value -> 400.
//   offset / limit     paging; limit is capped at 100
//   include_gateway=1  also asks Asaas for the real fee/net of orders that don't have them saved yet (slower).
// The gateway_* keys are ALWAYS present: null when there is nothing saved (and include_gateway is not 1).
// Pricing numbers come from the snapshot taken at checkout (order_item_pricing / order_payment_snapshot, admin-only tables);
// if an item has no snapshot, today's values of the variation are used and pricing_estimated = true.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-api-key, content-type",
};

const ASAAS_API = "https://api.asaas.com/v3";
const MAX_PAGE_SIZE = 100;
const ASAAS_CONCURRENCY = 5;

const DEFAULT_STATUSES = ["paid", "shipped", "completed"];
const ALL_STATUSES = ["paid", "shipped", "completed", "cancelled", "refunded"]; // "all" = these (not pending)
const VALID_STATUSES = new Set([...ALL_STATUSES, "pending"]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

const toCents = (reais: unknown): number => Math.round(Number(reais ?? 0) * 100);
const num = (value: unknown): number | null => (value == null ? null : Number(value));

/** null = invalid value (-> 400). */
function parseStatuses(raw: string | null): string[] | null {
  if (raw === null || raw.trim() === "") return DEFAULT_STATUSES;
  const parts = raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (parts.length === 0) return null;
  const result = new Set<string>();
  for (const part of parts) {
    if (part === "all") ALL_STATUSES.forEach((s) => result.add(s));
    else if (VALID_STATUSES.has(part)) result.add(part);
    else return null;
  }
  return [...result];
}

type GatewayAmounts = { grossCents: number; netCents: number; feeCents: number };

// Asaas fees are charged per installment, so an installment sale must be summed across all of its
// payments. `payment_id` on the order is the FIRST installment's id.
async function fetchGatewayAmounts(
  paymentId: string,
  headers: Record<string, string>,
): Promise<GatewayAmounts | null> {
  const resp = await fetch(`${ASAAS_API}/payments/${paymentId}`, { headers });
  if (!resp.ok) return null;
  const payment = await resp.json();

  let payments: Array<{ value?: number; netValue?: number }> = [payment];
  if (payment.installment) {
    const listResp = await fetch(
      `${ASAAS_API}/payments?installment=${payment.installment}&limit=100`,
      { headers },
    );
    if (listResp.ok) {
      const list = await listResp.json();
      if (Array.isArray(list?.data) && list.data.length > 0) payments = list.data;
    }
  }

  // Asaas leaves netValue empty until the charge is confirmed — treat that as "not available yet".
  if (payments.some((p) => p.netValue == null)) return null;
  const grossCents = payments.reduce((sum, p) => sum + toCents(p.value), 0);
  const netCents = payments.reduce((sum, p) => sum + toCents(p.netValue), 0);
  return { grossCents, netCents, feeCents: grossCents - netCents };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

type PricingNumbers = {
  cost_total_cents: number | null;
  tax_rate_pct: number | null;
  card_fee_pct: number | null;
  margin_pct: number | null;
  coupon_avg_pct: number | null;
  shipping_cost_pct: number | null;
  discount_pct: number | null;
  compare_at_price_cents: number | null;
};

function pricingFromVariant(v: Record<string, unknown> | undefined): PricingNumbers {
  if (!v) {
    return {
      cost_total_cents: null,
      tax_rate_pct: null,
      card_fee_pct: null,
      margin_pct: null,
      coupon_avg_pct: null,
      shipping_cost_pct: null,
      discount_pct: null,
      compare_at_price_cents: null,
    };
  }
  const cost = num(v.cost_cents);
  return {
    cost_total_cents: cost == null ? null : cost + (num(v.extra_cost_cents) ?? 0) + (num(v.freight_cost_cents) ?? 0),
    tax_rate_pct: num(v.tax_rate_pct),
    card_fee_pct: num(v.card_fee_pct),
    margin_pct: num(v.margin_pct),
    coupon_avg_pct: num(v.coupon_avg_pct),
    shipping_cost_pct: num(v.shipping_cost_pct),
    discount_pct: num(v.discount_pct),
    compare_at_price_cents: num(v.compare_at_price_cents),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return jsonResponse({ error: "Método não permitido." }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const { data: expectedKey } = await admin.rpc("get_integration_secret", {
      p_integration_id: "finmarket_hub_api",
    });
    const receivedKey = req.headers.get("x-api-key") ?? "";
    if (!expectedKey || !timingSafeEqual(receivedKey, expectedKey as string)) {
      return jsonResponse({ error: "Chave de API inválida." }, 401);
    }

    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const statuses = parseStatuses(url.searchParams.get("status"));
    const includeGateway = url.searchParams.get("include_gateway") === "1";
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(url.searchParams.get("limit") ?? MAX_PAGE_SIZE) || MAX_PAGE_SIZE),
    );
    if (!statuses) {
      return jsonResponse(
        {
          error:
            "status deve ser paid, shipped, completed, cancelled, refunded ou pending (um ou mais, separados por vírgula), ou all.",
        },
        400,
      );
    }
    for (const [name, value] of [["from", from], ["to", to]] as const) {
      if (value && Number.isNaN(Date.parse(value))) {
        return jsonResponse({ error: `${name} deve ser uma data ISO válida.` }, 400);
      }
    }

    let query = admin
      .from("orders")
      .select(
        "id, created_at, updated_at, status, payment_id, payment_method, payment_status, installment_count, subtotal_cents, discount_cents, coupon_code, shipping_cost_cents, total_cents, label_price_cents, order_items(id, product_variant_id, product_title, variant_name, sku, quantity, unit_price_cents)",
        { count: "exact" },
      )
      .in("status", statuses)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lt("created_at", to);

    const { data: orders, error, count } = await query;
    if (error) throw error;
    const rows = orders ?? [];
    const orderIds = rows.map((o) => o.id);

    // Snapshots taken at checkout (admin-only tables, read here with the service key).
    const [{ data: itemPricingRows }, { data: paymentRows }] = orderIds.length
      ? await Promise.all([
          admin.from("order_item_pricing").select("*").in("order_id", orderIds),
          admin.from("order_payment_snapshot").select("*").in("order_id", orderIds),
        ])
      : [{ data: [] }, { data: [] }];
    const itemPricing = new Map((itemPricingRows ?? []).map((r) => [r.order_item_id as string, r]));
    const paymentSnapshot = new Map((paymentRows ?? []).map((r) => [r.order_id as string, r]));

    // Items without a snapshot fall back to today's values of the variation (flagged pricing_estimated).
    const missingVariantIds = [
      ...new Set(
        rows.flatMap((o) =>
          (o.order_items ?? [])
            .filter((i) => !itemPricing.has(i.id as string) && i.product_variant_id)
            .map((i) => i.product_variant_id as string),
        ),
      ),
    ];
    const variantById = new Map<string, Record<string, unknown>>();
    if (missingVariantIds.length) {
      const { data: variants } = await admin
        .from("product_variants")
        .select(
          "id, cost_cents, extra_cost_cents, freight_cost_cents, tax_rate_pct, card_fee_pct, margin_pct, coupon_avg_pct, shipping_cost_pct, discount_pct, compare_at_price_cents",
        )
        .in("id", missingVariantIds);
      for (const v of variants ?? []) variantById.set(v.id as string, v);
    }

    // Personal (random, per-customer) coupon codes identify a customer indirectly: only the NAME of the model coupon
    // is returned for them (e.g. BOAS_VINDAS, CARRINHO_ABANDONADO); normal coupons keep their code.
    const codes = [
      ...new Set(
        rows.flatMap((o) => (o.coupon_code ? String(o.coupon_code).split(",").map((c) => c.trim()).filter(Boolean) : [])),
      ),
    ];
    const couponByCode = new Map<string, { personal_for_email: string | null; source_coupon_id: string | null }>();
    const modelNameById = new Map<string, string>();
    if (codes.length) {
      const { data: couponRows } = await admin
        .from("coupons")
        .select("code, personal_for_email, source_coupon_id")
        .in("code", codes);
      for (const c of couponRows ?? []) couponByCode.set(c.code as string, c);
      const modelIds = [...new Set((couponRows ?? []).map((c) => c.source_coupon_id).filter(Boolean))] as string[];
      if (modelIds.length) {
        const { data: models } = await admin.from("coupons").select("id, code").in("id", modelIds);
        for (const m of models ?? []) modelNameById.set(m.id as string, m.code as string);
      }
    }
    const publicCouponCode = (raw: string | null): string | null => {
      if (!raw) return raw;
      return String(raw)
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
        .map((code) => {
          const coupon = couponByCode.get(code);
          if (!coupon?.personal_for_email) return code; // normal coupon (or unknown legacy code)
          return (coupon.source_coupon_id && modelNameById.get(coupon.source_coupon_id)) || "PESSOAL";
        })
        .join(",");
    };

    // Gateway numbers: saved on the order when Asaas confirmed the payment (order_payment_snapshot); Asaas is only called
    // for the rest, and only when include_gateway=1.
    const savedGateway = rows.map((order) => {
      const snap = paymentSnapshot.get(order.id);
      if (snap && snap.gateway_fee_cents != null && snap.net_received_cents != null) {
        return {
          feeCents: Number(snap.gateway_fee_cents),
          netCents: Number(snap.net_received_cents),
          grossCents: Number(snap.gateway_fee_cents) + Number(snap.net_received_cents),
        } as GatewayAmounts;
      }
      return null;
    });
    let gateway: (GatewayAmounts | null)[] = savedGateway;
    if (includeGateway) {
      const asaasKey = await admin
        .rpc("get_integration_secret", { p_integration_id: "payment_gateway" })
        .then((r) => r.data as string | null);
      const asaasHeaders = asaasKey ? { access_token: asaasKey, "User-Agent": "ALNA (noreply@alna.sale)" } : null;
      gateway = await mapWithConcurrency(rows, ASAAS_CONCURRENCY, async (order) => {
        const index = rows.indexOf(order);
        if (savedGateway[index]) return savedGateway[index];
        if (!asaasHeaders || !order.payment_id) return null;
        try {
          return await fetchGatewayAmounts(order.payment_id, asaasHeaders);
        } catch (e) {
          console.error("[sales-report] asaas", order.id, e);
          return null;
        }
      });
    }

    const data = rows.map((order, i) => {
      const shippingCents = order.shipping_cost_cents ?? 0;
      const baseTotalCents = order.subtotal_cents - order.discount_cents + shippingCents;
      const adjustmentCents = order.total_cents - baseTotalCents;
      const g = gateway[i];
      const pay = paymentSnapshot.get(order.id);
      return {
        order_id: order.id,
        created_at: order.created_at,
        status: order.status,
        payment_method: order.payment_method,
        installment_count: order.installment_count,
        // Product value before any discount.
        items_subtotal_cents: order.subtotal_cents,
        coupon_code: publicCouponCode(order.coupon_code),
        coupon_discount_cents: order.discount_cents,
        // Freight actually charged to the customer (0 when free shipping applied).
        shipping_charged_cents: shippingCents,
        // What the Melhor Envio wallet was charged for the label (null until the label is generated).
        label_price_cents: order.label_price_cents ?? null,
        // Pix: the customer's own discount. Card: the fee surcharge grossed up into the price.
        pix_discount_cents: adjustmentCents < 0 ? -adjustmentCents : 0,
        card_surcharge_cents: adjustmentCents > 0 ? adjustmentCents : 0,
        // The rule used at checkout (percent, e.g. 4 = 4%); null when it does not apply or is unknown.
        pix_discount_pct: num(pay?.pix_discount_pct),
        card_fee_pct: num(pay?.card_fee_pct),
        card_fee_fixed_cents: num(pay?.card_fee_fixed_cents),
        // What the customer paid in total.
        gross_total_cents: order.total_cents,
        // Real Asaas numbers (saved at confirmation, or fetched with include_gateway=1); null when not available.
        gateway_fee_cents: g ? g.feeCents : null,
        net_received_cents: g ? g.netCents : null,
        gateway_data_available: !!g,
        items: (order.order_items ?? []).map((item) => {
          const snap = itemPricing.get(item.id as string);
          const numbers: PricingNumbers = snap
            ? {
                cost_total_cents: num(snap.cost_total_cents),
                tax_rate_pct: num(snap.tax_rate_pct),
                card_fee_pct: num(snap.card_fee_pct),
                margin_pct: num(snap.margin_pct),
                coupon_avg_pct: num(snap.coupon_avg_pct),
                shipping_cost_pct: num(snap.shipping_cost_pct),
                discount_pct: num(snap.discount_pct),
                compare_at_price_cents: num(snap.compare_at_price_cents),
              }
            : pricingFromVariant(item.product_variant_id ? variantById.get(item.product_variant_id as string) : undefined);
          return {
            sku: item.sku,
            title: item.product_title,
            variant: item.variant_name,
            quantity: item.quantity,
            unit_price_cents: item.unit_price_cents,
            ...numbers,
            // true = today's values (or a backfill), not the ones in force on the sale date.
            pricing_estimated: snap ? !!snap.pricing_estimated : true,
          };
        }),
      };
    });

    return jsonResponse({
      data,
      pagination: {
        offset,
        limit,
        total: count ?? null,
        has_more: count != null ? offset + rows.length < count : rows.length === limit,
      },
    });
  } catch (error) {
    console.error("[sales-report]", error);
    const message = error instanceof Error ? error.message : "Erro ao gerar relatório.";
    return jsonResponse({ error: message }, 500);
  }
});
