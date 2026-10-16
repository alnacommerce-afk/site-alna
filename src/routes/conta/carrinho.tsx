import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart/cart-context";
import { formatCentsToBRL } from "@/lib/money";
import { CustomerShell } from "@/components/customer/customer-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/conta/carrinho")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: MeuCarrinhoSalvoPage,
});

type SavedLine = {
  variantId: string;
  quantity: number;
  productSlug: string;
  productTitle: string;
  variantName: string;
  thumbnailUrl: string | null;
  priceCents: number;
  maxQuantity: number;
};

type SavedCart = {
  items: SavedLine[];
  unavailable: number;
  lastActivityAt: string | null;
};

function MeuCarrinhoSalvoPage() {
  return (
    <CustomerShell>
      <MeuCarrinhoSalvo />
    </CustomerShell>
  );
}

function MeuCarrinhoSalvo() {
  const navigate = useNavigate();
  const { items: currentItems, add } = useCart();
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<SavedCart | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.functions.invoke("get-my-abandoned-cart").then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        toast.error("Não foi possível carregar seu carrinho salvo. Tente de novo em instantes.");
      } else {
        setSaved(data as SavedCart);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Mesma regra do link do e-mail: soma ao carrinho atual e não duplica o que já está nele.
  function continuePurchase() {
    if (!saved || saved.items.length === 0) return;
    let added = 0;
    for (const { quantity, ...item } of saved.items) {
      if (currentItems.some((i) => i.variantId === item.variantId)) continue;
      add(item, quantity);
      added++;
    }
    if (added > 0) {
      toast.success("Seu carrinho foi recuperado!");
    } else {
      toast.success("Esses produtos já estão no seu carrinho.");
    }
    navigate({ to: "/carrinho" });
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Carregando seu carrinho salvo...</p>;
  }

  if (!saved || saved.items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="font-semibold text-[#12294f]">Você não tem carrinho salvo.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Quando você deixar seu e-mail ao montar um carrinho na loja, ele aparece aqui para você continuar depois.
        </p>
      </div>
    );
  }

  const subtotal = saved.items.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
  const lastActivity = saved.lastActivityAt
    ? new Date(saved.lastActivityAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {lastActivity ? `Última atualização em ${lastActivity}.` : null} Os preços e o estoque abaixo são os de hoje.
        </p>
        {saved.unavailable > 0 ? (
          <p className="mt-2 text-sm text-destructive">
            {saved.unavailable} item(ns) não estão mais disponíveis e ficaram de fora.
          </p>
        ) : null}
      </div>

      <ul className="space-y-3">
        {saved.items.map((line) => (
          <li key={line.variantId} className="flex items-center gap-4 rounded-lg border p-3">
            {line.thumbnailUrl ? (
              <img src={line.thumbnailUrl} alt="" className="h-16 w-16 flex-none rounded object-cover" loading="lazy" />
            ) : (
              <div className="h-16 w-16 flex-none rounded bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[#12294f]">{line.productTitle}</p>
              <p className="truncate text-xs text-muted-foreground">{line.variantName}</p>
              <p className="text-xs text-muted-foreground">Quantidade: {line.quantity}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold text-[#12294f]">{formatCentsToBRL(line.priceCents * line.quantity)}</p>
              {line.quantity > 1 ? (
                <p className="text-xs text-muted-foreground">{formatCentsToBRL(line.priceCents)} cada</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base font-bold text-[#12294f]">Subtotal: {formatCentsToBRL(subtotal)}</p>
        <Button type="button" onClick={continuePurchase} className="bg-[#15803d] text-white hover:bg-[#166534]">
          Continuar a compra
        </Button>
      </div>
    </div>
  );
}
