import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";

import { formatCentsToBRL } from "@/lib/money";
import { useCart } from "@/lib/cart/cart-context";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { WhatsappFloatButton } from "@/components/site/whatsapp-float-button";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho - Alna Commerce" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CarrinhoPage,
});

function CarrinhoPage() {
  const { items, subtotalCents, setQuantity, remove } = useCart();

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
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
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
                <span className="font-bold text-[#12294f]">{formatCentsToBRL(subtotalCents)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Frete calculado na próxima etapa, a partir do seu CEP.
              </p>
              <Button asChild className="w-full bg-[#16a34a] font-bold hover:bg-[#16a34a]/90">
                <Link to="/checkout">Finalizar compra</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      <SiteFooter />
      <WhatsappFloatButton />
    </div>
  );
}
