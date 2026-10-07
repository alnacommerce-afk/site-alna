import { Link } from "@tanstack/react-router";
import { Truck } from "lucide-react";

import { formatCentsToBRL } from "@/lib/money";
import { useCart } from "@/lib/cart/cart-context";
import { useSiteSettings } from "@/lib/site-data";

export function FreeShippingProgress({
  subtotalCents,
  thresholdCents,
}: {
  subtotalCents: number;
  thresholdCents: number;
}) {
  const reached = subtotalCents >= thresholdCents;
  const pct = Math.min(100, Math.round((subtotalCents / thresholdCents) * 100));
  const remainingCents = Math.max(0, thresholdCents - subtotalCents);

  return (
    <div className="rounded-lg border border-[#12294f]/10 bg-[#fcfbf8] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#12294f]">
        <Truck className="h-4 w-4 shrink-0 text-[#16a34a]" />
        {reached ? (
          <span>Você garantiu frete grátis! 🎉</span>
        ) : (
          <span>
            Faltam <strong>{formatCentsToBRL(remainingCents)}</strong> em compras para ganhar frete
            grátis
          </span>
        )}
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#12294f]/10">
        <div
          className="h-full rounded-full bg-[#16a34a] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-right text-xs text-muted-foreground">
        {formatCentsToBRL(subtotalCents)} de {formatCentsToBRL(thresholdCents)} para frete grátis
      </p>
    </div>
  );
}

// Shown on the shop and product pages (the cart has its own copy of the progress bar): tells the
// customer, before they ever open the cart, that stacking items is how to get free shipping.
export function FreeShippingBanner() {
  const { data: siteSettings } = useSiteSettings();
  const { items, subtotalCents } = useCart();
  const thresholdCents = siteSettings?.free_shipping_threshold_cents ?? null;
  if (thresholdCents === null) return null;

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[#16a34a]/30 bg-[#16a34a]/5 p-4">
        <Truck className="h-5 w-5 shrink-0 text-[#16a34a]" />
        <p className="text-sm text-[#12294f]">
          <strong>Frete grátis em compras acima de {formatCentsToBRL(thresholdCents)}.</strong> Junte
          vários itens no carrinho e não pague frete.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <FreeShippingProgress subtotalCents={subtotalCents} thresholdCents={thresholdCents} />
      <div className="text-right">
        <Link to="/carrinho" className="text-xs font-semibold text-[#16a34a] hover:underline">
          Ver meu carrinho
        </Link>
      </div>
    </div>
  );
}
