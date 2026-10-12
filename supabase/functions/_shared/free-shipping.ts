// "Frete grátis a partir de (R$)" has ONE source of truth: Admin > Configurações (site_settings.free_shipping_threshold_cents).
// The shipping quote (calculate-shipping) and the order itself (checkout-create) both read it through this helper, so they can
// never disagree with the store front or with each other. There is deliberately NO built-in default value: if the setting
// cannot be read, free shipping is simply off for that request (nobody gets a surprise discount) and the problem is logged.
export function readFreeShippingThresholdCents(
  settings: { free_shipping_threshold_cents?: number | null } | null | undefined,
  context: string,
): number | null {
  const value = settings?.free_shipping_threshold_cents;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    console.error(`[${context}] frete grátis: valor das Configurações indisponível; frete grátis desligado nesta chamada`);
    return null;
  }
  return value;
}

export function qualifiesForFreeShipping(subtotalCents: number, thresholdCents: number | null): boolean {
  return thresholdCents !== null && subtotalCents >= thresholdCents;
}
