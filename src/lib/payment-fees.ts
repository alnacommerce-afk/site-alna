// Espelha as taxas do checkout (supabase/functions/checkout-create) para mostrar ao cliente o total certo
// antes de confirmar. As taxas vêm da API da Asaas (função `asaas-fees`); enquanto não chegam, usa os
// valores de contingência abaixo. O servidor é quem cobra de verdade: mantenha os dois alinhados.
import { supabase } from "@/integrations/supabase/client";

// Desconto do Pix: a loja subsidia os 4%, aplicado só sobre os produtos (depois dos cupons).
export const PIX_DISCOUNT = 0.04;

export type FeeTier = { max: number; pct: number };
type FeeRates = { tiers: FeeTier[]; cardFixedCents: number; pixFixedCents: number };

// Contingência: promoção vigente conhecida. Só vale se a API não responder.
let rates: FeeRates = {
  tiers: [
    { max: 1, pct: 0.0199 },
    { max: 6, pct: 0.0249 },
    { max: 12, pct: 0.0299 },
  ],
  cardFixedCents: 49,
  pixFixedCents: 99,
};

/** Carrega as taxas vigentes da conta pela API. Se falhar, mantém a contingência. */
export async function loadAccountRates(): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke("asaas-fees", { method: "GET" });
    if (error || !data || data.source !== "api") return;
    rates = {
      tiers: data.card.tiers as FeeTier[],
      cardFixedCents: Number(data.card.fixedCents),
      pixFixedCents: Number(data.pix.fixedCents),
    };
  } catch {
    // mantém a contingência
  }
}

/** Pix: produtos com o desconto de 4% (loja subsidia) + frete integral + taxa fixa do Pix (cliente paga). */
export function pixTotalCents(productsAfterCouponCents: number, shippingCents: number): number {
  return Math.round(productsAfterCouponCents * (1 - PIX_DISCOUNT)) + shippingCents + rates.pixFixedCents;
}

export function cardFeePercentFor(installmentCount: number): number {
  const tier = rates.tiers.find((t) => installmentCount <= t.max);
  return (tier ?? rates.tiers[rates.tiers.length - 1])!.pct;
}

/** Total do cartão para que a loja receba exatamente `baseCents` depois da taxa da Asaas. */
export function grossUpForCardFee(baseCents: number, installmentCount: number): number {
  const pct = cardFeePercentFor(installmentCount);
  return Math.round((baseCents + rates.cardFixedCents) / (1 - pct));
}
