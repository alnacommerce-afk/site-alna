import { createFileRoute } from "@tanstack/react-router";

import { LegalPageLayout, LegalSection } from "@/components/site/legal-page-layout";
import { WHATSAPP_URL } from "@/components/site/whatsapp-float-button";
import { STORE_URL } from "@/lib/site-urls";

const PAGE_URL = `${STORE_URL}/contato`;
const TITLE = "Fale com a Alna Commerce";
const DESCRIPTION =
  "Dúvidas ou precisa de ajuda? Fale com a equipe da Alna Commerce pelo WhatsApp, e-mail ou Instagram.";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: `Contato - ${TITLE}` },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  return (
    <LegalPageLayout title="Contato">
      <LegalSection heading="Dúvidas ou precisa de ajuda? Fale com a nossa equipe!">
        <p>
          Atendemos pelo WhatsApp, e-mail e Instagram. Conte com a gente antes, durante e depois da
          sua compra.
        </p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md bg-[#16a34a] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#16a34a]/90"
        >
          Falar no WhatsApp
        </a>
      </LegalSection>

      <LegalSection heading="Outros canais">
        <ul className="space-y-1">
          <li>
            WhatsApp: <a href={WHATSAPP_URL}>(51) 99491-1125</a>
          </li>
          <li>
            E-mail: <a href="mailto:contato@alna.cc">contato@alna.cc</a>
          </li>
          <li>
            Instagram:{" "}
            <a href="https://www.instagram.com/alnaoficial_" target="_blank" rel="noopener noreferrer">
              @alnaoficial_
            </a>
          </li>
          <li>Brusque, Santa Catarina</li>
        </ul>
      </LegalSection>
    </LegalPageLayout>
  );
}
