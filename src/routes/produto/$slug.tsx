import { useMemo, useState } from "react";
import { Await, createFileRoute, Link } from "@tanstack/react-router";
import { Maximize2, Minus, Plus, ShieldCheck, Star, Truck, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import { useCart } from "@/lib/cart/cart-context";
import { getSavedCheckoutInfo, saveCheckoutInfo } from "@/lib/checkout/saved-info";
import { fetchShippingQuote, onlyDigits } from "@/lib/shipping/quote";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { WhatsappFloatButton } from "@/components/site/whatsapp-float-button";
import { Reveal } from "@/components/site/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { SITE_URL as HOME_URL } from "@/lib/site-urls";
import { RETURN_POLICY } from "@/lib/return-policy";
import { plainText } from "@/lib/plain-text";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const SITE_URL = "https://store.alna.sale";
const PIX_DISCOUNT = 0.04;

type ImageRow = { id: string; storage_path: string; alt_text: string; position: number };
type VariantRow = {
  id: string;
  name: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  sku: string;
  stock_quantity: number;
};
type ReviewRow = {
  id: string;
  author_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};
type RelatedRow = {
  id: string;
  title: string;
  slug: string;
  product_images: { storage_path: string; alt_text: string; position: number }[];
  product_variants: { price_cents: number; compare_at_price_cents: number | null }[];
};

type ProductExtras = { related: RelatedRow[]; reviews: ReviewRow[] };

// Reviews and related products are secondary: the product itself (needed for the title, photo and
// price in the HTML) is awaited by the loader, while these stream in afterwards in their own blocks.
async function fetchExtras(productId: string, categoryId: string | null): Promise<ProductExtras> {
  try {
    const [{ data: related }, { data: reviews }] = await Promise.all([
      supabase
        .from("products")
        .select(
          `id, title, slug,
           product_images(storage_path, alt_text, position),
           product_variants(price_cents, compare_at_price_cents)`,
        )
        .eq("category_id", categoryId ?? "")
        .eq("status", "published")
        .neq("id", productId)
        .limit(4),
      supabase
        .from("product_reviews")
        .select("id, author_name, rating, comment, created_at")
        .eq("product_id", productId)
        .order("created_at", { ascending: false }),
    ]);
    return { related: (related ?? []) as RelatedRow[], reviews: (reviews ?? []) as ReviewRow[] };
  } catch (error) {
    console.error("[produto] extras indisponíveis", error);
    return { related: [], reviews: [] };
  }
}

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/produto/$slug")({
  loader: async ({ params }) => {
    const { data: product } = await supabase
      .from("products")
      .select(
        `id, title, slug, description, video_url, seo_title, seo_description, focus_keyword,
         category_id,
         categories(name, slug),
         product_images(id, storage_path, alt_text, position),
         product_variants(id, name, price_cents, compare_at_price_cents, sku, stock_quantity, gtin_ean)`,
      )
      .eq("slug", params.slug)
      .eq("status", "published")
      .maybeSingle();

    if (!product) {
      return {
        product: null,
        extras: Promise.resolve<ProductExtras>({ related: [], reviews: [] }),
      };
    }

    // Started now, but not awaited: the response does not wait for reviews or related products.
    return { product, extras: fetchExtras(product.id, product.category_id) };
  },
  head: ({ loaderData }) => {
    const product = loaderData?.product;
    if (!product) {
      return { meta: [{ title: "Produto não encontrado - ALNA" }] };
    }

    const images = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position);
    const thumbnail = images[0]
      ? supabase.storage.from("product-media").getPublicUrl(images[0].storage_path).data.publicUrl
      : undefined;
    const variants = product.product_variants ?? [];
    const name = product.title.trim();
    const title = (product.seo_title || product.title).trim();
    const description =
      product.seo_description?.trim() || plainText(product.description, 160) || `${name} - ALNA`;
    const url = `${SITE_URL}/produto/${product.slug}`;
    const imageUrls = images.map(
      (image) =>
        supabase.storage.from("product-media").getPublicUrl(image.storage_path).data.publicUrl,
    );
    // Only a well-formed GTIN/EAN (8, 12, 13 or 14 digits) is published; otherwise Google is told the
    // product has none instead of receiving a bad code.
    const gtin = variants
      .map((v) => v.gtin_ean?.trim())
      .find((g) => g && /^(\d{8}|\d{12,14})$/.test(g));

    return {
      meta: [
        { title: `${title} | ALNA` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(thumbnail ? [{ property: "og:image", content: thumbnail }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name,
            description: plainText(product.description) || undefined,
            image: imageUrls.length ? imageUrls : undefined,
            sku: variants[0]?.sku,
            mpn: variants[0]?.sku,
            ...(gtin ? { gtin } : {}),
            brand: { "@type": "Brand", name: "ALNA" },
            ...(product.categories?.name ? { category: product.categories.name } : {}),
            // One offer per variant, each with its own SKU, price and stock.
            offers: variants.map((v) => ({
              "@type": "Offer",
              sku: v.sku,
              url,
              priceCurrency: "BRL",
              price: (v.price_cents / 100).toFixed(2),
              availability:
                v.stock_quantity > 0
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
              itemCondition: "https://schema.org/NewCondition",
              hasMerchantReturnPolicy: RETURN_POLICY,
            })),
          }),
        },
      ],
    };
  },
  component: ProdutoPage,
});

function RelatedProductCard({ product }: { product: RelatedRow }) {
  const images = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position);
  const thumbnail = images[0];
  const variants = product.product_variants ?? [];
  const cheapest = variants.reduce<(typeof variants)[number] | null>((min, v) => {
    if (!min || v.price_cents < min.price_cents) return v;
    return min;
  }, null);
  const thumbnailUrl = thumbnail
    ? supabase.storage.from("product-media").getPublicUrl(thumbnail.storage_path).data.publicUrl
    : null;

  return (
    <Link
      to="/produto/$slug"
      params={{ slug: product.slug }}
      className="block overflow-hidden rounded-xl border border-[#12294f]/10 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="aspect-square bg-[#fcfbf8]">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={thumbnail?.alt_text ?? product.title}
            loading="lazy"
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
        <p className="mt-2 text-sm font-bold text-[#12294f]">
          {formatCentsToBRL(cheapest?.price_cents ?? 0)}
        </p>
      </div>
    </Link>
  );
}

function RatingSummary({ extras }: { extras: Promise<ProductExtras> }) {
  return (
    <Await promise={extras} fallback={<Skeleton className="mt-2 h-5 w-40" />}>
      {({ reviews }) => {
        if (reviews.length === 0) return null;
        const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        return (
          <div className="reveal mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <div className="flex text-[#f5a623]">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className="h-4 w-4"
                  fill={n <= Math.round(average) ? "currentColor" : "none"}
                />
              ))}
            </div>
            <span>
              {average.toFixed(1)} ({reviews.length}{" "}
              {reviews.length === 1 ? "avaliação" : "avaliações"})
            </span>
          </div>
        );
      }}
    </Await>
  );
}

function ReviewsSection({ extras }: { extras: Promise<ProductExtras> }) {
  return (
    <section className="border-t py-12">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="text-lg font-bold text-[#12294f]">Avaliações de quem comprou</h2>
        <Await
          promise={extras}
          fallback={
            <div className="mt-5 space-y-4" aria-busy="true">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          }
        >
          {({ reviews }) =>
            reviews.length === 0 ? (
              <p className="reveal mt-4 text-sm text-muted-foreground">
                Ainda não há avaliações para este produto. Seja o primeiro a comprar!
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {reviews.map((review, index) => (
                  <Reveal key={review.id} index={index}>
                    <div className="rounded-lg border border-[#12294f]/10 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#12294f]">{review.author_name}</p>
                        <div className="flex text-[#f5a623]">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className="h-3.5 w-3.5"
                              fill={n <= review.rating ? "currentColor" : "none"}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment ? (
                        <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                      ) : null}
                    </div>
                  </Reveal>
                ))}
              </div>
            )
          }
        </Await>
      </div>
    </section>
  );
}

function RelatedSection({ extras }: { extras: Promise<ProductExtras> }) {
  return (
    <Await
      promise={extras}
      fallback={
        <section className="border-t bg-[#fcfbf8] py-12" aria-busy="true">
          <div className="mx-auto max-w-6xl px-4">
            <Skeleton className="h-5 w-48" />
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-xl border border-[#12294f]/10 bg-white"
                >
                  <Skeleton className="aspect-square w-full rounded-none" />
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      }
    >
      {({ related }) =>
        related.length > 0 ? (
          <section className="border-t bg-[#fcfbf8] py-12">
            <div className="mx-auto max-w-6xl px-4">
              <h2 className="reveal text-lg font-bold text-[#12294f]">Produtos relacionados</h2>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {related.map((item, index) => (
                  <Reveal key={item.id} index={index}>
                    <RelatedProductCard product={item} />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        ) : null
      }
    </Await>
  );
}

function ProdutoPage() {
  const { product, extras } = Route.useLoaderData();
  const cart = useCart();

  const images = useMemo(
    () =>
      [...(product?.product_images ?? [])].sort((a, b) => a.position - b.position) as ImageRow[],
    [product],
  );
  const variants = (product?.product_variants ?? []) as VariantRow[];

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  // Com 1 só variação não há escolha real — vem pré-selecionada. Com mais de uma, começa vazio: o
  // cliente precisa escolher pelo menos uma pra continuar, e pode marcar mais de uma ao mesmo tempo.
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>(
    variants.length === 1 && variants[0] ? [variants[0].id] : [],
  );
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "cartao">("pix");
  const [cep, setCep] = useState(() => getSavedCheckoutInfo().zip ?? "");
  const [checkingShipping, setCheckingShipping] = useState(false);
  const [shippingResult, setShippingResult] = useState<{
    priceCents: number;
    deliveryTimeDays: number;
  } | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const selectedVariants = variants.filter((v) => selectedVariantIds.includes(v.id));
  const hasSelection = selectedVariants.length > 0;
  const currentImage = images[selectedImageIndex] ?? images[0];

  function toggleVariant(id: string) {
    setSelectedVariantIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-[#12294f]">Produto não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esse produto pode ter sido removido ou o link está incorreto.
          </p>
          <Link
            to="/loja"
            search={{ categoria: undefined }}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-[#12294f] px-5 py-3 text-sm font-bold text-white hover:bg-[#12294f]/90"
          >
            Ver todos os produtos
          </Link>
        </div>
        <SiteFooter />
        <WhatsappFloatButton />
      </div>
    );
  }

  // Com 1 variação selecionada, mostra preço/desconto dela normalmente. Com 0 ou várias, não há um
  // "preço unitário" único pra destacar — usa a mais barata como referência e deixa o Total (que
  // soma todas as selecionadas) ser o número que realmente importa.
  const singleSelected = selectedVariants.length === 1 ? selectedVariants[0] : null;
  const referenceVariant =
    singleSelected ??
    selectedVariants.reduce<VariantRow | null>(
      (min, v) => (!min || v.price_cents < min.price_cents ? v : min),
      null,
    );
  const unitPrice = referenceVariant?.price_cents ?? 0;
  const compareAt = referenceVariant?.compare_at_price_cents ?? null;
  const off =
    compareAt && compareAt > unitPrice
      ? Math.round(((compareAt - unitPrice) / compareAt) * 100)
      : null;
  const subtotal = selectedVariants.reduce((sum, v) => sum + v.price_cents, 0) * quantity;
  const pixTotal = Math.round(subtotal * (1 - PIX_DISCOUNT));
  const anyInStock = selectedVariants.some((v) => v.stock_quantity > 0);
  const maxQuantity = selectedVariants.length
    ? Math.min(...selectedVariants.map((v) => v.stock_quantity))
    : 1;
  const embedUrl = product.video_url ? toEmbedUrl(product.video_url) : null;

  async function handleCheckShipping(options?: { silent?: boolean }) {
    const digits = onlyDigits(cep);
    if (digits.length !== 8) {
      if (!options?.silent) toast.error("Informe um CEP válido.");
      return;
    }
    if (selectedVariants.length === 0) {
      if (!options?.silent) toast.error("Selecione uma variação antes de calcular o frete.");
      return;
    }

    saveCheckoutInfo({ zip: digits });
    setCheckingShipping(true);
    setShippingError(null);
    setShippingResult(null);
    const result = await fetchShippingQuote(
      digits,
      selectedVariants.map((v) => ({ variantId: v.id, quantity })),
    );
    setCheckingShipping(false);
    if ("error" in result) {
      setShippingError(result.error);
    } else {
      setShippingResult(result);
    }
  }

  function handleAddToCart() {
    if (!product || selectedVariants.length === 0) return;
    const thumbnailUrl = currentImage
      ? supabase.storage.from("product-media").getPublicUrl(currentImage.storage_path).data
          .publicUrl
      : null;

    let added = 0;
    let skipped = 0;
    for (const variant of selectedVariants) {
      if (variant.stock_quantity <= 0) {
        skipped++;
        continue;
      }
      cart.add(
        {
          variantId: variant.id,
          productSlug: product.slug,
          productTitle: product.title,
          variantName: variant.name,
          thumbnailUrl,
          priceCents: variant.price_cents,
          maxQuantity: variant.stock_quantity,
        },
        quantity,
      );
      added++;
    }

    if (added === 0) {
      toast.error("Nenhuma das variações selecionadas tem estoque.");
      return;
    }
    toast.success(
      added === 1
        ? "Produto adicionado ao carrinho."
        : `${added} variações adicionadas ao carrinho.`,
    );
    if (skipped > 0) {
      toast.error(
        skipped === 1
          ? "1 variação selecionada estava sem estoque e não foi adicionada."
          : `${skipped} variações selecionadas estavam sem estoque e não foram adicionadas.`,
      );
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">
        <a href={HOME_URL} className="hover:text-[#12294f]">
          Início
        </a>
        {product.categories ? (
          <>
            {" / "}
            <Link
              to="/loja"
              search={{ categoria: product.categories.slug }}
              className="hover:text-[#12294f]"
            >
              {product.categories.name}
            </Link>
          </>
        ) : null}
        {" / "}
        <span className="text-[#12294f]">{product.title}</span>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 pb-14 sm:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-xl border border-[#12294f]/10 bg-[#fcfbf8]">
            {off ? (
              <span className="absolute left-3 top-3 z-10 rounded-full bg-[#16a34a] px-2.5 py-1 text-xs font-bold text-white">
                {off}% OFF
              </span>
            ) : null}
            {images.length > 0 ? (
              <>
                <img
                  src={
                    supabase.storage.from("product-media").getPublicUrl(currentImage!.storage_path)
                      .data.publicUrl
                  }
                  alt={currentImage!.alt_text}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  aria-label="Ampliar imagem"
                  className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#12294f] shadow hover:bg-white"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                Sem foto
              </div>
            )}
          </div>

          {images.length > 1 ? (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.map((img, index) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={`aspect-square overflow-hidden rounded-md border-2 bg-[#fcfbf8] ${
                    index === selectedImageIndex ? "border-[#16a34a]" : "border-transparent"
                  }`}
                >
                  <img
                    src={
                      supabase.storage.from("product-media").getPublicUrl(img.storage_path).data
                        .publicUrl
                    }
                    alt={img.alt_text}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}

          {embedUrl ? (
            <button
              type="button"
              onClick={() => setVideoOpen(true)}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#16a34a] hover:underline"
            >
              ▶ Assistir vídeo do produto
            </button>
          ) : null}

          <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
            <DialogContent className="max-w-3xl">
              <DialogTitle className="sr-only">{currentImage?.alt_text}</DialogTitle>
              {currentImage ? (
                <img
                  src={
                    supabase.storage.from("product-media").getPublicUrl(currentImage.storage_path)
                      .data.publicUrl
                  }
                  alt={currentImage.alt_text}
                  className="h-full w-full rounded-md object-contain"
                />
              ) : null}
            </DialogContent>
          </Dialog>

          <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
            <DialogContent className="max-w-2xl">
              <DialogTitle className="sr-only">Vídeo do produto</DialogTitle>
              {embedUrl ? (
                <div className="aspect-video">
                  <iframe
                    src={embedUrl}
                    title="Vídeo do produto"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full rounded-md"
                  />
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[#12294f] sm:text-3xl">{product.title}</h1>

          <RatingSummary extras={extras} />

          <div className="mt-4 flex items-baseline gap-3">
            {off ? (
              <span className="text-base text-muted-foreground line-through">
                {formatCentsToBRL(compareAt!)}
              </span>
            ) : null}
            <span className="text-3xl font-black text-[#12294f]">
              {formatCentsToBRL(unitPrice)}
            </span>
            {off ? (
              <span className="rounded-full bg-[#16a34a] px-2 py-0.5 text-xs font-bold text-white">
                {off}% off
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold text-[#16a34a]">
            {formatCentsToBRL(pixTotal)} no PIX (4% de desconto)
          </p>
          {singleSelected ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {singleSelected.stock_quantity > 0
                ? `${singleSelected.stock_quantity} em estoque`
                : "Sem estoque no momento"}
            </p>
          ) : null}

          <div className="mt-5 space-y-1.5">
            <Label>Forma de pagamento</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as "pix" | "cartao")}
              className="grid grid-cols-2 gap-2"
            >
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm ${
                  paymentMethod === "pix"
                    ? "border-[#16a34a] bg-[#16a34a]/5"
                    : "border-[#12294f]/15"
                }`}
              >
                <RadioGroupItem value="pix" /> PIX{" "}
                <span className="text-xs text-[#16a34a]">(-4%)</span>
              </label>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm ${
                  paymentMethod === "cartao"
                    ? "border-[#16a34a] bg-[#16a34a]/5"
                    : "border-[#12294f]/15"
                }`}
              >
                <RadioGroupItem value="cartao" /> Cartão de crédito
              </label>
            </RadioGroup>
          </div>

          {variants.length > 1 ? (
            <div className="mt-5 space-y-1.5">
              <Label>
                Variação{" "}
                {!hasSelection ? (
                  <span className="text-destructive">(escolha ao menos uma)</span>
                ) : null}
              </Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {variants.map((v) => {
                  const checked = selectedVariantIds.includes(v.id);
                  const outOfStock = v.stock_quantity <= 0;
                  return (
                    <label
                      key={v.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm ${
                        checked ? "border-[#16a34a] bg-[#16a34a]/5" : "border-[#12294f]/15"
                      } ${outOfStock ? "opacity-50" : ""}`}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleVariant(v.id)} />
                      <span className="flex-1">{v.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {outOfStock ? "sem estoque" : formatCentsToBRL(v.price_cents)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-5 space-y-1.5">
            <Label htmlFor="cep">Simular frete</Label>
            <div className="flex gap-2">
              <Input
                id="cep"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                onBlur={() => handleCheckShipping({ silent: true })}
                placeholder="Informe seu CEP"
                maxLength={9}
                className="max-w-[180px]"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCheckShipping()}
                disabled={checkingShipping}
              >
                {checkingShipping ? "Calculando..." : "Calcular"}
              </Button>
            </div>
            {shippingResult ? (
              <p className="text-sm font-semibold text-[#12294f]">
                {shippingResult.priceCents === 0
                  ? "Frete grátis"
                  : `Frete J&T Express: ${formatCentsToBRL(shippingResult.priceCents)}`}{" "}
                — chega em até {shippingResult.deliveryTimeDays} dias úteis
              </p>
            ) : shippingError ? (
              <p className="text-sm text-destructive">{shippingError}</p>
            ) : null}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center rounded-md border border-[#12294f]/15">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-10 w-10 items-center justify-center text-[#12294f] hover:bg-muted"
                aria-label="Diminuir quantidade"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                className="flex h-10 w-10 items-center justify-center text-[#12294f] hover:bg-muted"
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-bold text-[#12294f]">{formatCentsToBRL(subtotal)}</span>
            </p>
          </div>

          <Button
            type="button"
            size="lg"
            className="mt-5 w-full bg-[#16a34a] text-base font-bold hover:bg-[#16a34a]/90"
            disabled={!hasSelection || !anyInStock}
            onClick={handleAddToCart}
          >
            {!hasSelection
              ? "Selecione uma variação"
              : anyInStock
                ? "Adicionar ao carrinho"
                : "Produto indisponível"}
          </Button>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6 sm:grid-cols-4">
            {[
              { icon: ShieldCheck, label: "Compra 100% segura" },
              { icon: Truck, label: "Frete para todo o Brasil" },
              { icon: Star, label: "Parcele em até 12x" },
              { icon: Undo2, label: "7 dias para devolução" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1.5 text-center">
                <item.icon className="h-5 w-5 text-[#16a34a]" />
                <span className="text-[11px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {product.description ? (
        <section className="border-t bg-[#fcfbf8] py-12">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="text-lg font-bold text-[#12294f]">Descrição</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>
        </section>
      ) : null}

      <ReviewsSection extras={extras} />

      <RelatedSection extras={extras} />

      <SiteFooter />
      <WhatsappFloatButton />
    </div>
  );
}
