const FUNCTIONS_URL = `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1`;

export type ShippingQuote = {
  serviceId: string;
  carrierName: string;
  priceCents: number;
  originalPriceCents: number;
  freeShipping: boolean;
  deliveryTimeDays: number;
};

export function onlyDigits(value: string) {
  return (value ?? "").replace(/\D/g, "");
}

export async function fetchShippingQuote(
  destinationZip: string,
  items: { variantId: string; quantity: number }[],
): Promise<ShippingQuote | { error: string }> {
  try {
    const resp = await fetch(`${FUNCTIONS_URL}/calculate-shipping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destinationZip, items }),
    });
    const json = await resp.json();
    if (!resp.ok) return { error: json.error ?? "Não foi possível calcular o frete." };
    return json as ShippingQuote;
  } catch {
    return { error: "Não foi possível calcular o frete agora." };
  }
}
