const SITE_URL = "https://alnacommerce.com";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function shell(bodyHtml: string) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #12294f;">
    <h1 style="font-size: 20px; color: #12294f;">Alna Commerce</h1>
    ${bodyHtml}
    <p style="margin-top: 32px; font-size: 12px; color: #6b7280;">
      Alna Commerce — CNPJ 57.135.009/0001-27<br />
      Dúvidas? Responda este e-mail ou fale com a gente pelo WhatsApp.
    </p>
  </div>`;
}

export function orderReceivedEmailHtml(params: {
  orderId: string;
  customerName: string;
  totalCents: number;
  isPix: boolean;
  newAccount: { email: string; password: string } | null;
}) {
  const { orderId, customerName, totalCents, isPix, newAccount } = params;
  const orderShort = orderId.slice(0, 8);

  const pixNotice = isPix
    ? `<p>Finalize o pagamento escaneando o QR Code ou usando o código copia-e-cola que apareceu na tela.</p>`
    : "";

  const accountNotice = newAccount
    ? `<div style="margin-top: 16px; padding: 12px 16px; background: #f0fdf4; border-radius: 8px;">
         <p style="margin: 0 0 8px;"><strong>Criamos uma conta para você acompanhar seus pedidos:</strong></p>
         <p style="margin: 0;">E-mail: <strong>${newAccount.email}</strong></p>
         <p style="margin: 0;">Senha temporária: <strong>${newAccount.password}</strong></p>
         <p style="margin: 8px 0 0;">
           Acesse em <a href="${SITE_URL}/conta/login">${SITE_URL}/conta/login</a> e recomendamos
           trocar a senha assim que entrar.
         </p>
       </div>`
    : "";

  return shell(`
    <p>Olá, ${customerName}!</p>
    <p>Recebemos seu pedido <strong>#${orderShort}</strong> no valor de <strong>${formatBRL(totalCents)}</strong>.</p>
    ${pixNotice}
    ${accountNotice}
    <p style="margin-top: 20px;">
      <a href="${SITE_URL}/pedido/${orderId}" style="color: #16a34a;">Acompanhar meu pedido</a>
    </p>
  `);
}

export function paymentConfirmedEmailHtml(params: {
  orderId: string;
  customerName: string;
  totalCents: number;
}) {
  const { orderId, customerName, totalCents } = params;
  const orderShort = orderId.slice(0, 8);

  return shell(`
    <p>Olá, ${customerName}!</p>
    <p>✅ Pagamento confirmado para o pedido <strong>#${orderShort}</strong> (${formatBRL(totalCents)}).</p>
    <p>Seu pedido já está sendo preparado para envio.</p>
    <p style="margin-top: 20px;">
      <a href="${SITE_URL}/conta" style="color: #16a34a;">Acompanhar meu pedido</a>
    </p>
  `);
}
