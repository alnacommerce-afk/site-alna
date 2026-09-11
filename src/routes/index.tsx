import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Headset,
  ShieldCheck,
  Truck,
  Wallet,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import heroModelo from "@/assets/brand/hero-modelo.webp";
import bannerQuarto from "@/assets/brand/banner-quarto.webp";
import bannerMesa from "@/assets/brand/banner-mesa.webp";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { WhatsappFloatButton, WHATSAPP_URL } from "@/components/site/whatsapp-float-button";

const SITE_URL = "https://www.alna.cc";

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
    const [{ data: categories }, { data: products }] = await Promise.all([
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
    <section className="relative overflow-hidden bg-gradient-to-br from-[#fcfbf8] via-[#fcfbf8] to-[#f5e6bd]">
      <div className="mx-auto grid max-w-6xl gap-2 px-4 py-10 sm:grid-cols-2 sm:items-center sm:gap-4 sm:py-14">
        <div className="relative z-10 text-center sm:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#16a34a] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            Setembro chegou
          </span>
          <h1 className="mt-4 text-5xl font-black leading-[0.9] text-[#12294f] sm:text-6xl md:text-7xl">
            Tudo até
            <span className="block text-[#f5a623]">20% OFF</span>
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-sm text-[#12294f]/70 sm:mx-0 sm:text-base">
            O mês inteiro com preços especiais em utensílios de madeira, cama, mesa e banho.
            Renove sua casa sem pesar no bolso — só até o fim de setembro.
          </p>
          <a
            href="#destaques"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#12294f] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#12294f]/90"
          >
            GARANTIR MEU DESCONTO →
          </a>
        </div>

        <div className="relative mx-auto flex h-[320px] w-full max-w-xs items-end justify-center sm:h-[440px] sm:max-w-none md:h-[500px]">
          <img
            src={heroModelo}
            alt="Cliente da Alna Commerce sorrindo e indicando as ofertas de setembro"
            className="relative z-10 h-full w-auto object-contain object-bottom"
          />
          <span className="absolute left-4 top-4 z-20 flex h-16 w-16 -rotate-6 flex-col items-center justify-center rounded-full bg-[#f5a623] text-center shadow-lg sm:left-10 sm:top-10 sm:h-20 sm:w-20">
            <span className="text-lg font-black leading-none text-[#12294f] sm:text-xl">
              20%
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wide text-[#12294f]/80">
              off
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}

function LifestyleBanner() {
  return (
    <section className="relative min-h-[420px] overflow-hidden bg-[#12294f]">
      <img
        src={bannerMesa}
        alt="Cliente organizando a mesa de jantar com utensílios de madeira e louças Alna Commerce"
        className="absolute inset-0 h-full w-full object-cover object-[35%_15%]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-l from-[#12294f] via-[#12294f]/80 to-[#12294f]/10"
      />
      <div className="relative mx-auto flex min-h-[420px] max-w-6xl items-center justify-end px-4 py-14">
        <div className="max-w-sm text-right">
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
              <div
                key={product.id}
                className="overflow-hidden rounded-xl border border-[#12294f]/10 bg-white shadow-sm"
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
              </div>
            ))}
          </div>
        )}
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
  const { categories, featuredProducts } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <CampaignHero />
      <CategoriesSection categories={categories} />
      <FeaturedProductsSection products={featuredProducts} />
      <LifestyleBanner />
      <WhyBuySection />
      <AboutSection />
      <FaleConoscoBand />
      <SiteFooter />
      <WhatsappFloatButton />
    </div>
  );
}
