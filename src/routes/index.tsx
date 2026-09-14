import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Flame,
  Headset,
  ShieldCheck,
  Truck,
  Wallet,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import heroSetembro from "@/assets/brand/hero-setembro-face.webp";
import bannerQuarto from "@/assets/brand/banner-quarto.webp";
import bannerMesa from "@/assets/brand/banner-mesa.webp";
import bannerFreteGratis from "@/assets/brand/banner-frete-gratis.webp";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { WhatsappFloatButton, WHATSAPP_URL } from "@/components/site/whatsapp-float-button";

const SITE_URL = "https://alnacommerce.com";

const BENEFITS = [
  {
    icon: Truck,
    title: "Frete para todo o Brasil",
    description: "Entregamos com agilidade e segurança.",
  },
  {
    icon: Wallet,
    title: "Parcele em até 12x",
    description: "Pague do seu jeito, com parcelamento facilitado.",
  },
  {
    icon: ShieldCheck,
    title: "Compra 100% segura",
    description: "Seus dados protegidos em todas as etapas.",
  },
  {
    icon: Headset,
    title: "Atendimento humanizado",
    description: "Estamos prontos para te ajudar sempre.",
  },
];

type CategoryRow = { id: string; name: string; slug: string; image_url: string | null };
type ProductRow = {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  thumbnailAlt: string;
  minPriceCents: number;
  maxPriceCents: number;
  compareAtPriceCents: number | null;
};

export const Route = createFileRoute("/")({
  loader: async () => {
    const [{ data: categories }, { data: products }, { data: settings }] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, slug, image_url")
        .is("parent_id", null)
        .order("position")
        .limit(4),
      supabase
        .from("products")
        .select(
          `id, title, slug,
           product_images(storage_path, alt_text, position),
           product_variants(price_cents, compare_at_price_cents)`,
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("site_settings")
        .select("free_shipping_threshold_cents")
        .eq("id", "default")
        .maybeSingle(),
    ]);

    const featuredProducts: ProductRow[] = (products ?? []).map((p) => {
      const images = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position);
      const thumbnail = images[0];
      const prices = (p.product_variants ?? []).map((v) => v.price_cents);
      const compareAt = (p.product_variants ?? [])
        .map((v) => v.compare_at_price_cents)
        .filter((v): v is number => v != null);

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        thumbnailUrl: thumbnail
          ? supabase.storage.from("product-media").getPublicUrl(thumbnail.storage_path).data
              .publicUrl
          : null,
        thumbnailAlt: thumbnail?.alt_text ?? p.title,
        minPriceCents: prices.length ? Math.min(...prices) : 0,
        maxPriceCents: prices.length ? Math.max(...prices) : 0,
        compareAtPriceCents: compareAt.length ? Math.max(...compareAt) : null,
      };
    });

    return {
      categories: (categories ?? []) as CategoryRow[],
      featuredProducts,
      freeShippingThresholdCents: settings?.free_shipping_threshold_cents ?? 10000,
    };
  },
  head: () => ({
    meta: [
      {
        title: "Casa, Cozinha e Mesa - Utilidades Domésticas Alna Commerce",
      },
      {
        name: "description",
        content:
          "Encontre produtos para casa, cozinha e mesa na Alna Commerce. Utilidades domésticas para trazer mais qualidade e praticidade ao seu dia a dia.",
      },
      { property: "og:title", content: "Casa, Cozinha e Mesa - Utilidades Domésticas Alna Commerce" },
      {
        property: "og:description",
        content:
          "Encontre produtos para casa, cozinha e mesa na Alna Commerce. Utilidades domésticas para trazer mais qualidade e praticidade ao seu dia a dia.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:site_name", content: "Alna Commerce" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Alna Commerce",
          url: SITE_URL,
          telephone: "+55-51-99491-1125",
          email: "contato@alna.cc",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Brusque",
            addressRegion: "SC",
            addressCountry: "BR",
          },
          sameAs: ["https://www.instagram.com/alnaoficial_"],
        }),
      },
    ],
  }),
  component: Index,
});

function CampaignHero() {
  return (
    <section className="overflow-hidden bg-[#0f2247]">
      {/* The photo itself has a generous empty gap between her chin and her hands,
          and even more empty background below her hands. object-top always keeps
          that gap (and her whole face) fully in view — any cropping at wide
          viewports only ever eats into the empty space at the bottom, never her
          face — so the badges (positioned by % from the top, landing in that
          empty zone) can never end up over her face. */}
      <div className="relative">
        <img
          src={heroSetembro}
          alt="Modelo da Alna Commerce sorrindo com os braços abertos, indicando as ofertas de setembro e o frete grátis"
          className="h-[480px] w-full object-cover object-top sm:h-[540px] md:h-[600px] lg:h-[660px] xl:h-[720px] 2xl:h-[780px]"
        />

        <div className="absolute inset-x-0 top-[58%] flex flex-col items-center gap-3 px-4 pb-4 sm:flex-row sm:justify-center sm:gap-6 sm:pb-6">
          <div className="flex items-center gap-2.5 rounded-2xl bg-[#ec4899] px-4 py-2.5 shadow-xl sm:px-5 sm:py-3">
            <Flame className="h-6 w-6 shrink-0 text-white sm:h-7 sm:w-7" />
            <div className="text-left leading-tight">
              <p className="text-[10px] font-bold uppercase text-white/90">Até</p>
              <p className="text-2xl font-black text-white sm:text-3xl">20% OFF</p>
              <p className="text-[10px] font-semibold uppercase text-white/90">em toda a loja</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl bg-white px-4 py-2.5 shadow-xl sm:px-5 sm:py-3">
            <Truck className="h-6 w-6 shrink-0 text-[#12294f] sm:h-7 sm:w-7" />
            <div className="text-left leading-tight">
              <p className="text-[10px] font-semibold uppercase text-[#12294f]/60">Aqui tem</p>
              <p className="text-sm font-black uppercase text-[#12294f] sm:text-base">
                Frete grátis
              </p>
              <p className="text-[10px] font-semibold uppercase text-[#12294f]/60">
                para todo o Brasil
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-3 text-center sm:pb-5 sm:pt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#16a34a] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg sm:px-4 sm:py-1.5 sm:text-xs">
          Alna
        </span>
        <h1 className="mt-2 text-2xl font-black uppercase leading-[0.95] text-white sm:text-4xl md:text-5xl">
          Mês de Setembro
        </h1>
        <a
          href="#destaques"
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-bold text-[#12294f] shadow-lg transition-colors hover:bg-white/90"
        >
          GARANTIR MEU DESCONTO →
        </a>
      </div>
    </section>
  );
}

function LifestyleBanner() {
  // Below md, the section isn't wide enough to fit her face on the left AND the
  // text block on the right without them colliding, so text stacks in its own
  // band under the photo instead of overlaying it — same rule as the hero.
  return (
    <section className="overflow-hidden bg-[#12294f] md:relative md:min-h-[520px] lg:min-h-[600px] xl:min-h-[680px]">
      <img
        src={bannerMesa}
        alt="Cliente organizando a mesa de jantar com utensílios de madeira e louças Alna Commerce"
        className="h-[320px] w-full object-cover object-[35%_0%] md:absolute md:inset-0 md:h-full"
      />
      <div
        aria-hidden="true"
        className="hidden md:block md:absolute md:inset-0 md:bg-gradient-to-l md:from-[#12294f] md:via-[#12294f]/80 md:to-[#12294f]/10"
      />
      <div className="px-4 py-8 text-center md:relative md:mx-auto md:flex md:min-h-[520px] md:max-w-6xl md:items-center md:justify-end md:py-14 md:text-right lg:min-h-[600px] xl:min-h-[680px]">
        <div className="md:max-w-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-[#f5a623]">
            Cama, mesa e banho
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Transforme sua mesa em um momento especial.
          </h2>
          <p className="mt-3 text-sm text-white/80">
            Louças, utensílios de madeira e toalhas que unem beleza e praticidade em cada detalhe.
          </p>
          <a
            href="#destaques"
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#16a34a] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#16a34a]/90"
          >
            Ver produtos →
          </a>
        </div>
      </div>
    </section>
  );
}

function CategoriesSection({ categories }: { categories: CategoryRow[] }) {
  return (
    <section id="categorias" className="mx-auto max-w-6xl px-4 py-14">
      <p className="text-center text-xs font-bold uppercase tracking-widest text-[#16a34a]">
        Nossas categorias
      </p>
      <h2 className="mt-1 text-center text-2xl font-bold text-[#12294f] sm:text-3xl">
        Tudo para sua casa
      </h2>

      {categories.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Estamos organizando nossas categorias — novidades em breve.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              to="/loja"
              search={{ categoria: category.slug }}
              className="group overflow-hidden rounded-xl border border-[#12294f]/10 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="aspect-square overflow-hidden bg-[#fcfbf8]">
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#12294f]/10 to-[#f5a623]/10 text-sm font-semibold text-[#12294f]/60">
                    {category.name}
                  </div>
                )}
              </div>
              <div className="p-3 text-center">
                <p className="text-sm font-semibold text-[#12294f]">{category.name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function FeaturedProductsSection({ products }: { products: ProductRow[] }) {
  return (
    <section id="destaques" className="bg-[#fcfbf8] py-14">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-[#16a34a]">
          Destaques
        </p>
        <h2 className="mt-1 text-center text-2xl font-bold text-[#12294f] sm:text-3xl">
          Produtos em destaque
        </h2>

        {products.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Estamos preparando nosso catálogo — os primeiros produtos chegam em breve.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {products.map((product) => (
              <Link
                key={product.id}
                to="/produto/$slug"
                params={{ slug: product.slug }}
                className="overflow-hidden rounded-xl border border-[#12294f]/10 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-square bg-[#fcfbf8]">
                  {product.compareAtPriceCents && product.compareAtPriceCents > product.maxPriceCents ? (
                    <span className="absolute left-2 top-2 z-10 rounded-full bg-[#16a34a] px-2 py-0.5 text-[10px] font-bold text-white">
                      OFF
                    </span>
                  ) : null}
                  {product.thumbnailUrl ? (
                    <img
                      src={product.thumbnailUrl}
                      alt={product.thumbnailAlt}
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
                    {product.minPriceCents === product.maxPriceCents
                      ? formatCentsToBRL(product.minPriceCents)
                      : `${formatCentsToBRL(product.minPriceCents)} – ${formatCentsToBRL(product.maxPriceCents)}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FreeShippingBanner({ thresholdCents }: { thresholdCents: number }) {
  // Below md the section isn't wide enough to keep her pointing hand clear of the
  // text at a readable size, so text stacks below the photo instead of overlaying
  // it — same rule as the hero and the lifestyle banner.
  return (
    <section className="overflow-hidden bg-white md:relative">
      <img
        src={bannerFreteGratis}
        alt="Equipe Alna Commerce embalando pedido para envio com frete grátis"
        className="h-[320px] w-full object-cover object-[80%_0%] md:h-[520px] lg:h-[600px] xl:h-[680px]"
      />
      <div className="px-4 py-8 text-center md:absolute md:inset-0 md:flex md:items-center md:py-0 md:text-left">
        <div className="mx-auto max-w-xs md:mx-0 md:w-full md:max-w-6xl md:px-4">
          <div className="md:max-w-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#12294f] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              Oferta especial
            </span>
            <h2 className="mt-3 text-3xl font-black leading-[0.95] text-[#12294f] md:text-4xl md:text-white lg:text-5xl">
              Frete grátis
            </h2>
            <p className="mt-2 text-base font-bold text-[#12294f] md:text-lg md:text-white">
              em compras acima de {formatCentsToBRL(thresholdCents)}
            </p>
            <a
              href="#destaques"
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#16a34a] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#16a34a]/90"
            >
              Aproveitar agora →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyBuySection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <p className="text-center text-xs font-bold uppercase tracking-widest text-[#16a34a]">
        Por que comprar na Alna Commerce?
      </p>
      <h2 className="mt-1 text-center text-2xl font-bold text-[#12294f] sm:text-3xl">
        Qualidade que você sente, segurança que você confia.
      </h2>

      <div className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-4">
        {BENEFITS.map((benefit) => (
          <div key={benefit.title} className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#16a34a]/10 text-[#16a34a]">
              <benefit.icon className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-[#12294f]">{benefit.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{benefit.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="sobre" className="bg-[#fcfbf8] py-14">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#16a34a]">
            Sobre a Alna Commerce
          </p>
          <h2 className="mt-1 text-2xl font-bold text-[#12294f] sm:text-3xl">
            Feito para o que realmente importa.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Selecionamos produtos que unem qualidade, funcionalidade e beleza para transformar
            sua casa em um lugar ainda melhor.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Mais do que vender, queremos fazer parte do seu dia a dia.
          </p>
          <a
            href="#destaques"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-[#12294f] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#12294f]/90"
          >
            Conhecer nossa história
          </a>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-[#12294f]/15 via-[#f5a623]/10 to-[#16a34a]/15">
          <img
            src={bannerQuarto}
            alt="Cliente relaxando com toalhas e roupa de cama macias da Alna Commerce"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        </div>
      </div>
    </section>
  );
}

function FaleConoscoBand() {
  return (
    <section id="fale-conosco" className="bg-[#12294f] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-semibold text-white">
          Dúvidas ou precisa de ajuda? Fale com a nossa equipe!
        </p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md bg-[#16a34a] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#16a34a]/90"
        >
          Falar no WhatsApp
        </a>
      </div>
    </section>
  );
}

function Index() {
  const { categories, featuredProducts, freeShippingThresholdCents } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <CampaignHero />
      <CategoriesSection categories={categories} />
      <FeaturedProductsSection products={featuredProducts} />
      <FreeShippingBanner thresholdCents={freeShippingThresholdCents} />
      <LifestyleBanner />
      <WhyBuySection />
      <AboutSection />
      <FaleConoscoBand />
      <SiteFooter />
      <WhatsappFloatButton />
    </div>
  );
}
