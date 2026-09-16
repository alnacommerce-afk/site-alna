// Shared by checkout-create (card approved synchronously) and asaas-webhook (Pix / any async
// confirmation) so the "payment confirmed" e-mail is sent from exactly one place, regardless of
// which of the two ever observes the order turning into "paid" first. Callers are responsible for
// only invoking this once per order (both already guard on "was the previous status already paid?").
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { randomPassword } from "./random-password.ts";
import { sendEmail } from "./send-email.ts";
import { renderEmailTemplate } from "./render-template.ts";

const SITE_URL = "https://alnacommerce.com";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type OrderForPaymentNotify = {
  id: string;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  total_cents: number;
  is_new_account: boolean;
  referrer_user_id: string | null;
};

export async function notifyPaymentConfirmed(admin: SupabaseClient, order: OrderForPaymentNotify) {
  const resendKey = await admin
    .rpc("get_integration_secret", { p_integration_id: "resend" })
    .then((r) => r.data as string | null);

  // Only now — with the payment actually confirmed — do we generate and send a login password.
  // Nothing was ever persisted or e-mailed at order-creation time, so an unpaid/abandoned order
  // never leaks account access.
  let contaBloco = "";
  if (order.is_new_account && order.user_id && order.customer_email) {
    const freshPassword = randomPassword(8);
    const { error: passwordError } = await admin.auth.admin.updateUserById(order.user_id, {
      password: freshPassword,
    });
    if (!passwordError) {
      contaBloco = `<div style="margin-top: 16px; padding: 12px 16px; background: #f0fdf4; border-radius: 8px;">
        <p style="margin: 0 0 8px;"><strong>Criamos uma conta para você acompanhar seus pedidos:</strong></p>
        <p style="margin: 0;">E-mail: <strong>${order.customer_email}</strong></p>
        <p style="margin: 0;">Senha temporária: <strong>${freshPassword}</strong></p>
        <p style="margin: 8px 0 0;">Acesse em <a href="${SITE_URL}/conta/login">${SITE_URL}/conta/login</a> e recomendamos trocar a senha assim que entrar.</p>
      </div>`;
    } else {
      console.error("[notify-payment-confirmed] falha ao definir senha da conta nova", passwordError);
    }
  }

  if (order.customer_email) {
    const rendered = await renderEmailTemplate(admin, "payment_confirmed", {
      nome: order.customer_name ?? "cliente",
      pedido_curto: order.id.slice(0, 8),
      total: formatBRL(order.total_cents),
      link_conta: `${SITE_URL}/conta`,
      conta_bloco: contaBloco,
    });
    if (rendered) {
      await sendEmail(resendKey, { to: order.customer_email, subject: rendered.subject, html: rendered.html });
    }
  }

  if (order.referrer_user_id) {
    await creditReferralReward(admin, order.referrer_user_id, resendKey);
  }
}

async function creditReferralReward(admin: SupabaseClient, referrerUserId: string, resendKey: string | null) {
  const { data: userResult, error: userError } = await admin.auth.admin.getUserById(referrerUserId);
  const referrer = userResult?.user;
  if (userError || !referrer?.email) {
    console.error("[notify-payment-confirmed] indicador não encontrado", referrerUserId, userError);
    return;
  }

  const code = `INDIQUE-${randomPassword(6).toUpperCase()}`;
  const { error: couponError } = await admin.from("coupons").insert({
    code,
    discount_percent: 5,
    active: true,
  });
  if (couponError) {
    console.error("[notify-payment-confirmed] falha ao gerar cupom de indicação", couponError);
    return;
  }

  const rendered = await renderEmailTemplate(admin, "referral_reward", {
    nome: (referrer.user_metadata as { name?: string } | null)?.name ?? "cliente",
    cupom_codigo: code,
  });
  if (rendered) {
    await sendEmail(resendKey, { to: referrer.email, subject: rendered.subject, html: rendered.html });
  }
}
