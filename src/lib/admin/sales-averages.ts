import { supabase } from "@/integrations/supabase/client";

// Same notion of "a real sale" used everywhere in the admin: only orders that were actually paid.
export const PAID_STATUSES = ["paid", "shipped", "completed"] as const;

export function sinceDays(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export type SalesAverages = {
  paidOrders: number;
  ordersWithCoupon: number;
  grossCents: number;
  couponCents: number;
  /** Desconto de cupom ÷ valor vendido antes do cupom, em %. */
  couponPct: number;
  /** Valor vendido em produtos, já descontado o cupom e SEM o frete que o cliente pagou. */
  revenueCents: number;
  labelCents: number;
  ordersWithoutLabel: number;
  /** Gasto com etiquetas ÷ valor vendido em produtos, em %. */
  shippingPct: number;
};

// "Etiqueta" é gasto da loja só quando o frete NÃO foi cobrado do cliente (shipping_cost_cents = 0,
// compras acima do frete grátis). Quando o cliente pagou o frete, o custo da etiqueta é repassado.
// O que o cliente pagou pelos produtos: valor dos itens menos o cupom. O frete cobrado dele fica de fora
// porque esse dinheiro é da etiqueta, não da loja.
export function productsPaidCents(order: { subtotal_cents: number; discount_cents: number }) {
  return Math.max(0, order.subtotal_cents - order.discount_cents);
}

export function isShippingPaidByStore(order: { shipping_cost_cents: number | null }) {
  return !order.shipping_cost_cents || order.shipping_cost_cents <= 0;
}

export async function loadSalesAverages(days: number): Promise<SalesAverages> {
  const { data } = await supabase
    .from("orders")
    .select(
      "subtotal_cents, discount_cents, total_cents, label_price_cents, shipping_cost_cents, coupon_code",
    )
    .in("status", [...PAID_STATUSES])
    .gte("created_at", sinceDays(days));

  let grossCents = 0;
  let couponCents = 0;
  let revenueCents = 0;
  let labelCents = 0;
  let ordersWithCoupon = 0;
  let ordersWithoutLabel = 0;
  for (const order of data ?? []) {
    grossCents += order.subtotal_cents;
    couponCents += order.discount_cents;
    revenueCents += productsPaidCents(order);
    if (order.coupon_code) ordersWithCoupon++;
    if (isShippingPaidByStore(order)) {
      if (order.label_price_cents == null) ordersWithoutLabel++;
      else labelCents += order.label_price_cents;
    }
  }

  return {
    paidOrders: (data ?? []).length,
    ordersWithCoupon,
    grossCents,
    couponCents,
    couponPct: grossCents > 0 ? (couponCents / grossCents) * 100 : 0,
    revenueCents,
    labelCents,
    ordersWithoutLabel,
    shippingPct: revenueCents > 0 ? (labelCents / revenueCents) * 100 : 0,
  };
}
