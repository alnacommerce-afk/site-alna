import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SITE_URL = "https://alnacommerce.com";
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
type ReviewRow = { id: string; author_name: string; rating: number; comment: string | null; created_at: string };
type RelatedRow = {
  id: string;
  title: string;
  slug: string;
  product_images: { storage_path: string; alt_text: string; position: number }[];
  product_variants: { price_cents: number; compare_at_price_cents: number | null }[];
};

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
         product_variants(id, name, price_cents, compare_at_price_cents, sku, stock_quantity)`,
      )
      .eq("slug", params.slug)
      .eq("status", "published")
      .maybeSingle();

    if (!product) {
      return { product: null, related: [] as RelatedRow[], reviews: [] as ReviewRow[] };
    }

    const [{ data: related }, { data: reviews }] = await Promise.all([
      supabase
        .from("products")
        .select(
          `id, title, slug,
           product_images(storage_path, alt_text, position),
           product_variants(price_cents, compare_at_price_cents)`,
        )
        .eq("category_id", product.category_id ?? "")
        .eq("status", "published")
        .neq("id", product.id)
        .limit(4),
      supabase
        .from("product_reviews")
        .select("id, author_name, rating, comment, created_at")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false }),
    ]);

    return {
      product,
      related: (related ?? []) as RelatedRow[],
      reviews: (reviews ?? []) as ReviewRow[],
    };
  },
  head: ({ loaderData }) => {
    const product = loaderData?.product;
    if (!product) {
      return { meta: [{ title: "Produto não encontrado - Alna Commerce" }] };
    }

    const images = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position);
    const thumbnail = images[0]
      ? supabase.storage.from("product-media").getPublicUrl(images[0].storage_path).data.publicUrl
      : undefined;
    const variants = product.product_variants ?? [];
    const minPrice = variants.length ? Math.min(...variants.map((v) => v.price_cents)) / 100 : 0;
    const title = product.seo_title || product.title;
    const description =
      product.seo_description || product.description?.slice(0, 160) || `${product.title} - Alna Commerce`;
    const url = `${SITE_URL}/produto/${product.slug}`;

    return {
      meta: [
        { title: `${title} | Alna Commerce` },
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
            name: product.title,
            description: product.description ?? undefined,
            image: thumbnail,
            sku: variants[0]?.sku,
            offers: {
              "@type": "Offer",
              url,
              priceCurrency: "BRL",
              price: minPrice.toFixed(2),
              availability: variants.some((v) => v.stock_quantity > 0)
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
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
          <img src={thumbnailUrl} alt={thumbnail?.alt_text ?? product.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Sem foto
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 min-h-[2.5rem] text-xs font-medium text-[#12294f]">{product.title}</p>
        <p className="mt-2 text-sm font-bold text-[#12294f]">
          {formatCentsToBRL(cheapest?.price_cents ?? 0)}
        </p>
      </div>
    </Link>
  );
}

function ProdutoPage() {
  const { product, related, reviews } = Route.useLoaderData();
  const cart = useCart();

  const images = useMemo(
    () => [...(product?.product_images ?? [])].sort((a, b) => a.position - b.position) as ImageRow[],
    [product],
  );
  const variants = (product?.product_variants ?? []) as VariantRow[];

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "cartao">("pix");
  const [cep, setCep] = useState(() => getSavedCheckoutInfo().zip ?? "");
  const [checkingShipping, setCheckingShipping] = useState(false);
  const [shippingResult, setShippingResult] = useState<
    { priceCents: number; deliveryTimeDays: number } | null
  >(null);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? variants[0];
  const currentImage = images[selectedImageIndex] ?? images[0];

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

  const unitPrice = selectedVariant?.price_cents ?? 0;
  const compareAt = selectedVariant?.compare_at_price_cents ?? null;
  const off = compareAt && compareAt > unitPrice ? Math.round(((compareAt - unitPrice) / compareAt) * 100) : null;
  const subtotal = unitPrice * quantity;
  const pixTotal = Math.round(subtotal * (1 - PIX_DISCOUNT));
  const inStock = (selectedVariant?.stock_quantity ?? 0) > 0;
  const embedUrl = product.video_url ? toEmbedUrl(product.video_url) : null;
  const averageRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  async function handleCheckShipping(options?: { silent?: boolean }) {
    const digits = onlyDigits(cep);
    if (digits.length !== 8) {
      if (!options?.silent) toast.error("Informe um CEP válido.");
      return;
    }
    if (!selectedVariant) return;

    saveCheckoutInfo({ zip: digits });
    setCheckingShipping(true);
    setShippingError(null);
    setShippingResult(null);
    const result = await fetchShippingQuote(digits, [
      { variantId: selectedVariant.id, quantity },
    ]);
    setCheckingShipping(false);
    if ("error" in result) {
      setShippingError(result.error);
    } else {
      setShippingResult(result);
    }
  }

  function handleAddToCart() {
    if (!selectedVariant || !product) return;
    const thumbnailUrl = currentImage
      ? supabase.storage.from("product-media").getPublicUrl(currentImage.storage_path).data
          .publicUrl
      : null;

    cart.add(
      {
        variantId: selectedVariant.id,
        productSlug: product.slug,
        productTitle: product.title,
        variantName: selectedVariant.name,
        thumbnailUrl,
        priceCents: selectedVariant.price_cents,
        maxQuantity: selectedVariant.stock_quantity,
      },
      quantity,
    );
    toast.success("Produto adicionado ao carrinho.");
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-[#12294f]">
          Início
        </Link>
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
                  src={supabase.storage.from("product-media").getPublicUrl(currentImage!.storage_path).data.publicUrl}
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
                    src={supabase.storage.from("product-media").getPublicUrl(img.storage_path).data.publicUrl}
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
                  src={supabase.storage.from("product-media").getPublicUrl(currentImage.storage_path).data.publicUrl}
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

          {reviews.length > 0 ? (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <div className="flex text-[#f5a623]">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className="h-4 w-4" fill={n <= Math.round(averageRating) ? "currentColor" : "none"} />
                ))}
              </div>
              <span>
                {averageRating.toFixed(1)} ({reviews.length}{" "}
                {reviews.length === 1 ? "avaliação" : "avaliações"})
              </span>
            </div>
          ) : null}

          <div className="mt-4 flex items-baseline gap-3">
            {off ? (
              <span className="text-base text-muted-foreground line-through">
                {formatCentsToBRL(compareAt!)}
              </span>
            ) : null}
            <span className="text-3xl font-black text-[#12294f]">{formatCentsToBRL(unitPrice)}</span>
            {off ? (
              <span className="rounded-full bg-[#16a34a] px-2 py-0.5 text-xs font-bold text-white">
                {off}% off
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold text-[#16a34a]">
            {formatCentsToBRL(pixTotal)} no PIX (4% de desconto)
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {inStock ? `${selectedVariant?.stock_quantity} em estoque` : "Sem estoque no momento"}
          </p>

          {variants.length > 1 ? (
            <div className="mt-5 space-y-1.5">
              <Label>Variação</Label>
              <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                <SelectTrigger>
                  <SelectValue>{selectedVariant?.name}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {variants.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                  paymentMethod === "pix" ? "border-[#16a34a] bg-[#16a34a]/5" : "border-[#12294f]/15"
                }`}
              >
                <RadioGroupItem value="pix" /> PIX <span className="text-xs text-[#16a34a]">(-4%)</span>
              </label>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm ${
                  paymentMethod === "cartao" ? "border-[#16a34a] bg-[#16a34a]/5" : "border-[#12294f]/15"
                }`}
              >
                <RadioGroupItem value="cartao" /> Cartão de crédito
              </label>
            </RadioGroup>
          </div>

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
              <Button type="button" variant="outline" onClick={() => handleCheckShipping()} disabled={checkingShipping}>
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
                onClick={() => setQuantity((q) => Math.min(selectedVariant?.stock_quantity ?? 1, q + 1))}
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
            disabled={!inStock}
            onClick={handleAddToCart}
          >
            {inStock ? "Adicionar ao carrinho" : "Produto indisponível"}
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

      <section className="border-t py-12">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-lg font-bold text-[#12294f]">Avaliações de quem comprou</h2>
          {reviews.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Ainda não há avaliações para este produto. Seja o primeiro a comprar!
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-lg border border-[#12294f]/10 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#12294f]">{review.author_name}</p>
                    <div className="flex text-[#f5a623]">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className="h-3.5 w-3.5" fill={n <= review.rating ? "currentColor" : "none"} />
                      ))}
                    </div>
                  </div>
                  {review.comment ? (
                    <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {related.length > 0 ? (
        <section className="border-t bg-[#fcfbf8] py-12">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-lg font-bold text-[#12294f]">Produtos relacionados</h2>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {related.map((item) => (
                <RelatedProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <SiteFooter />
      <WhatsappFloatButton />
    </div>
  );
}
