// Mirrors the fee table in supabase/functions/checkout-create/index.ts — used here only to show
// the customer an accurate preview total before submitting. The edge function is the source of
// truth that actually charges the card; keep both in sync.
// Asaas "Cobranças online" promotional fees, valid until 14/12/2026 (see Asaas > Minha conta >
// Taxas). TODO revisar antes de 14/12/2026: padrão vira 2,99/3,49/3,99% (mesma taxa fixa).
export const PIX_DISCOUNT = 0.04;

const CARD_FEE_TIERS: { max: number; pct: number }[] = [
  { max: 1, pct: 0.0199 },
  { max: 6, pct: 0.0249 },
  { max: 12, pct: 0.0299 },
];
const CARD_FIXED_FEE_CENTS = 49;

export function cardFeePercentFor(installmentCount: number): number {
  const tier = CARD_FEE_TIERS.find((t) => installmentCount <= t.max);
  return (tier ?? CARD_FEE_TIERS[CARD_FEE_TIERS.length - 1])!.pct;
}

/** Total charged to the customer so the store nets exactly `baseCents` after Asaas's fee. */
export function grossUpForCardFee(baseCents: number, installmentCount: number): number {
  const pct = cardFeePercentFor(installmentCount);
  return Math.round((baseCents + CARD_FIXED_FEE_CENTS) / (1 - pct));
}
