import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalPageLayout, LegalSection } from "@/components/site/legal-page-layout";
import { STORE_URL } from "@/lib/site-urls";

const PAGE_URL = `${STORE_URL}/sobre`;
const TITLE = "Sobre a ALNA";
const DESCRIPTION =
  "Conheça a ALNA: utilidades domésticas que unem qualidade, funcionalidade e beleza para transformar a sua casa.";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: `${TITLE} - Casa, Cozinha e Mesa` },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
  component: SobrePage,
});

function SobrePage() {
  return (
    <LegalPageLayout title={TITLE}>
      <LegalSection heading="Feito para o que realmente importa.">
        <p>
          Selecionamos produtos que unem qualidade, funcionalidade e beleza para transformar sua
          casa em um lugar ainda melhor.
        </p>
        <p>Mais do que vender, queremos fazer parte do seu dia a dia.</p>
      </LegalSection>

      <LegalSection heading="Quem somos">
        <p>
          A <strong>ALNA COMMERCE</strong> (CNPJ 57.135.009/0001-27), de Brusque, Santa Catarina, é
          uma loja virtual própria que vende utensílios de madeira para cozinha, toalhas, itens de
          cama, mesa e banho e roupas, com nota fiscal e entrega para todo o Brasil. Também
          atendemos compras em quantidade para revenda: veja a página de{" "}
          <Link to="/atacado" className="font-semibold text-[#15803d] hover:underline">
            atacado
          </Link>
          .
        </p>
        <p>
          Atendimento de segunda a sexta, das 8h às 18h, e aos sábados, das 8h às 12h, pelo
          WhatsApp (51) 99491-1125 e pelo e-mail contato@alna.sale. Veja também a nossa página de{" "}
          <Link to="/contato" className="font-semibold text-[#15803d] hover:underline">
            contato
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Por que comprar na ALNA?">
        <ul className="list-disc space-y-1 pl-5">
          <li>Frete para todo o Brasil, com entrega ágil e segura.</li>
          <li>Parcelamento em até 12x no cartão de crédito.</li>
          <li>Compra 100% segura, com seus dados protegidos em todas as etapas.</li>
          <li>Atendimento humanizado, sempre pronto para ajudar.</li>
        </ul>
      </LegalSection>
    </LegalPageLayout>
  );
}
