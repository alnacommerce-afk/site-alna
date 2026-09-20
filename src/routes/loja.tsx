import { Await, createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import heroModelo from "@/assets/brand/hero-modelo.webp";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { WhatsappFloatButton } from "@/components/site/whatsapp-float-button";
import { Reveal } from "@/components/site/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SITE_URL = "https://store.alna.sale/loja";

type CategoryRow = { id: string; name: string; slug: string };
type ProductCard = {
  id: string;
  title: string;
  slug: string;
  categoryId: string | null;
  thumbnailUrl: string | null;
  thumbnailAlt: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  createdAt: string;
};

type SortOption = "relevancia" | "recentes" | "menor-preco" | "maior-preco";

const SORT_LABELS: Record<SortOption, string> = {
  relevancia: "Popularidade",
  "maior-preco": "Maior preço",
  "menor-preco": "Menor preço",
  recentes: "Produtos recentes",
};

// The catalog is fetched WITHOUT blocking the response: the page shell is sent right away and the
// filters/products stream in as soon as the database answers (see <Await> in LojaPage).
async function fetchCatalog(): Promise<{
  categories: CategoryRow[];
  products: ProductCard[];
  failed: boolean;
}> {
  try {
      const [{ data: categories }, { data: products }] = await Promise.all([
        supabase.from("categories").select("id, name, slug").order("position"),
        supabase
          .from("products")
          .select(
            `id, title, slug, category_id, created_at,
             product_images(storage_path, alt_text, position),
             product_variants(price_cents, compare_at_price_cents)`,
          )
          .eq("status", "published")
          .order("created_at", { ascending: false }),
      ]);

      const productCards: ProductCard[] = (products ?? []).map((p) => {
        const images = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position);
        const thumbnail = images[0];
        const variants = p.product_variants ?? [];
        const cheapest = variants.reduce<(typeof variants)[number] | null>((min, v) => {
          if (!min || v.price_cents < min.price_cents) return v;
          return min;
        }, null);

        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          categoryId: p.category_id,
          thumbnailUrl: thumbnail
            ? supabase.storage.from("product-media").getPublicUrl(thumbnail.storage_path).data
                .publicUrl
            : null,
          thumbnailAlt: thumbnail?.alt_text ?? p.title,
          priceCents: cheapest?.price_cents ?? 0,
          compareAtPriceCents: cheapest?.compare_at_price_cents ?? null,
          createdAt: p.created_at,
        };
      });


    return {
      categories: (categories ?? []) as CategoryRow[],
      products: productCards,
      failed: false,
    };
  } catch (error) {
    console.error("[loja] catálogo indisponível", error);
    return { categories: [], products: [], failed: true };
  }
}

export const Route = createFileRoute("/loja")({
  validateSearch: (search: Record<string, unknown>) => ({
    categoria: typeof search["categoria"] === "string" ? (search["categoria"] as string) : undefined,
  }),
  loader: () => ({ catalog: fetchCatalog() }),
  head: () => ({
    meta: [
      { title: "Loja - Utensílios de Madeira, Cama, Mesa e Banho | Alna Commerce" },
      {
        name: "description",
        content:
          "Confira todos os produtos da Alna Commerce: utensílios de madeira para cozinha, louças e itens de cama, mesa e banho.",
      },
      { property: "og:title", content: "Loja - Alna Commerce" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
  }),
  component: LojaPage,
});

function discountPercent(price: number, compareAt: number | null): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

function ProductGridCard({ product, priority }: { product: ProductCard; priority: boolean }) {
  const off = discountPercent(product.priceCents, product.compareAtPriceCents);

  return (
    <Link
      to="/produto/$slug"
      params={{ slug: product.slug }}
      className="block overflow-hidden rounded-xl border border-[#12294f]/10 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square bg-[#fcfbf8]">
        {off ? (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-[#16a34a] px-2 py-0.5 text-[10px] font-bold text-white">
            {off}% OFF
          </span>
        ) : null}
        {product.thumbnailUrl ? (
          <img
            src={product.thumbnailUrl}
            alt={product.thumbnailAlt}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Sem foto
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 min-h-[2.5rem] text-xs font-medium text-[#12294f]">
          {product.title}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          {off ? (
            <span className="text-xs text-muted-foreground line-through">
              {formatCentsToBRL(product.compareAtPriceCents!)}
            </span>
          ) : null}
          <span className="text-sm font-bold text-[#12294f]">
            {formatCentsToBRL(product.priceCents)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function CatalogSkeleton() {
  return (
    <div
      className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-[220px_1fr]"
      aria-busy="true"
      aria-label="Carregando produtos"
    >
      <aside className="hidden space-y-8 sm:block">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
      </aside>
      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-44" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-[#12294f]/10 bg-white">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="space-y-2 p-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Catalog({
  categories,
  products,
  failed,
  categoria,
}: {
  categories: CategoryRow[];
  products: ProductCard[];
  failed: boolean;
  categoria: string | undefined;
}) {
  const priceBounds = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 100 };
    const prices = products.map((p) => p.priceCents);
    return {
      min: Math.floor(Math.min(...prices) / 100),
      max: Math.ceil(Math.max(...prices) / 100),
    };
  }, [products]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    () => categories.find((c) => c.slug === categoria)?.id ?? null,
  );

  useEffect(() => {
    setSelectedCategoryId(categories.find((c) => c.slug === categoria)?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria]);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    priceBounds.min,
    priceBounds.max,
  ]);
  const [sort, setSort] = useState<SortOption>("relevancia");

  const filteredProducts = useMemo(() => {
    let list = products;

    if (selectedCategoryId) {
      list = list.filter((p) => p.categoryId === selectedCategoryId);
    }

    list = list.filter((p) => {
      const priceInReais = p.priceCents / 100;
      return priceInReais >= priceRange[0] && priceInReais <= priceRange[1];
    });

    const sorted = [...list];
    switch (sort) {
      case "maior-preco":
        sorted.sort((a, b) => b.priceCents - a.priceCents);
        break;
      case "menor-preco":
        sorted.sort((a, b) => a.priceCents - b.priceCents);
        break;
      case "recentes":
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "relevancia":
      default:
        break;
    }
    return sorted;
  }, [products, selectedCategoryId, priceRange, sort]);

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-[220px_1fr]">
      <aside className="space-y-8">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#12294f]">
            Categorias
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className={`transition-colors ${
                  selectedCategoryId === null
                    ? "font-bold text-[#16a34a]"
                    : "text-muted-foreground hover:text-[#12294f]"
                }`}
              >
                Todos os produtos
              </button>
            </li>
            {categories.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`transition-colors ${
                    selectedCategoryId === category.id
                      ? "font-bold text-[#16a34a]"
                      : "text-muted-foreground hover:text-[#12294f]"
                  }`}
                >
                  {category.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[#12294f]/10 p-4">
          <h2 className="text-sm font-bold text-[#12294f]">Filtrar por preço</h2>
          <div className="mt-6">
            <div className="relative mb-2 flex justify-between text-xs">
              <span className="rounded-full bg-[#16a34a] px-2 py-0.5 font-semibold text-white">
                {formatCentsToBRL(priceRange[0] * 100)}
              </span>
              <span className="rounded-full bg-[#16a34a] px-2 py-0.5 font-semibold text-white">
                {formatCentsToBRL(priceRange[1] * 100)}
              </span>
            </div>
            <Slider
              min={priceBounds.min}
              max={priceBounds.max}
              step={1}
              value={priceRange}
              onValueChange={(value) =>
                setPriceRange([value[0] ?? priceRange[0], value[1] ?? priceRange[1]])
              }
              className="[&_[data-orientation=horizontal]]:bg-[#16a34a]/20 [&_span[data-orientation=horizontal]:last-child]:bg-[#16a34a]"
            />
          </div>
        </div>
      </aside>

      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {filteredProducts.length}{" "}
            {filteredProducts.length === 1 ? "produto encontrado" : "produtos encontrados"}
          </p>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">Ordenar por</span>
            <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
              <SelectTrigger className="w-44">
                <SelectValue>{SORT_LABELS[sort]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SORT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {failed ? (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Não foi possível carregar os produtos agora. Atualize a página em instantes.
          </div>
        ) : null}

        {filteredProducts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            {products.length === 0
              ? "Estamos preparando nosso catálogo — os primeiros produtos chegam em breve."
              : "Nenhum produto encontrado com esses filtros."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {filteredProducts.map((product, index) => (
              <Reveal key={product.id} index={index}>
                <ProductGridCard product={product} priority={index < 6} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LojaPage() {
  const { catalog } = Route.useLoaderData();
  const { categoria } = Route.useSearch();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <section className="relative overflow-hidden bg-gradient-to-br from-[#fcfbf8] via-[#fcfbf8] to-[#f5e6bd]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-2 px-4 py-8 sm:grid-cols-[1fr_260px] sm:gap-6 sm:py-10">
          <div className="reveal text-center sm:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#16a34a] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              Loja Alna Commerce
            </span>
            <h1 className="mt-4 text-4xl font-black leading-[0.95] text-[#12294f] sm:text-5xl">
              Encontre tudo que sua casa merece.
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-[#12294f]/70 sm:mx-0 sm:text-base">
              Utensílios de madeira, louças e itens de cama, mesa e banho selecionados com
              qualidade e carinho para o seu dia a dia.
            </p>
          </div>
          <div className="reveal [--reveal-delay:140ms] mx-auto flex h-[200px] w-full max-w-[220px] items-end justify-center sm:h-[260px]">
            <img
              src={heroModelo}
              alt="Cliente sorridente da Alna Commerce apresentando os produtos da loja"
              className="h-full w-auto object-contain object-bottom"
            />
          </div>
        </div>
      </section>


      <Await promise={catalog} fallback={<CatalogSkeleton />}>
        {(data) => (
          <Catalog
            categories={data.categories}
            products={data.products}
            failed={data.failed}
            categoria={categoria}
          />
        )}
      </Await>

      <SiteFooter />
      <WhatsappFloatButton />
    </div>
  );
}
