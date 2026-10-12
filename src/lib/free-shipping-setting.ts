// "Frete grátis a partir de (R$)" read on the server for pages whose TEXT (title/meta description, first paint) must already carry the
// real value — Google and the ad bots read the server-rendered HTML. The value lives only in Admin > Configurações
// (site_settings.free_shipping_threshold_cents). A tiny in-memory cache (60 s) avoids one database call per visit; there is NO built-in default:
// when the value cannot be read the page uses a generic wording ("o valor mínimo da loja") instead of a number.
import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";

const TTL_MS = 60 * 1000;
let cache: { value: number | null; at: number } | null = null;

export async function fetchFreeShippingThresholdCents(): Promise<number | null> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.value;
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("free_shipping_threshold_cents")
      .eq("id", "default")
      .maybeSingle();
    if (error) throw error;
    const value =
      typeof data?.free_shipping_threshold_cents === "number" && data.free_shipping_threshold_cents > 0
        ? data.free_shipping_threshold_cents
        : null;
    cache = { value, at: now };
    return value;
  } catch (error) {
    console.error("[free-shipping-setting] valor indisponível", error);
    return cache?.value ?? null;
  }
}

/** "acima de R$ 150,00" — or, when the value is unknown, "acima do valor mínimo da loja". */
export function freeShippingAbove(cents: number | null): string {
  return cents ? `acima de ${formatCentsToBRL(cents)}` : "acima do valor mínimo da loja";
}

/** "a partir de R$ 150,00" — or, when the value is unknown, "a partir do valor mínimo da loja". */
export function freeShippingFrom(cents: number | null): string {
  return cents ? `a partir de ${formatCentsToBRL(cents)}` : "a partir do valor mínimo da loja";
}
