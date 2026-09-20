import { createFileRoute } from "@tanstack/react-router";

import { LegalPageLayout, LegalSection } from "@/components/site/legal-page-layout";

const SITE_URL = "https://store.alnacommerce.com/termos-de-uso";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso - Alna Commerce" },
      {
        name: "description",
        content:
          "Condições gerais de uso do site e da loja online da Alna Commerce: cadastro, pedidos, pagamentos e responsabilidades.",
      },
      { property: "og:title", content: "Termos de Uso - Alna Commerce" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
  }),
  component: TermosDeUsoPage,
});

function TermosDeUsoPage() {
  return (
    <LegalPageLayout title="Termos de Uso" updatedAt="setembro de 2026">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Estes Termos de Uso regulam o acesso e a utilização do site alna.cc ("Site"), operado por
        ALNA COMMERCE, inscrita no CNPJ sob o nº 57.135.009/0001-27, com sede em Brusque, Santa
        Catarina. Ao acessar o Site ou realizar uma compra, você concorda com estes termos. Leia-os
        com atenção.
      </p>

      <LegalSection heading="1. Cadastro e conta">
        <p>
          Para realizar uma compra, pode ser necessário criar uma conta com informações verdadeiras,
          completas e atualizadas. Você é responsável por manter a confidencialidade da sua senha e
          por todas as atividades realizadas em sua conta.
        </p>
      </LegalSection>

      <LegalSection heading="2. Produtos, preços e disponibilidade">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Os preços exibidos no Site incluem os tributos aplicáveis e podem ser alterados sem
            aviso prévio, respeitando os pedidos já confirmados;
          </li>
          <li>
            A disponibilidade dos produtos está sujeita a estoque. Em caso de indisponibilidade
            após a confirmação do pedido, você será informado e o valor pago será integralmente
            reembolsado;
          </li>
          <li>
            Empregamos esforços razoáveis para que fotos e descrições sejam fiéis aos produtos;
            pequenas variações de cor, textura ou dimensão (comuns em peças de madeira artesanal e
            têxteis) podem ocorrer.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Pedidos e pagamento">
        <p>
          O pedido é considerado confirmado após a aprovação do pagamento pela instituição
          financeira ou processadora responsável. As formas de pagamento aceitas são exibidas no
          momento da finalização da compra. A Alna Commerce reserva-se o direito de cancelar
          pedidos com indícios de fraude, mediante comunicação ao cliente.
        </p>
      </LegalSection>

      <LegalSection heading="4. Frete e entrega">
        <p>
          Os prazos de entrega informados no Site são estimativas calculadas com base no endereço
          de destino e na transportadora selecionada, contadas a partir da confirmação do
          pagamento. Prazos podem variar por motivos alheios à nossa vontade, como condições
          logísticas ou climáticas.
        </p>
      </LegalSection>

      <LegalSection heading="5. Trocas, devoluções e arrependimento">
        <p>
          As condições de troca, devolução e o direito de arrependimento previsto no Código de
          Defesa do Consumidor estão detalhados em nossa{" "}
          <a
            href="/politica-de-troca-e-devolucao"
            className="font-medium text-[#12294f] underline"
          >
            Política de Trocas e Devoluções
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="6. Uso do Site">
        <p>Ao utilizar o Site, você concorda em não:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Utilizá-lo para fins ilícitos ou que violem direitos de terceiros;</li>
          <li>Tentar acessar áreas restritas ou dados de outros usuários sem autorização;</li>
          <li>Interferir no funcionamento normal do Site ou de seus sistemas.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="7. Propriedade intelectual">
        <p>
          A marca ALNA, o logotipo, os textos, imagens e demais conteúdos do Site são de
          propriedade da Alna Commerce ou de seus licenciadores, sendo protegidos pela legislação
          de propriedade intelectual. É vedada a reprodução, distribuição ou uso comercial sem
          autorização prévia por escrito.
        </p>
      </LegalSection>

      <LegalSection heading="8. Limitação de responsabilidade">
        <p>
          Envidamos esforços para manter o Site disponível e livre de erros, mas não garantimos
          operação ininterrupta. A Alna Commerce não se responsabiliza por danos indiretos
          decorrentes do uso do Site, exceto nos casos previstos em lei.
        </p>
      </LegalSection>

      <LegalSection heading="9. Alterações destes termos">
        <p>
          Estes Termos de Uso podem ser atualizados periodicamente. A versão vigente é sempre a
          publicada nesta página, com a respectiva data de atualização.
        </p>
      </LegalSection>

      <LegalSection heading="10. Lei aplicável e foro">
        <p>
          Estes termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de
          Brusque, Santa Catarina, para dirimir eventuais controvérsias, ressalvado o direito do
          consumidor de optar pelo foro de seu domicílio.
        </p>
      </LegalSection>

      <LegalSection heading="11. Contato">
        <p>
          Dúvidas sobre estes Termos de Uso podem ser enviadas para{" "}
          <a href="mailto:contato@alna.cc" className="font-medium text-[#12294f] underline">
            contato@alna.cc
          </a>{" "}
          ou pelo WhatsApp (51) 99491-1125.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
