import { createFileRoute } from "@tanstack/react-router";
import { CONTACT_EMAIL } from "@/lib/site-urls";

import { LegalPageLayout, LegalSection } from "@/components/site/legal-page-layout";

const SITE_URL = "https://store.alna.sale/politica-de-privacidade";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade - Alna Commerce" },
      {
        name: "description",
        content:
          "Saiba como a Alna Commerce coleta, usa e protege seus dados pessoais, em conformidade com a LGPD.",
      },
      { property: "og:title", content: "Política de Privacidade - Alna Commerce" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
  }),
  component: PoliticaDePrivacidadePage,
});

function PoliticaDePrivacidadePage() {
  return (
    <LegalPageLayout title="Política de Privacidade" updatedAt="setembro de 2026">
      <p className="text-sm leading-relaxed text-muted-foreground">
        A ALNA COMMERCE (CNPJ 57.135.009/0001-27), com sede em Brusque, Santa Catarina, respeita a
        sua privacidade e está comprometida em proteger os dados pessoais dos usuários e clientes
        do site alna.sale ("Site"), em conformidade com a Lei Geral de Proteção de Dados (Lei nº
        13.709/2018 — LGPD). Esta política explica quais dados coletamos, por que os coletamos e
        como você pode exercer seus direitos.
      </p>

      <LegalSection heading="1. Quais dados coletamos">
        <p>Coletamos os seguintes tipos de dados, conforme sua interação com o Site:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Dados de identificação e contato:</strong> nome, e-mail, telefone/WhatsApp e
            endereço, fornecidos ao criar uma conta, fazer um pedido ou entrar em contato conosco.
          </li>
          <li>
            <strong>Dados de pedidos e pagamento:</strong> itens comprados, valores e forma de
            pagamento. Os dados do seu cartão ou meio de pagamento são processados diretamente
            pela instituição financeira ou processadora de pagamentos escolhida no checkout — a
            Alna Commerce não armazena números completos de cartão de crédito.
          </li>
          <li>
            <strong>Dados de navegação:</strong> endereço IP, tipo de navegador, páginas
            visitadas e cookies, coletados automaticamente para melhorar sua experiência e a
            segurança do Site.
          </li>
          <li>
            <strong>Dados de comunicação:</strong> mensagens enviadas pelo formulário de contato,
            e-mail ou WhatsApp.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. Como usamos seus dados">
        <ul className="list-disc space-y-1 pl-5">
          <li>Processar e entregar seus pedidos, incluindo cálculo e contratação de frete;</li>
          <li>Emitir nota fiscal e cumprir obrigações legais e fiscais;</li>
          <li>Prestar atendimento e suporte ao cliente;</li>
          <li>
            Enviar comunicações sobre seu pedido e, mediante seu consentimento, ofertas e
            novidades por e-mail ou WhatsApp;
          </li>
          <li>Prevenir fraudes e garantir a segurança das transações;</li>
          <li>Cumprir obrigações legais e regulatórias.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Com quem compartilhamos seus dados">
        <p>
          Compartilhamos dados apenas com terceiros estritamente necessários para a operação do
          Site e do seu pedido, tais como:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Transportadoras e plataformas de frete, para entrega dos produtos;</li>
          <li>Processadoras de pagamento, para viabilizar a cobrança;</li>
          <li>
            Provedores de infraestrutura de tecnologia (hospedagem, banco de dados e envio de
            e-mails transacionais), que tratam os dados em nosso nome e sob nossas instruções;
          </li>
          <li>Autoridades públicas, quando exigido por lei ou ordem judicial.</li>
        </ul>
        <p>Não vendemos seus dados pessoais a terceiros.</p>
      </LegalSection>

      <LegalSection heading="4. Cookies">
        <p>
          Utilizamos cookies essenciais para o funcionamento do Site (como manter itens no
          carrinho e sua sessão de login) e, quando aplicável, cookies analíticos para entender
          como o Site é utilizado e melhorá-lo. Você pode gerenciar ou desativar cookies nas
          configurações do seu navegador, ciente de que isso pode afetar algumas funcionalidades
          do Site.
        </p>
      </LegalSection>

      <LegalSection heading="5. Seus direitos como titular de dados">
        <p>Nos termos da LGPD, você tem direito a:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Confirmar a existência de tratamento e acessar seus dados;</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
          <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>Solicitar a portabilidade dos seus dados a outro fornecedor;</li>
          <li>Revogar o consentimento e solicitar a eliminação dos dados tratados com base nele;</li>
          <li>Obter informações sobre com quem compartilhamos seus dados.</li>
        </ul>
        <p>
          Para exercer qualquer um desses direitos, entre em contato pelo WhatsApp (51) 99491-1125 ou pelo e-mail {CONTACT_EMAIL}.
        </p>
      </LegalSection>

      <LegalSection heading="6. Segurança e retenção dos dados">
        <p>
          Adotamos medidas técnicas e organizacionais razoáveis para proteger seus dados contra
          acesso não autorizado, perda ou alteração indevida. Mantemos seus dados pelo tempo
          necessário para cumprir as finalidades descritas nesta política e as obrigações legais e
          fiscais aplicáveis (por exemplo, dados de notas fiscais são mantidos pelo prazo exigido
          pela legislação tributária).
        </p>
      </LegalSection>

      <LegalSection heading="7. Alterações desta política">
        <p>
          Esta Política de Privacidade pode ser atualizada periodicamente para refletir mudanças
          em nossas práticas ou na legislação. A data da última atualização está indicada no topo
          desta página.
        </p>
      </LegalSection>

      <LegalSection heading="8. Contato">
        <p>
          Dúvidas sobre esta Política de Privacidade ou sobre o tratamento dos seus dados podem
          ser enviadas pelo WhatsApp (51) 99491-1125 ou pelo e-mail {CONTACT_EMAIL}.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
