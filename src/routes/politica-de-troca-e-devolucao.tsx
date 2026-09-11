import { createFileRoute } from "@tanstack/react-router";

import { LegalPageLayout, LegalSection } from "@/components/site/legal-page-layout";

const SITE_URL = "https://www.alna.cc/politica-de-troca-e-devolucao";

export const Route = createFileRoute("/politica-de-troca-e-devolucao")({
  head: () => ({
    meta: [
      { title: "Política de Trocas e Devoluções - Alna Commerce" },
      {
        name: "description",
        content:
          "Conheça os prazos e condições para troca, devolução e arrependimento de compras na Alna Commerce.",
      },
      { property: "og:title", content: "Política de Trocas e Devoluções - Alna Commerce" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
  }),
  component: PoliticaDeTrocaEDevolucaoPage,
});

function PoliticaDeTrocaEDevolucaoPage() {
  return (
    <LegalPageLayout title="Política de Trocas e Devoluções" updatedAt="setembro de 2026">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Queremos que você compre com confiança. Esta página explica seus direitos e como proceder
        em caso de arrependimento, defeito ou troca de um produto adquirido na Alna Commerce.
      </p>

      <LegalSection heading="1. Direito de arrependimento (7 dias)">
        <p>
          Conforme o artigo 49 do Código de Defesa do Consumidor, para compras realizadas fora do
          estabelecimento comercial (como pela internet), você tem o direito de desistir da compra
          em até <strong>7 (sete) dias corridos</strong>, contados a partir do recebimento do
          produto, sem necessidade de justificativa.
        </p>
        <p>
          Nesse caso, o produto deve ser devolvido sem indícios de uso, com a embalagem original e
          todos os acessórios e materiais que o acompanham. O valor pago — incluindo o frete — será
          integralmente reembolsado, e o custo do frete de devolução é de nossa responsabilidade.
        </p>
      </LegalSection>

      <LegalSection heading="2. Produto com defeito ou avaria">
        <p>
          Se o produto apresentar defeito de fabricação ou chegar avariado, você pode solicitar
          troca, reparo ou devolução do valor pago em até 30 (trinta) dias corridos, contados do
          recebimento, conforme o Código de Defesa do Consumidor. Nesses casos, o frete de
          devolução e de reenvio corre por nossa conta.
        </p>
      </LegalSection>

      <LegalSection heading="3. Como solicitar a troca ou devolução">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Entre em contato pelo WhatsApp (51) 99491-1125 ou pelo e-mail{" "}
            <a href="mailto:contato@alna.cc" className="font-medium text-[#12294f] underline">
              contato@alna.cc
            </a>{" "}
            informando o número do pedido e o motivo da solicitação;
          </li>
          <li>Nossa equipe vai orientar sobre o envio do produto de volta;</li>
          <li>
            Após o recebimento e a conferência do produto, o reembolso é processado na mesma
            forma de pagamento utilizada na compra, em até 10 dias úteis.
          </li>
        </ol>
      </LegalSection>

      <LegalSection heading="4. Condições para aceite da devolução">
        <ul className="list-disc space-y-1 pl-5">
          <li>Produto sem sinais de uso, lavagem ou desgaste (exceto em casos de defeito);</li>
          <li>Embalagem original preservada, sempre que possível;</li>
          <li>Etiquetas e acessórios originais inclusos.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Itens não contemplados">
        <p>
          Produtos personalizados ou fabricados sob encomenda específica para o cliente podem não
          ser elegíveis para devolução por arrependimento, exceto em caso de defeito, conforme
          indicado na página do produto no momento da compra.
        </p>
      </LegalSection>

      <LegalSection heading="6. Contato">
        <p>
          Nossa equipe está pronta para ajudar em qualquer etapa do processo. Fale conosco pelo
          WhatsApp (51) 99491-1125, segunda a sexta das 8h às 18h e sábado das 8h às 12h, ou pelo
          e-mail{" "}
          <a href="mailto:contato@alna.cc" className="font-medium text-[#12294f] underline">
            contato@alna.cc
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
