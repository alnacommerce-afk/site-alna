// Customer e-mails for the order milestones that happen after payment: "pedido preparado" (label
// generated), "deixado no ponto de coleta" (posted, with tracking code), "pedido cancelado" (payment
// refused) and "estorno registrado". Shared so every
// place that observes the milestone (label generation, delivery sync, Asaas webhook) sends the very
// same message and can't double-send.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "./send-email.ts";
import { renderEmailTemplate } from "./render-template.ts";

const SITE_URL = "https://store.alna.sale";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function getResendKey(admin: SupabaseClient) {
  return await admin
    .rpc("get_integration_secret", { p_integration_id: "resend" })
    .then((r) => r.data as string | null);
}

// Every label we generate is a J&T Express one (service 33 in generate-shipping-label), and this is
// the public tracking page for that carrier.
export function trackingLink(trackingCode: string) {
  return `https://www.melhorrastreio.com.br/app/jet/${encodeURIComponent(trackingCode)}`;
}

/**
 * "Seu pedido foi preparado" — the label was generated, the parcel will be left at the collection
 * point. Needs no tracking code. Safe to call from several places: the claim on
 * `orders.prepared_email_sent_at` (only one caller flips it from null) guarantees a single e-mail.
 */
export async function notifyOrderPrepared(admin: SupabaseClient, orderId: string) {
  const { data: claimed } = await admin
    .from("orders")
    .update({ prepared_email_sent_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("prepared_email_sent_at", null)
    .select("id, customer_name, customer_email")
    .maybeSingle();
  if (!claimed?.customer_email) return false;

  const rendered = await renderEmailTemplate(admin, "order_prepared", {
    nome: claimed.customer_name ?? "cliente",
    pedido_curto: claimed.id.slice(0, 8),
    link_conta: `${SITE_URL}/conta`,
  });
  if (!rendered) return false;
  await sendEmail(await getResendKey(admin), {
    to: claimed.customer_email,
    subject: rendered.subject,
    html: rendered.html,
    template: rendered.templateId,
  });
  return true;
}

/**
 * "Seu pedido já foi deixado no ponto de coleta" with the tracking code and the tracking link. Called
 * once the carrier has registered the posting. Nothing is sent (and nothing is claimed, so the next
 * run tries again) until there is a tracking code to show; the claim on `orders.posted_email_sent_at`
 * guarantees a single e-mail per order.
 */
export async function notifyOrderPosted(
  admin: SupabaseClient,
  orderId: string,
  trackingCode: string | null,
) {
  if (!trackingCode) return false;

  const { data: claimed } = await admin
    .from("orders")
    .update({ posted_email_sent_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("posted_email_sent_at", null)
    .select("id, customer_name, customer_email")
    .maybeSingle();
  if (!claimed?.customer_email) return false;

  const rendered = await renderEmailTemplate(admin, "order_posted", {
    nome: claimed.customer_name ?? "cliente",
    pedido_curto: claimed.id.slice(0, 8),
    codigo_rastreio: trackingCode,
    link_rastreio: trackingLink(trackingCode),
    link_conta: `${SITE_URL}/conta`,
  });
  if (!rendered) return false;
  await sendEmail(await getResendKey(admin), {
    to: claimed.customer_email,
    subject: rendered.subject,
    html: rendered.html,
    template: rendered.templateId,
  });
  return true;
}

type OrderForStatusEmail = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  total_cents: number;
};

/** The payment was refused / reproved (or a paid order was cancelled). Callers send this once. */
export async function notifyOrderCancelled(admin: SupabaseClient, order: OrderForStatusEmail) {
  if (!order.customer_email) return;
  const rendered = await renderEmailTemplate(admin, "order_cancelled", {
    nome: order.customer_name ?? "cliente",
    pedido_curto: order.id.slice(0, 8),
    total: formatBRL(order.total_cents),
    link_loja: `${SITE_URL}/loja`,
  });
  if (!rendered) return;
  await sendEmail(await getResendKey(admin), {
    to: order.customer_email,
    subject: rendered.subject,
    html: rendered.html,
    template: rendered.templateId,
  });
}

/** The money went back to the customer. Callers send this once. */
export async function notifyOrderRefunded(admin: SupabaseClient, order: OrderForStatusEmail) {
  if (!order.customer_email) return;
  const rendered = await renderEmailTemplate(admin, "order_refunded", {
    nome: order.customer_name ?? "cliente",
    pedido_curto: order.id.slice(0, 8),
    total: formatBRL(order.total_cents),
  });
  if (!rendered) return;
  await sendEmail(await getResendKey(admin), {
    to: order.customer_email,
    subject: rendered.subject,
    html: rendered.html,
    template: rendered.templateId,
  });
}
