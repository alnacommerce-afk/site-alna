// Public (guest checkout, no login yet). This is the single source of truth for order pricing —
// the browser only ever sends variantId+quantity; price, shipping and installment fee are always
// recomputed here from the database and from Melhor Envio/Asaas, never trusted from the client.
//
// Card data (number/ccv) passes through this function in memory only, over HTTPS, and is never
// logged or persisted — it's relayed straight to Asaas in the same request.
//
// Asaas API key: Supabase Vault, Admin > Conexões de API, integration id "payment_gateway".
import { createClient } from "jsr:@supabase/supabase-js@2";
import { randomPassword } from "../_shared/random-password.ts";
import { sendEmail } from "../_shared/send-email.ts";
import { renderEmailTemplate } from "../_shared/render-template.ts";
import { notifyPaymentConfirmed } from "../_shared/notify-payment-confirmed.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://alnacommerce.com";
const JT_EXPRESS_SERVICE_ID = "33";
const PIX_DISCOUNT = 0.04;
const ASAAS_API = "https://api.asaas.com/v3";

// Asaas "Cobranças online" fees for this account (see Asaas > Minha conta > Taxas).
// Promotional pricing is valid until 14/12/2026 — after that, switch to the standard column.
// TODO revisar antes de 14/12/2026: promo 1,99/2,49/2,99% -> padrão 2,99/3,49/3,99% (+ R$0,49 fixo).
const CARD_FEE_TIERS: { max: number; pct: number }[] = [
  { max: 1, pct: 0.0199 },
  { max: 6, pct: 0.0249 },
  { max: 12, pct: 0.0299 },
];
const CARD_FIXED_FEE_CENTS = 49;

type CheckoutItem = { variantId: string; quantity: number };
type CheckoutBody = {
  customer: { name: string; cpfCnpj: string; email: string; phone: string };
  shippingAddress: {
    zip: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  items: CheckoutItem[];
  paymentMethod: "pix" | "credit_card";
  installmentCount?: number;
  couponCode?: string;
  referredByCode?: string;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function onlyDigits(value: string) {
  return (value ?? "").replace(/\D/g, "");
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function cardFeePercentFor(installmentCount: number) {
  const tier = CARD_FEE_TIERS.find((t) => installmentCount <= t.max);
  return (tier ?? CARD_FEE_TIERS[CARD_FEE_TIERS.length - 1]).pct;
}

/** Grosses up the amount so Alna nets exactly `baseCents` after Asaas's cut. */
function grossUpForCardFee(baseCents: number, installmentCount: number) {
  const pct = cardFeePercentFor(installmentCount);
  const totalCents = Math.round((baseCents + CARD_FIXED_FEE_CENTS) / (1 - pct));
  return totalCents;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);

  let orderId: string | null = null;

  try {
    const body = (await req.json()) as CheckoutBody;

    if (!body.items?.length) return jsonResponse({ error: "Carrinho vazio." }, 400);
    if (!body.customer?.cpfCnpj || !body.customer?.name || !body.customer?.email) {
      return jsonResponse({ error: "Dados do comprador incompletos." }, 400);
    }
    if (!body.shippingAddress?.zip) {
      return jsonResponse({ error: "Endereço de entrega incompleto." }, 400);
    }
    if (body.paymentMethod === "credit_card" && !body.creditCard) {
      return jsonResponse({ error: "Dados do cartão ausentes." }, 400);
    }

    const installmentCount =
      body.paymentMethod === "credit_card" ? Math.min(12, Math.max(1, body.installmentCount ?? 1)) : 1;

    // 1. Recompute subtotal from the database — never trust prices from the client.
    const { data: variants, error: variantsError } = await admin
      .from("product_variants")
      .select(
        "id, name, sku, price_cents, product_id, products(title), package_height_cm, package_length_cm, package_weight_kg, package_width_cm",
      )
      .in("id", body.items.map((i) => i.variantId));
    if (variantsError) throw variantsError;
    if (!variants || variants.length !== body.items.length) {
      return jsonResponse({ error: "Um ou mais produtos não foram encontrados." }, 400);
    }

    const orderItemsPayload = body.items.map((item) => {
      const variant = variants.find((v) => v.id === item.variantId)!;
      return {
        product_variant_id: variant.id,
        product_title: (variant.products as { title: string } | null)?.title ?? "Produto",
        variant_name: variant.name,
        sku: variant.sku,
        unit_price_cents: variant.price_cents,
        quantity: item.quantity,
      };
    });
    const subtotalCents = orderItemsPayload.reduce(
      (sum, i) => sum + i.unit_price_cents * i.quantity,
      0,
    );

    // 1b. Validate the coupon server-side — never trust a discount value from the client.
    let discountCents = 0;
    let appliedCouponCode: string | null = null;
    if (body.couponCode) {
      const code = body.couponCode.trim().toUpperCase();
      const { data: coupon } = await admin
        .from("coupons")
        .select("code, discount_percent, valid_from, valid_until, active")
        .eq("code", code)
        .maybeSingle();
      const now = new Date();
      const withinWindow =
        coupon?.active &&
        (!coupon.valid_from || new Date(coupon.valid_from) <= now) &&
        (!coupon.valid_until || new Date(coupon.valid_until) >= now);
      if (withinWindow) {
        discountCents = Math.round(subtotalCents * (Number(coupon.discount_percent) / 100));
        appliedCouponCode = coupon.code;
      }
    }

    // 2. Real shipping quote (J&T Express only), same logic as calculate-shipping.
    const { data: settings } = await admin
      .from("site_settings")
      .select("shipping_origin_zip, free_shipping_threshold_cents")
      .eq("id", "default")
      .maybeSingle();
    // Default here must match the one in src/routes/index.tsx (used when site_settings has no row).
    const freeShippingThresholdCents = settings?.free_shipping_threshold_cents ?? 10000;
    const freeShipping = subtotalCents >= freeShippingThresholdCents;
    const { data: meToken } = await admin.rpc("get_integration_secret", {
      p_integration_id: "melhor_envio",
    });
    const originZip = onlyDigits(settings?.shipping_origin_zip ?? "");
    const destinationZip = onlyDigits(body.shippingAddress.zip);

    let carrierShippingCents = 0;
    if (originZip.length === 8 && destinationZip.length === 8 && meToken) {
      const meProducts = body.items.map((item) => {
        const variant = variants.find((v) => v.id === item.variantId)!;
        return {
          id: variant.id,
          width: Math.max(11, variant.package_width_cm ?? 11),
          height: Math.max(2, variant.package_height_cm ?? 2),
          length: Math.max(16, variant.package_length_cm ?? 16),
          weight: Math.max(0.1, variant.package_weight_kg ?? 0.3),
          insurance_value: (variant.price_cents / 100) * item.quantity,
          quantity: item.quantity,
        };
      });
      const meResp = await fetch("https://melhorenvio.com.br/api/v2/me/shipment/calculate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${meToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "Alna Commerce (contato@alna.cc)",
        },
        body: JSON.stringify({
          from: { postal_code: originZip },
          to: { postal_code: destinationZip },
          products: meProducts,
          services: JT_EXPRESS_SERVICE_ID,
        }),
      });
      if (meResp.ok) {
        const parsed = await meResp.json();
        const options = Array.isArray(parsed) ? parsed : [parsed];
        const jt = (options as Array<Record<string, unknown>>).find(
          (o) => !o.error && String(o.id) === JT_EXPRESS_SERVICE_ID,
        );
        if (jt) carrierShippingCents = Math.round(Number(jt.price) * 100);
      }
    }
    if (carrierShippingCents === 0) {
      return jsonResponse(
        { error: "Não foi possível calcular o frete para esse CEP. Fale com a gente pelo WhatsApp." },
        422,
      );
    }
    // The customer never pays for shipping above the free-shipping threshold — only the actually
    // charged amount (0 when eligible) goes into the order and the Asaas charge.
    const shippingCostCents = freeShipping ? 0 : carrierShippingCents;

    const baseTotalCents = subtotalCents - discountCents + shippingCostCents;
    const totalCents =
      body.paymentMethod === "pix"
        ? Math.round(baseTotalCents * (1 - PIX_DISCOUNT))
        : grossUpForCardFee(baseTotalCents, installmentCount);

    // 3. Find or create a Supabase Auth account for this customer (by e-mail), so they can log in
    // at /conta to track orders. Never touches the password of an existing account.
    let customerUserId = await admin
      .rpc("get_customer_user_id", { p_email: body.customer.email })
      .then((r) => r.data as string | null);
    let newAccount: { email: string; password: string } | null = null;
    if (!customerUserId) {
      const tempPassword = randomPassword(8);
      const { data: created, error: createUserError } = await admin.auth.admin.createUser({
        email: body.customer.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: body.customer.name },
      });
      if (createUserError || !created?.user) throw createUserError ?? new Error("Falha ao criar conta do cliente.");
      customerUserId = created.user.id;
      await admin.from("user_roles").insert({ user_id: customerUserId, role: "customer" });
      newAccount = { email: body.customer.email, password: tempPassword };
    }
    // A new purchase means renewed interest — re-subscribe them to cart-recovery/marketing e-mails
    // if they'd previously opted out (transactional e-mails about their own order never check this).
    await admin.from("email_suppressions").delete().eq("email", body.customer.email);

    // 3b. Resolve a referral code to its owner, if one was carried through from the cart. Ignored
    // for self-referrals — the reward is only ever generated when confirming the OTHER customer's
    // payment, in notify-payment-confirmed.
    let referrerUserId: string | null = null;
    if (body.referredByCode) {
      const { data: referral } = await admin
        .from("referral_codes")
        .select("user_id")
        .eq("code", body.referredByCode.trim().toUpperCase())
        .maybeSingle();
      if (referral && referral.user_id !== customerUserId) {
        referrerUserId = referral.user_id;
      }
    }

    // 4. Find or create the Asaas customer.
    const asaasKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "payment_gateway" })
      .then((r) => r.data as string | null);
    if (!asaasKey) {
      return jsonResponse(
        { error: "Pagamento indisponível no momento (gateway não configurado)." },
        503,
      );
    }
    const cpfCnpj = onlyDigits(body.customer.cpfCnpj);

    const asaasHeaders = {
      access_token: asaasKey,
      "Content-Type": "application/json",
      "User-Agent": "Alna Commerce (contato@alna.cc)",
    };

    const findResp = await fetch(`${ASAAS_API}/customers?cpfCnpj=${cpfCnpj}`, {
      headers: asaasHeaders,
    });
    if (!findResp.ok) throw new Error(`Asaas customers lookup ${findResp.status}`);
    const findJson = await findResp.json();
    let asaasCustomerId: string | undefined = findJson?.data?.[0]?.id;

    if (!asaasCustomerId) {
      const createCustomerResp = await fetch(`${ASAAS_API}/customers`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify({
          name: body.customer.name,
          cpfCnpj,
          email: body.customer.email,
          mobilePhone: onlyDigits(body.customer.phone),
          postalCode: destinationZip,
          address: body.shippingAddress.street,
          addressNumber: body.shippingAddress.number,
          province: body.shippingAddress.neighborhood,
        }),
      });
      if (!createCustomerResp.ok) {
        const errText = await createCustomerResp.text();
        throw new Error(`Asaas create customer ${createCustomerResp.status}: ${errText.slice(0, 300)}`);
      }
      const created = await createCustomerResp.json();
      asaasCustomerId = created.id;
    }

    // 5. Create the order (pending) before calling Asaas, so we always have a record even if the
    // charge fails.
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: customerUserId,
        customer_name: body.customer.name,
        customer_email: body.customer.email,
        customer_phone: body.customer.phone,
        customer_document: cpfCnpj,
        subtotal_cents: subtotalCents,
        shipping_cost_cents: shippingCostCents,
        total_cents: totalCents,
        coupon_code: appliedCouponCode,
        discount_cents: discountCents,
        is_new_account: !!newAccount,
        referrer_user_id: referrerUserId,
        payment_provider: "asaas",
        payment_method: body.paymentMethod,
        installment_count: installmentCount,
        asaas_customer_id: asaasCustomerId,
        shipping_address: body.shippingAddress,
        status: "pending",
      })
      .select("id")
      .single();
    if (orderError || !order) throw orderError ?? new Error("Falha ao criar o pedido.");
    orderId = order.id;

    const { error: itemsError } = await admin
      .from("order_items")
      .insert(orderItemsPayload.map((item) => ({ ...item, order_id: orderId })));
    if (itemsError) throw itemsError;

    const remoteIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "0.0.0.0";

    // 6. Create the charge on Asaas.
    const basePaymentPayload = {
      customer: asaasCustomerId,
      value: totalCents / 100,
      dueDate: todayISODate(),
      description: `Pedido Alna Commerce #${orderId.slice(0, 8)}`,
      externalReference: orderId,
    };

    let paymentResult: Record<string, unknown>;
    let pixQrCode: { encodedImage: string; payload: string; expirationDate: string } | null = null;

    if (body.paymentMethod === "pix") {
      const payResp = await fetch(`${ASAAS_API}/payments`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify({ ...basePaymentPayload, billingType: "PIX" }),
      });
      if (!payResp.ok) {
        const errText = await payResp.text();
        throw new Error(`Asaas create Pix payment ${payResp.status}: ${errText.slice(0, 300)}`);
      }
      paymentResult = await payResp.json();

      const qrResp = await fetch(`${ASAAS_API}/payments/${paymentResult.id}/pixQrCode`, {
        headers: asaasHeaders,
      });
      if (qrResp.ok) pixQrCode = await qrResp.json();
    } else {
      const installmentValueCents = Math.round(totalCents / installmentCount);
      const cc = body.creditCard!;
      const payResp = await fetch(`${ASAAS_API}/payments`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify({
          ...basePaymentPayload,
          billingType: "CREDIT_CARD",
          installmentCount: installmentCount > 1 ? installmentCount : undefined,
          installmentValue: installmentCount > 1 ? installmentValueCents / 100 : undefined,
          remoteIp,
          creditCard: {
            holderName: cc.holderName,
            number: onlyDigits(cc.number),
            expiryMonth: cc.expiryMonth,
            expiryYear: cc.expiryYear,
            ccv: cc.ccv,
          },
          creditCardHolderInfo: {
            name: body.customer.name,
            email: body.customer.email,
            cpfCnpj,
            postalCode: destinationZip,
            addressNumber: body.shippingAddress.number,
            phone: onlyDigits(body.customer.phone),
          },
        }),
      });

      const payJson = await payResp.json();
      if (!payResp.ok) {
        await admin
          .from("orders")
          .update({ status: "cancelled", payment_status: "DECLINED" })
          .eq("id", orderId);
        const message =
          payJson?.errors?.[0]?.description ?? "Pagamento recusado. Verifique os dados do cartão.";
        return jsonResponse({ error: message }, 400);
      }
      paymentResult = payJson;
    }

    // 7. Record the payment result on the order.
    const isPaidNow = paymentResult.status === "CONFIRMED" || paymentResult.status === "RECEIVED";
    await admin
      .from("orders")
      .update({
        payment_id: paymentResult.id as string,
        payment_status: paymentResult.status as string,
        status: isPaidNow ? "paid" : "pending",
      })
      .eq("id", orderId);

    // 8. E-mail the customer their order. This is informational only — login credentials (for new
    // accounts) and the payment-confirmed message are sent by notifyPaymentConfirmed instead, only
    // once the payment has actually gone through, so an abandoned Pix never leaks account access.
    // Never blocks or fails the checkout — sendEmail swallows its own errors, and a missing/broken
    // template just skips the send.
    const resendKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "resend" })
      .then((r) => r.data as string | null);
    const pixAviso =
      body.paymentMethod === "pix"
        ? "<p>Finalize o pagamento escaneando o QR Code ou usando o código copia-e-cola que apareceu na tela.</p>"
        : "";
    const rendered = await renderEmailTemplate(admin, "order_received", {
      nome: body.customer.name,
      pedido_curto: orderId.slice(0, 8),
      total: formatBRL(totalCents),
      link_pedido: `${SITE_URL}/pedido/${orderId}`,
      pix_aviso: pixAviso,
    });
    if (rendered) {
      await sendEmail(resendKey, { to: body.customer.email, subject: rendered.subject, html: rendered.html });
    }

    // Cards are approved synchronously, right here — by the time Asaas's own webhook arrives the
    // order is already "paid", so its own guard (only e-mail when the PREVIOUS status wasn't paid)
    // would otherwise skip the confirmation e-mail entirely for every card order. Sending it from
    // here instead covers that case; Pix confirmations (immediate or recovered later) are still
    // handled by asaas-webhook, which is the only place that ever observes those.
    if (isPaidNow) {
      await notifyPaymentConfirmed(admin, {
        id: orderId,
        user_id: customerUserId,
        customer_name: body.customer.name,
        customer_email: body.customer.email,
        total_cents: totalCents,
        is_new_account: !!newAccount,
        referrer_user_id: referrerUserId,
      });
    }

    return jsonResponse({
      orderId,
      paymentMethod: body.paymentMethod,
      status: paymentResult.status,
      pix: pixQrCode,
    });
  } catch (error) {
    console.error("[checkout-create]", error);
    if (orderId) {
      await admin.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    }
    const message = error instanceof Error ? error.message : "Erro ao processar o pedido.";
    return jsonResponse({ error: message }, 500);
  }
});
