import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalPageLayout, LegalSection } from "@/components/site/legal-page-layout";
import { WHATSAPP_URL } from "@/components/site/whatsapp-float-button";
import { Button } from "@/components/ui/button";
import { formatCentsToBRL } from "@/lib/money";
import { useSiteSettings } from "@/lib/site-data";
import { STORE_URL } from "@/lib/site-urls";

const PAGE_URL = `${STORE_URL}/atacado`;
const TITLE = "Atacado de Utilidades Domésticas, Toalhas e Cozinha";
const DESCRIPTION =
  "Compre em quantidade para revenda: utensílios de madeira, toalhas e mais. 5% de desconto acima de R$ 250, frete grátis acima de R$ 150 e nota fiscal.";

const WHATSAPP_ATACADO_URL = `${WHATSAPP_URL}?text=${encodeURIComponent(
  "Olá! Quero comprar em quantidade na ALNA (atacado).",
)}`;

const FEATURED_GROUPS = [
  {
    heading: "Cozinha: utensílios de madeira",
    category: "cozinha",
    products: [
      {
        slug: "tabua-de-corte-madeira-antibacteriana-para-cozinha",
        name: "Tábua de corte de madeira",
      },
      {
        slug: "pilao-de-madeira-com-socador-para-temperos-e-alho",
        name: "Pilão de madeira com socador",
      },
      {
        slug: "rolo-de-massa-de-madeira-macica-para-pao-e-pizza",
        name: "Rolo de massa de madeira maciça",
      },
      { slug: "colher-de-madeira", name: "Colher de madeira" },
      {
        slug: "prato-de-madeira-pinus-redondo-22cm-servir",
        name: "Prato de madeira pinus redondo",
      },
      { slug: "bandeja-de-madeira-natural", name: "Bandeja de madeira natural" },
    ],
  },
  {
    heading: "Toalhas de banho e rosto",
    category: "toalhas",
    products: [
      { slug: "toalha-colore-500g-80x150", name: "Toalha de banho Banhão 500g" },
      { slug: "toalha-paris-270g-68x140", name: "Toalha de banho Paris 100% algodão" },
      { slug: "toalha-rubi-400g-80x150", name: "Toalha Rubi 400g" },
      { slug: "toalha-luxo-banho-e-rosto", name: "Jogo de toalhas banho e rosto" },
      { slug: "toalha-de-time", name: "Toalha branca para sublimação" },
    ],
  },
  {
    heading: "Roupas e meias",
    category: "roupas",
    products: [
      { slug: "camiseta-protecao-uv-50-manga-longa-unissex", name: "Camiseta proteção UV 50+" },
      { slug: "short-tactel", name: "Short tactel de secagem rápida" },
      { slug: "meia-termica-para-frio-intenso-canelada-unissex", name: "Meia térmica canelada" },
    ],
  },
] as const;

export const Route = createFileRoute("/atacado")({
  head: () => ({
    meta: [
      { title: `${TITLE} | Alna` },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
  component: AtacadoPage,
});

function AtacadoPage() {
  const { data: siteSettings } = useSiteSettings();
  const freeShipping = formatCentsToBRL(siteSettings?.free_shipping_threshold_cents ?? 15000);

  return (
    <LegalPageLayout title={TITLE}>
      <LegalSection heading="Compre em quantidade para o seu negócio">
        <p>
          A ALNA vende para quem compra em volume: lojas, restaurantes, padarias, lanchonetes,
          buffets e revendedores. São utensílios de madeira para cozinha, toalhas de banho e rosto,
          roupas e utilidades domésticas, e as condições abaixo valem para{" "}
          <strong>todos os produtos do site</strong>. Monte o pedido direto no site ou fale com a
          gente para quantidades maiores.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button asChild className="bg-[#16a34a] font-bold hover:bg-[#16a34a]/90">
            <Link to="/loja" search={{ categoria: undefined }}>
              Ver produtos e montar o pedido
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href={WHATSAPP_ATACADO_URL} target="_blank" rel="noopener noreferrer">
              Falar no WhatsApp
            </a>
          </Button>
        </div>
      </LegalSection>

      <LegalSection heading="Condições para compras em quantidade">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>5% de desconto</strong> em compras acima de R$ 250,00: use o cupom{" "}
            <strong>ALNA5%OFF</strong> no carrinho.
          </li>
          <li>
            <strong>Frete grátis</strong> em compras acima de {freeShipping}, para todo o Brasil.
          </li>
          <li>
            <strong>4% de desconto</strong> pagando no Pix.
          </li>
          <li>
            <strong>Nota fiscal</strong> para pessoa física e para empresas (CNPJ).
          </li>
          <li>Pagamento por Pix ou cartão de crédito.</li>
        </ul>
        <p>
          Sem pedido mínimo: o desconto de 5% vale a partir de R$ 250,00 em produtos, e o frete
          grátis a partir de {freeShipping}.
        </p>
      </LegalSection>

      <LegalSection heading="O que você encontra para revenda">
        <p>
          Todo o catálogo vale para compra em quantidade. Veja alguns itens de cada categoria, as
          variações disponíveis e o estoque de cada um:
        </p>
        {FEATURED_GROUPS.map((group) => (
          <div key={group.category}>
            <h3 className="font-semibold text-[#12294f]">
              <Link
                to="/loja"
                search={{ categoria: group.category }}
                className="hover:text-[#16a34a] hover:underline"
              >
                {group.heading}
              </Link>
            </h3>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {group.products.map((product) => (
                <li key={product.slug}>
                  <Link
                    to="/produto/$slug"
                    params={{ slug: product.slug }}
                    className="font-semibold text-[#16a34a] hover:underline"
                  >
                    {product.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p>
          <Link
            to="/loja"
            search={{ categoria: undefined }}
            className="font-semibold text-[#16a34a] hover:underline"
          >
            Ver todos os produtos da loja
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Como comprar em quantidade">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Escolha os produtos (de qualquer categoria) e as quantidades na loja e adicione ao
            carrinho.
          </li>
          <li>
            Acompanhe a barra do frete grátis e, ao passar de R$ 250,00, aplique o cupom ALNA5%OFF.
          </li>
          <li>Informe o CEP no carrinho para ver o frete e o prazo de entrega.</li>
          <li>Finalize com Pix ou cartão. Se precisar de nota fiscal, é só avisar.</li>
        </ol>
        <p>
          Precisa de uma quantidade maior do que a disponível no site, ou quer conversar sobre uma
          compra recorrente? Chame a gente no{" "}
          <a
            href={WHATSAPP_ATACADO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#16a34a] hover:underline"
          >
            WhatsApp
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Perguntas frequentes">
        <div>
          <h3 className="font-semibold text-[#12294f]">Tem pedido mínimo?</h3>
          <p>
            Não. O desconto de 5% é para compras acima de R$ 250,00 e o frete grátis para compras
            acima de {freeShipping}.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-[#12294f]">A ALNA emite nota fiscal?</h3>
          <p>Sim, para CPF e para CNPJ. Informe o documento no checkout.</p>
        </div>
        <div>
          <h3 className="font-semibold text-[#12294f]">Vocês entregam em todo o Brasil?</h3>
          <p>
            Sim. O valor e o prazo do frete aparecem no carrinho e na página de cada produto quando
            você informa o CEP.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-[#12294f]">Quais as formas de pagamento?</h3>
          <p>Pix, com 4% de desconto, ou cartão de crédito em até 12 parcelas.</p>
        </div>
        <div>
          <h3 className="font-semibold text-[#12294f]">
            Posso comprar uma quantidade maior do que a do site?
          </h3>
          <p>
            Fale com a gente pelo WhatsApp e informe o produto e a quantidade desejada. Respondemos
            em horário comercial.
          </p>
        </div>
      </LegalSection>
    </LegalPageLayout>
  );
}
