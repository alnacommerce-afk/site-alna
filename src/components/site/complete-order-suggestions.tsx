import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import { useCart } from "@/lib/cart/cart-context";
import { Button } from "@/components/ui/button";

const MAX_SUGGESTIONS = 6;

type Suggestion = {
  variantId: string;
  variantName: string;
  priceCents: number;
  stock: number;
  productTitle: string;
  productSlug: string;
  thumbnailUrl: string | null;
};

// Cheapest in-stock variant of each published product, ready to be dropped into the cart.
function useCheapSuggestions() {
  return useQuery({
    queryKey: ["site", "cheap-variants"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Suggestion[]> => {
      const { data, error } = await supabase
        .from("product_variants")
        .select(
          "id, name, price_cents, stock_quantity, products!inner(title, slug, status, product_images(storage_path, position))",
        )
        .eq("products.status", "published")
        .gt("stock_quantity", 0)
        .order("price_cents", { ascending: true })
        .limit(60);
      if (error) throw error;

      const seen = new Set<string>();
      const result: Suggestion[] = [];
      for (const row of data ?? []) {
        const product = row.products;
        if (!product || seen.has(product.slug)) continue;
        seen.add(product.slug);
        const image = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position)[0];
        result.push({
          variantId: row.id,
          variantName: row.name,
          priceCents: row.price_cents,
          stock: row.stock_quantity,
          productTitle: product.title,
          productSlug: product.slug,
          thumbnailUrl: image
            ? supabase.storage.from("product-media").getPublicUrl(image.storage_path).data.publicUrl
            : null,
        });
      }
      return result;
    },
  });
}

export function CompleteOrderSuggestions() {
  const { items, add } = useCart();
  const { data } = useCheapSuggestions();

  const inCart = new Set(items.map((i) => i.variantId));
  const suggestions = (data ?? []).filter((s) => !inCart.has(s.variantId)).slice(0, MAX_SUGGESTIONS);
  if (suggestions.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-bold text-[#12294f]">Complete seu pedido</h2>
      <p className="text-sm text-muted-foreground">
        Itens em conta para chegar mais rápido ao frete grátis.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {suggestions.map((s) => (
          <div key={s.variantId} className="flex flex-col rounded-lg border border-[#12294f]/10 p-3">
            <Link to="/produto/$slug" params={{ slug: s.productSlug }}>
              <div className="aspect-square overflow-hidden rounded-md bg-[#fcfbf8]">
                {s.thumbnailUrl ? (
                  <img
                    src={s.thumbnailUrl}
                    alt={s.productTitle}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-semibold text-[#12294f]">{s.productTitle}</p>
            </Link>
            <p className="mt-1 text-sm font-bold text-[#12294f]">{formatCentsToBRL(s.priceCents)}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2 w-full"
              onClick={() => {
                add(
                  {
                    variantId: s.variantId,
                    productSlug: s.productSlug,
                    productTitle: s.productTitle,
                    variantName: s.variantName,
                    thumbnailUrl: s.thumbnailUrl,
                    priceCents: s.priceCents,
                    maxQuantity: s.stock,
                  },
                  1,
                );
                toast.success("Adicionado ao carrinho.");
              }}
            >
              Adicionar
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
