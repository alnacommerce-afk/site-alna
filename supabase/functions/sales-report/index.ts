// Public URL, protected by an API key (verify_jwt: false). Called by FinMarket HUB — never by our own
// frontend. Read-only: returns paid orders with gross value, coupon discount, shipping charged,
// the REAL gateway fee and net value taken from Asaas, and each item's SKU.
// The key is stored in Vault (Admin > Conexões de API, id "finmarket_hub_api"); FinMarket HUB sends
// the same value in the `x-api-key` header.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-api-key, content-type",
};

const ASAAS_API = "https://api.asaas.com/v3";
const MAX_PAGE_SIZE = 100;
const ASAAS_CONCURRENCY = 5;

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
    const status = url.searchParams.get("status") ?? "paid";
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(url.searchParams.get("limit") ?? MAX_PAGE_SIZE) || MAX_PAGE_SIZE),
    );
    if (!["paid", "pending", "cancelled"].includes(status)) {
      return jsonResponse({ error: "status deve ser paid, pending ou cancelled." }, 400);
    }
    for (const [name, value] of [["from", from], ["to", to]] as const) {
      if (value && Number.isNaN(Date.parse(value))) {
        return jsonResponse({ error: `${name} deve ser uma data ISO válida.` }, 400);
      }
    }

    let query = admin
      .from("orders")
      .select(
        "id, created_at, updated_at, status, payment_id, payment_method, payment_status, installment_count, subtotal_cents, discount_cents, coupon_code, shipping_cost_cents, total_cents, order_items(product_title, variant_name, sku, quantity, unit_price_cents)",
        { count: "exact" },
      )
      .eq("status", status)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lt("created_at", to);

    const { data: orders, error, count } = await query;
    if (error) throw error;

    const asaasKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "payment_gateway" })
      .then((r) => r.data as string | null);
    const asaasHeaders = asaasKey
      ? { access_token: asaasKey, "User-Agent": "Alna Commerce (contato@alna.cc)" }
      : null;

    const rows = orders ?? [];
    const gateway = await mapWithConcurrency(rows, ASAAS_CONCURRENCY, async (order) => {
      if (!asaasHeaders || !order.payment_id) return null;
      try {
        return await fetchGatewayAmounts(order.payment_id, asaasHeaders);
      } catch (e) {
        console.error("[sales-report] asaas", order.id, e);
        return null;
      }
    });

    const data = rows.map((order, i) => {
      const shippingCents = order.shipping_cost_cents ?? 0;
      const baseTotalCents = order.subtotal_cents - order.discount_cents + shippingCents;
      const adjustmentCents = order.total_cents - baseTotalCents;
      const g = gateway[i];
      return {
        order_id: order.id,
        created_at: order.created_at,
        status: order.status,
        payment_method: order.payment_method,
        installment_count: order.installment_count,
        // Product value before any discount.
        items_subtotal_cents: order.subtotal_cents,
        coupon_code: order.coupon_code,
        coupon_discount_cents: order.discount_cents,
        // Freight actually charged to the customer (0 when free shipping applied).
        shipping_charged_cents: shippingCents,
        // Pix: the customer's own discount. Card: the fee surcharge grossed up into the price.
        pix_discount_cents: adjustmentCents < 0 ? -adjustmentCents : 0,
        card_surcharge_cents: adjustmentCents > 0 ? adjustmentCents : 0,
        // What the customer paid in total.
        gross_total_cents: order.total_cents,
        // Real Asaas numbers; null while the charge isn't confirmed or Asaas can't be reached.
        gateway_fee_cents: g ? g.feeCents : null,
        net_received_cents: g ? g.netCents : null,
        gateway_data_available: !!g,
        items: (order.order_items ?? []).map((item) => ({
          sku: item.sku,
          title: item.product_title,
          variant: item.variant_name,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
        })),
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
