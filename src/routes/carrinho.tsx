import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, Truck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import { useCart } from "@/lib/cart/cart-context";
import { getStoredShippingZip, setStoredShippingZip } from "@/lib/cart/shipping-zip";
import { fetchShippingQuote, onlyDigits, type ShippingQuote } from "@/lib/shipping/quote";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { WhatsappFloatButton } from "@/components/site/whatsapp-float-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/carrinho")({
  loader: async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("free_shipping_threshold_cents")
      .eq("id", "default")
      .maybeSingle();
    return { freeShippingThresholdCents: data?.free_shipping_threshold_cents ?? 10000 };
  },
  head: () => ({
    meta: [
      { title: "Carrinho - Alna Commerce" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CarrinhoPage,
});

function FreeShippingProgress({
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

function CarrinhoPage() {
  const { freeShippingThresholdCents } = Route.useLoaderData();
  const { items, subtotalCents, setQuantity, remove } = useCart();

  const [cep, setCep] = useState(() => getStoredShippingZip());
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [calculatingShipping, setCalculatingShipping] = useState(false);

  const itemsKey = items.map((i) => `${i.variantId}:${i.quantity}`).join("|");

  useEffect(() => {
    const digits = onlyDigits(cep);
    if (digits.length !== 8 || items.length === 0) return;

    let cancelled = false;
    setCalculatingShipping(true);
    setShippingError(null);
    fetchShippingQuote(
      digits,
      items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
    ).then((result) => {
      if (cancelled) return;
      setCalculatingShipping(false);
      if ("error" in result) {
        setQuote(null);
        setShippingError(result.error);
      } else {
        setQuote(result);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  function handleCepBlur() {
    const digits = onlyDigits(cep);
    if (digits.length !== 8) return;
    setStoredShippingZip(digits);
    setCalculatingShipping(true);
    setShippingError(null);
    fetchShippingQuote(
      digits,
      items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
    ).then((result) => {
      setCalculatingShipping(false);
      if ("error" in result) {
        setQuote(null);
        setShippingError(result.error);
      } else {
        setQuote(result);
      }
    });
  }

  const shippingCents = quote?.priceCents ?? null;
  const totalCents = shippingCents != null ? subtotalCents + shippingCents : null;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-[#12294f]">Seu carrinho</h1>

        {items.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">Seu carrinho está vazio.</p>
            <Link
              to="/loja"
              search={{ categoria: undefined }}
              className="mt-4 inline-flex items-center justify-center rounded-md bg-[#12294f] px-5 py-3 text-sm font-bold text-white hover:bg-[#12294f]/90"
            >
              Ver produtos
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6">
              <FreeShippingProgress
                subtotalCents={subtotalCents}
                thresholdCents={freeShippingThresholdCents}
              />
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.variantId}
                    className="flex gap-4 rounded-lg border border-[#12294f]/10 p-4"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-[#fcfbf8]">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.productTitle}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            to="/produto/$slug"
                            params={{ slug: item.productSlug }}
                            className="text-sm font-semibold text-[#12294f] hover:underline"
                          >
                            {item.productTitle}
                          </Link>
                          <p className="text-xs text-muted-foreground">{item.variantName}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(item.variantId)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Remover item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center rounded-md border border-[#12294f]/15">
                          <button
                            type="button"
                            onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                            className="flex h-8 w-8 items-center justify-center text-[#12294f] hover:bg-muted"
                            aria-label="Diminuir quantidade"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                            className="flex h-8 w-8 items-center justify-center text-[#12294f] hover:bg-muted"
                            aria-label="Aumentar quantidade"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-sm font-bold text-[#12294f]">
                          {formatCentsToBRL(item.priceCents * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="h-fit space-y-4 rounded-lg border border-[#12294f]/10 p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-bold text-[#12294f]">
                    {formatCentsToBRL(subtotalCents)}
                  </span>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cart-cep">CEP de entrega</Label>
                  <Input
                    id="cart-cep"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Frete (J&amp;T Express)</span>
                  {calculatingShipping ? (
                    <span className="text-xs text-muted-foreground">Calculando...</span>
                  ) : shippingCents != null ? (
                    <span className="font-semibold text-[#12294f]">
                      {shippingCents === 0 ? "Grátis" : formatCentsToBRL(shippingCents)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Informe o CEP</span>
                  )}
                </div>
                {shippingError ? (
                  <p className="text-xs text-destructive">{shippingError}</p>
                ) : null}

                <div className="flex items-center justify-between border-t pt-3 text-base font-bold text-[#12294f]">
                  <span>Total</span>
                  <span>{totalCents != null ? formatCentsToBRL(totalCents) : "—"}</span>
                </div>
                {totalCents == null ? (
                  <p className="text-xs text-muted-foreground">
                    Informe o CEP para ver o valor total antes de finalizar a compra.
                  </p>
                ) : null}

                <Button asChild className="w-full bg-[#16a34a] font-bold hover:bg-[#16a34a]/90">
                  <Link to="/checkout">Finalizar compra</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <SiteFooter />
      <WhatsappFloatButton />
    </div>
  );
}
