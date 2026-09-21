import { createFileRoute } from "@tanstack/react-router";

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
