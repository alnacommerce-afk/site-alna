// Public. Gives a still-unpaid PIX order a QR Code that can really be paid, so a customer who opens the order link
// (from the reminder e-mails, for example) never ends in a dead screen. The order id is unguessable (UUID).
//
//  1. If the charge of the order exists in the CURRENT Asaas account and is payable, its QR Code is returned
//     (a Pix QR Code stays valid for a long time after the due date, so most of the time nothing new is created).
//  2. If it does not exist here (charge made in the previous Asaas account, or deleted), a NEW Pix charge with the
//     same order total is created in the current account and saved on the order. If the old charge is still alive in
//     this account it is cancelled afterwards, so the customer can never pay twice.
//  3. Never creates anything when Asaas is merely failing (5xx/401): the customer just tries again.
// Limits: 3 new charges per order, only orders younger than 30 days, one generation at a time per order.
import { createClient } from "jsr:@supabase/supabase-js@2";

const ASAAS_API = "https://api.asaas.com/v3";
const MAX_REGENERATIONS = 3;
const MAX_ORDER_AGE_DAYS = 30;
const CLAIM_WINDOW_MS = 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAID_STATUSES = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);
const PAYABLE_STATUSES = new Set(["PENDING", "OVERDUE", "AWAITING_RISK_ANALYSIS"]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const onlyDigits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const todayISODate = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

type Pix = { encodedImage: string; payload: string; expirationDate: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await req.json().catch(() => null);
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
    if (!UUID_RE.test(orderId)) return jsonResponse({ error: "Pedido inválido." }, 400);

    const { data: order } = await admin
      .from("orders")
      .select(
        "id, status, payment_method, payment_id, total_cents, created_at, customer_name, customer_email, customer_phone, customer_document, shipping_address, pix_regenerated_count, pix_regenerated_at",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return jsonResponse({ error: "Pedido não encontrado." }, 404);

    if (order.status === "cancelled") return jsonResponse({ state: "cancelled" });
    if (order.status !== "pending") return jsonResponse({ state: "paid" });
    if (order.payment_method !== "pix") return jsonResponse({ state: "not_pix" });
    const ageDays = (Date.now() - new Date(order.created_at).getTime()) / 86400000;
    if (ageDays > MAX_ORDER_AGE_DAYS) return jsonResponse({ state: "too_old" });

    const asaasKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "payment_gateway" })
      .then((r) => r.data as string | null);
    if (!asaasKey) return jsonResponse({ error: "Pagamento indisponível no momento." }, 503);
    const headers = {
      access_token: asaasKey,
      "Content-Type": "application/json",
      "User-Agent": "ALNA (noreply@alna.sale)",
    };

    async function fetchQr(paymentId: string): Promise<{ pix: Pix | null; status: number }> {
      const resp = await fetch(`${ASAAS_API}/payments/${paymentId}/pixQrCode`, {
        headers,
        signal: AbortSignal.timeout(15000),
      });
      return { pix: resp.ok ? ((await resp.json()) as Pix) : null, status: resp.status };
    }

    // 1) Does the charge of this order exist, and can it still be paid, in the current account?
    let oldPaymentAlive = false;
    if (order.payment_id) {
      const payResp = await fetch(`${ASAAS_API}/payments/${order.payment_id}`, {
        headers,
        signal: AbortSignal.timeout(15000),
      });
      if (payResp.ok) {
        const payment = await payResp.json();
        if (PAID_STATUSES.has(payment.status)) return jsonResponse({ state: "paid" });
        if (!payment.deleted && PAYABLE_STATUSES.has(payment.status)) {
          const qr = await fetchQr(order.payment_id);
          if (qr.pix) return jsonResponse({ state: "pix", pix: qr.pix, regenerated: false });
          if (qr.status >= 500 || qr.status === 401 || qr.status === 403) {
            return jsonResponse({ error: "A Asaas não respondeu agora. Tente de novo em instantes." }, 502);
          }
          oldPaymentAlive = true; // payable charge whose QR cannot be read: replace it (and cancel it below)
        }
      } else if (payResp.status !== 404) {
        // Not "this charge does not exist here" but an Asaas/credential problem: create nothing.
        return jsonResponse({ error: "A Asaas não respondeu agora. Tente de novo em instantes." }, 502);
      }
    }

    // 2) A new charge is needed. Claim the right to create it: limited, and one at a time.
    const count = Number(order.pix_regenerated_count ?? 0);
    if (count >= MAX_REGENERATIONS) return jsonResponse({ state: "limit" });
    const claimLimit = new Date(Date.now() - CLAIM_WINDOW_MS).toISOString();
    const { data: claimed } = await admin
      .from("orders")
      .update({ pix_regenerated_at: new Date().toISOString(), pix_regenerated_count: count + 1 })
      .eq("id", order.id)
      .eq("pix_regenerated_count", count)
      .or(`pix_regenerated_at.is.null,pix_regenerated_at.lt.${claimLimit}`)
      .select("id")
      .maybeSingle();
    if (!claimed) return jsonResponse({ state: "busy" });
    // A failure BEFORE a new charge exists must not use up one of the 3 attempts.
    const releaseClaim = () =>
      admin.from("orders").update({ pix_regenerated_at: null, pix_regenerated_count: count }).eq("id", order.id);

    const cpfCnpj = onlyDigits(order.customer_document);
    if (!cpfCnpj) {
      await releaseClaim();
      return jsonResponse({ error: "Pedido sem CPF/CNPJ." }, 422);
    }
    const address = (order.shipping_address ?? {}) as Record<string, string>;

    const findResp = await fetch(`${ASAAS_API}/customers?cpfCnpj=${cpfCnpj}`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!findResp.ok) {
      await releaseClaim();
      return jsonResponse({ error: "A Asaas não respondeu agora. Tente de novo em instantes." }, 502);
    }
    let customerId: string | undefined = (await findResp.json())?.data?.[0]?.id;
    if (!customerId) {
      const createResp = await fetch(`${ASAAS_API}/customers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: order.customer_name,
          cpfCnpj,
          email: order.customer_email,
          mobilePhone: onlyDigits(order.customer_phone),
          postalCode: onlyDigits(address.zip),
          address: address.street,
          addressNumber: address.number,
          province: address.neighborhood,
          // Our own branded e-mails are the only ones the customer should get.
          notificationDisabled: true,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!createResp.ok) {
        console.error("[regenerate-pix] falha ao criar cliente", createResp.status, (await createResp.text()).slice(0, 300));
        await releaseClaim();
        return jsonResponse({ error: "Não foi possível gerar o Pix agora." }, 502);
      }
      customerId = (await createResp.json()).id;
    }

    const payResp = await fetch(`${ASAAS_API}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: "PIX",
        value: order.total_cents / 100,
        dueDate: todayISODate(),
        description: `Pedido ALNA #${order.id.slice(0, 8)}`,
        externalReference: order.id,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!payResp.ok) {
      console.error("[regenerate-pix] falha ao criar cobrança", payResp.status, (await payResp.text()).slice(0, 300));
      await releaseClaim();
      return jsonResponse({ error: "Não foi possível gerar o Pix agora." }, 502);
    }
    const payment = await payResp.json();

    // Save the new charge on the order BEFORE cancelling the old one: the webhook finds orders by payment id, so
    // the "deleted" event of the old charge no longer matches this order and cannot cancel it.
    const oldPaymentId = order.payment_id as string | null;
    await admin
      .from("orders")
      .update({ payment_id: payment.id, payment_status: payment.status ?? "PENDING", asaas_customer_id: customerId })
      .eq("id", order.id);

    if (oldPaymentAlive && oldPaymentId) {
      await fetch(`${ASAAS_API}/payments/${oldPaymentId}`, { method: "DELETE", headers, signal: AbortSignal.timeout(15000) }).catch(
        (error) => console.error("[regenerate-pix] falha ao cancelar a cobrança antiga", error),
      );
    }

    const qr = await fetchQr(payment.id);
    if (!qr.pix) return jsonResponse({ error: "O Pix foi criado, mas ainda não conseguimos mostrá-lo. Tente de novo." }, 502);
    return jsonResponse({ state: "pix", pix: qr.pix, regenerated: true });
  } catch (error) {
    console.error("[regenerate-pix]", error);
    return jsonResponse({ error: "Não foi possível gerar o Pix agora." }, 500);
  }
});
