import { useQuery } from "@tanstack/react-query";
import { Ticket } from "lucide-react";
import { toast } from "sonner";

import { formatCentsToBRL } from "@/lib/money";
import { useCart } from "@/lib/cart/cart-context";
import { Button } from "@/components/ui/button";

const FUNCTIONS_URL = `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1`;

type PromotedCoupon = {
  code: string;
  discountPercent: number;
  minOrderCents: number;
  maxUses: number | null;
  remaining: number | null;
};

function usePromotedCoupon() {
  return useQuery({
    queryKey: ["site", "promoted-coupon"],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<PromotedCoupon | null> => {
      const resp = await fetch(`${FUNCTIONS_URL}/promoted-coupon`);
      if (!resp.ok) return null;
      const json = await resp.json();
      return json.coupon ?? null;
    },
  });
}

// Shows the coupon the admin chose to advertise (Admin > Marketing > Cupons > "Divulgar no site"),
// its condition, and a thermometer of how many uses are left. The numbers are the real ones — the
// box disappears once the coupon has no uses left, so urgency is never invented.
export function PromotedCouponBox({ canApply = false }: { canApply?: boolean }) {
  const { data: coupon } = usePromotedCoupon();
  const { subtotalCents, coupon: appliedCoupon, setCoupon } = useCart();

  if (!coupon) return null;
  if (coupon.remaining !== null && coupon.remaining <= 0) return null;

  const minOrder = coupon.minOrderCents;
  const reached = subtotalCents >= minOrder;
  const applied = appliedCoupon?.code === coupon.code;
  const pctLeft =
    coupon.maxUses && coupon.remaining !== null
      ? Math.max(0, Math.min(100, Math.round((coupon.remaining / coupon.maxUses) * 100)))
      : null;
  const running = pctLeft !== null && pctLeft <= 50;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-2 text-sm text-[#12294f]">
        <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p>
          Compras acima de <strong>{formatCentsToBRL(minOrder)}</strong>: use o cupom{" "}
          <strong className="font-mono text-[#16a34a]">{coupon.code}</strong> e ganhe{" "}
          <strong>{coupon.discountPercent}% de desconto</strong>
          {minOrder > 0 ? <span> além do frete grátis</span> : null}.
        </p>
      </div>

      {pctLeft !== null && coupon.remaining !== null && coupon.maxUses ? (
        <div className="mt-3">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-amber-200">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                running ? "bg-red-500" : "bg-amber-500"
              }`}
              style={{ width: `${pctLeft}%` }}
            />
          </div>
          <p
            className={`mt-1 text-xs ${running ? "font-semibold text-red-600" : "text-muted-foreground"}`}
          >
            {running ? "Está acabando! " : ""}Restam {coupon.remaining} de {coupon.maxUses} cupons
          </p>
        </div>
      ) : null}

      {canApply ? (
        <div className="mt-3">
          {applied ? (
            <p className="text-sm font-semibold text-[#16a34a]">Cupom aplicado neste pedido.</p>
          ) : reached ? (
            <Button
              type="button"
              size="sm"
              className="bg-[#16a34a] font-bold hover:bg-[#16a34a]/90"
              onClick={() => {
                setCoupon({
                  code: coupon.code,
                  discountPercent: coupon.discountPercent,
                  minOrderCents: minOrder,
                });
                toast.success("Cupom aplicado!");
              }}
            >
              Aplicar cupom {coupon.code}
            </Button>
          ) : (
            <p className="text-sm text-[#12294f]">
              Faltam <strong>{formatCentsToBRL(minOrder - subtotalCents)}</strong> para liberar o
              cupom.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
