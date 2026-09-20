import { createFileRoute } from "@tanstack/react-router";

import { LegalPageLayout, LegalSection } from "@/components/site/legal-page-layout";
import { RETURN_POLICY, RETURN_POLICY_URL } from "@/lib/return-policy";

const SITE_URL = RETURN_POLICY_URL;
const TITLE = "Política de Trocas e Devoluções - Alna Commerce";
const DESCRIPTION =
  "Prazos e condições para arrependimento, devolução e troca na Alna Commerce: 7 dias após o recebimento, frete de devolução por nossa conta e reembolso integral. Vale para compras com entrega no Brasil.";

// Machine-readable copy of the policy summary (schema.org), for Meta / Google Merchant reviewers.
const RETURN_POLICY_JSON_LD = {
  "@context": "https://schema.org",
  ...RETURN_POLICY,
  "@id": SITE_URL,
  name: "Política de Trocas e Devoluções - Alna Commerce",
};

const SUMMARY: { label: string; value: string }[] = [
  { label: "Prazo para desistir da compra", value: "7 dias corridos, a partir do recebimento do produto." },
  { label: "Produto com defeito ou avariado", value: "Até 30 dias corridos, a partir do recebimento." },
  { label: "Forma de devolução", value: "Envio pelos Correios ou transportadora, com postagem por nossa conta." },
  { label: "Frete de devolução", value: "Por nossa conta, sem custo para você." },
  { label: "Taxas", value: "Não cobramos taxa de devolução nem de reposição." },
  { label: "Reembolso", value: "Integral, incluindo o frete, na mesma forma de pagamento (Pix ou cartão)." },
  { label: "Prazo do reembolso", value: "Até 10 dias úteis depois que recebermos e conferirmos o produto." },
  { label: "Como pedir", value: "WhatsApp (51) 99491-1125, informando o número do pedido." },
  { label: "Onde vale", value: "Compras com entrega em qualquer endereço do Brasil (BR)." },
];

export const Route = createFileRoute("/politica-de-troca-e-devolucao")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(RETURN_POLICY_JSON_LD) },
    ],
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

      <section aria-labelledby="resumo" className="mt-6 rounded-lg border border-[#12294f]/15 bg-[#fcfbf8] p-5">
        <h2 id="resumo" className="text-base font-bold text-[#12294f]">
          Resumo da política
        </h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[14rem_1fr]">
          {SUMMARY.map((item) => (
            <div key={item.label} className="contents">
              <dt className="font-semibold text-[#12294f]">{item.label}</dt>
              <dd className="text-muted-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-8">
        <LegalSection heading="1. Onde esta política vale">
          <p>
            Esta política vale para todas as compras feitas na loja Alna Commerce — no site{" "}
            <strong>store.alna.sale</strong> ou pelas lojas e anúncios da marca no Instagram e no
            Facebook — com <strong>entrega no Brasil</strong>.
          </p>
          <p>
            No momento, a Alna Commerce vende e envia produtos apenas para endereços no Brasil e
            está sujeita à legislação brasileira, em especial ao Código de Defesa do Consumidor
            (Lei nº 8.078/1990). As regras abaixo se aplicam a todo pedido entregue no país,
            independentemente do idioma em que a compra foi feita.
          </p>
          <p>
            A Alna Commerce é uma loja 100% online e não possui loja física para devoluções: todas
            as devoluções são feitas por envio, conforme explicado abaixo.
          </p>
        </LegalSection>

        <LegalSection heading="2. Direito de arrependimento (7 dias)">
          <p>
            Conforme o artigo 49 do Código de Defesa do Consumidor, para compras realizadas fora do
            estabelecimento comercial (como pela internet), você tem o direito de desistir da
            compra em até <strong>7 (sete) dias corridos</strong>, contados a partir do recebimento
            do produto, sem necessidade de justificativa.
          </p>
          <p>
            Nesse caso, o produto deve ser devolvido sem indícios de uso, com a embalagem original e
            todos os acessórios e materiais que o acompanham. O valor pago — incluindo o frete — será
            integralmente reembolsado, e o custo do frete de devolução é de nossa responsabilidade.
          </p>
        </LegalSection>

        <LegalSection heading="3. Produto com defeito ou avaria">
          <p>
            Se o produto apresentar defeito de fabricação ou chegar avariado, você pode solicitar
            troca, reparo ou devolução do valor pago em até 30 (trinta) dias corridos, contados do
            recebimento, conforme o Código de Defesa do Consumidor. Nesses casos, o frete de
            devolução e de reenvio corre por nossa conta.
          </p>
        </LegalSection>

        <LegalSection heading="4. Como solicitar a troca ou devolução">
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Entre em contato pelo WhatsApp (51) 99491-1125 informando o número do pedido e o
              motivo da solicitação. Se for defeito ou avaria, envie fotos do produto;
            </li>
            <li>
              Nossa equipe informa o endereço de devolução e orienta o envio pelos Correios ou por
              transportadora, com postagem por nossa conta, sem custo para você. Basta embalar o
              produto e entregá-lo conforme a orientação;
            </li>
            <li>
              Após o recebimento e a conferência do produto, o reembolso é processado na mesma
              forma de pagamento utilizada na compra, em até 10 dias úteis.
            </li>
          </ol>
        </LegalSection>

        <LegalSection heading="5. Como funciona o reembolso">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Pix:</strong> o valor é devolvido na conta de origem do pagamento;
            </li>
            <li>
              <strong>Cartão de crédito:</strong> o estorno é feito no mesmo cartão e aparece na
              fatura conforme o calendário da operadora do cartão, geralmente em uma ou duas
              faturas;
            </li>
            <li>
              O reembolso é do valor total pago, incluindo o frete cobrado na compra, quando a
              devolução ocorre por arrependimento ou por defeito;
            </li>
            <li>Não descontamos nenhuma taxa de devolução ou de reposição do valor reembolsado.</li>
          </ul>
        </LegalSection>

        <LegalSection heading="6. Condições para aceite da devolução">
          <ul className="list-disc space-y-1 pl-5">
            <li>Produto sem sinais de uso, lavagem ou desgaste (exceto em casos de defeito);</li>
            <li>Embalagem original preservada, sempre que possível;</li>
            <li>Etiquetas e acessórios originais inclusos.</li>
          </ul>
          <p>
            Se, na conferência, identificarmos algo que impeça a devolução, entramos em contato com
            você antes de qualquer decisão, para resolver juntos.
          </p>
        </LegalSection>

        <LegalSection heading="7. Itens não contemplados">
          <p>
            Produtos personalizados ou fabricados sob encomenda específica para o cliente podem não
            ser elegíveis para devolução por arrependimento, exceto em caso de defeito, conforme
            indicado na página do produto no momento da compra.
          </p>
        </LegalSection>

        <LegalSection heading="8. Quem vende">
          <p>
            Loja operada por <strong>ALNA COMMERCE LTDA</strong>, CNPJ 57.135.009/0001-27, com sede
            em Brusque, Santa Catarina, Brasil.
          </p>
        </LegalSection>

        <LegalSection heading="9. Contato">
          <p>
            Nossa equipe está pronta para ajudar em qualquer etapa do processo. Fale conosco pelo
            WhatsApp (51) 99491-1125, segunda a sexta das 8h às 18h e sábado das 8h às 12h.
          </p>
        </LegalSection>
      </div>
    </LegalPageLayout>
  );
}
