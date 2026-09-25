// Admin-only (verify_jwt: true — Supabase Gateway rejects requests without a valid session token
// before this code even runs; we additionally confirm the caller has the 'admin' role below).
// This is the ONE step in the whole checkout/shipping flow that spends real money: it purchases a
// shipping label from the merchant's Melhor Envio wallet balance. It only ever runs when an admin
// explicitly clicks "Gerar etiqueta" in /admin/pedidos — never automatically on payment.
import { createClient } from "jsr:@supabase/supabase-js@2";

import { packOrder } from "../_shared/package-dimensions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JT_EXPRESS_SERVICE_ID = 33;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function onlyDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Confirm the caller is a signed-in admin.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) return jsonResponse({ error: "Não autenticado." }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return jsonResponse({ error: "Acesso restrito a administradores." }, 403);

    // 2. Load the order, its items, and the origin address.
    const { orderId } = (await req.json()) as { orderId: string };
    if (!orderId) return jsonResponse({ error: "orderId obrigatório." }, 400);

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, customer_name, customer_email, customer_phone, customer_document, shipping_address, tracking_code, status")
      .eq("id", orderId)
      .maybeSingle();
    if (orderError || !order) return jsonResponse({ error: "Pedido não encontrado." }, 404);
    if (order.tracking_code) {
      return jsonResponse({ error: "Etiqueta já foi gerada para este pedido." }, 400);
    }
    if (order.status !== "paid") {
      return jsonResponse({ error: "Só é possível gerar etiqueta para pedidos pagos." }, 400);
    }

    const { data: items, error: itemsError } = await admin
      .from("order_items")
      .select(
        "product_title, quantity, unit_price_cents, product_variants(package_height_cm, package_length_cm, package_weight_kg, package_width_cm)",
      )
      .eq("order_id", orderId);
    if (itemsError || !items?.length) throw itemsError ?? new Error("Itens do pedido não encontrados.");

    const { data: settings } = await admin
      .from("site_settings")
      .select(
        "store_name, cnpj, phone, email, shipping_origin_zip, shipping_origin_street, shipping_origin_number, shipping_origin_neighborhood, shipping_origin_city, shipping_origin_state",
      )
      .eq("id", "default")
      .maybeSingle();
    if (
      !settings?.shipping_origin_zip ||
      !settings.shipping_origin_street ||
      !settings.shipping_origin_number ||
      !settings.shipping_origin_neighborhood ||
      !settings.shipping_origin_city ||
      !settings.shipping_origin_state
    ) {
      return jsonResponse(
        { error: "Endereço de origem incompleto (Admin > Configurações > Envio / Frete)." },
        503,
      );
    }

    const meToken = await admin
      .rpc("get_integration_secret", { p_integration_id: "melhor_envio" })
      .then((r) => r.data as string | null);
    if (!meToken) return jsonResponse({ error: "Melhor Envio não configurado." }, 503);

    const address = order.shipping_address as {
      zip: string;
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
    };

    const meHeaders = {
      Authorization: `Bearer ${meToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "ALNA (noreply@alna.sale)",
    };

    // One parcel for the whole order, packed from the products' own measures — exactly the same
    // packing calculate-shipping / checkout-create used to quote and charge the freight.
    const parcel = packOrder(
      items.map((item) => {
        const variant = item.product_variants as unknown as {
          package_width_cm: number | null;
          package_height_cm: number | null;
          package_length_cm: number | null;
          package_weight_kg: number | null;
        } | null;
        return {
          quantity: item.quantity,
          height_cm: variant?.package_height_cm ?? null,
          width_cm: variant?.package_width_cm ?? null,
          length_cm: variant?.package_length_cm ?? null,
          weight_kg: variant?.package_weight_kg ?? null,
        };
      }),
    );
    const volumes = [
      { width: parcel.width, height: parcel.height, length: parcel.length, weight: parcel.weight },
    ];

    const insuranceValue = items.reduce((sum, i) => sum + (i.unit_price_cents / 100) * i.quantity, 0);

    const cartBody = {
      service: JT_EXPRESS_SERVICE_ID,
      from: {
        name: settings.store_name,
        email: settings.email ?? undefined,
        phone: onlyDigits(settings.phone) || undefined,
        company_document: onlyDigits(settings.cnpj) || undefined,
        address: settings.shipping_origin_street,
        number: settings.shipping_origin_number,
        district: settings.shipping_origin_neighborhood,
        city: settings.shipping_origin_city,
        state_abbr: settings.shipping_origin_state,
        postal_code: onlyDigits(settings.shipping_origin_zip),
        country_id: "BR",
      },
      to: {
        name: order.customer_name ?? "Cliente",
        email: order.customer_email ?? undefined,
        phone: onlyDigits(order.customer_phone) || undefined,
        document: onlyDigits(order.customer_document) || undefined,
        address: address.street,
        complement: address.complement || undefined,
        number: address.number,
        district: address.neighborhood,
        city: address.city,
        state_abbr: address.state,
        postal_code: onlyDigits(address.zip),
        country_id: "BR",
      },
      products: items.map((item) => ({
        name: item.product_title,
        quantity: String(item.quantity),
        unitary_value: String(item.unit_price_cents / 100),
      })),
      volumes,
      options: {
        insurance_value: insuranceValue,
        receipt: false,
        own_hand: false,
        reverse: false,
        non_commercial: true,
        platform: "ALNA",
        tags: [{ tag: `Pedido #${orderId.slice(0, 8)}` }],
      },
    };

    // Step 1: add to cart.
    const cartResp = await fetch("https://melhorenvio.com.br/api/v2/me/cart", {
      method: "POST",
      headers: meHeaders,
      body: JSON.stringify(cartBody),
    });
    if (!cartResp.ok) {
      const errText = await cartResp.text();
      throw new Error(`Melhor Envio cart ${cartResp.status}: ${errText.slice(0, 500)}`);
    }
    const cartItem = await cartResp.json();
    const shipmentId = cartItem.id as string;

    // Step 2: checkout — THIS spends real money from the Melhor Envio wallet balance.
    const checkoutResp = await fetch("https://melhorenvio.com.br/api/v2/me/shipment/checkout", {
      method: "POST",
      headers: meHeaders,
      body: JSON.stringify({ orders: [shipmentId] }),
    });
    if (!checkoutResp.ok) {
      const errText = await checkoutResp.text();
      throw new Error(`Melhor Envio checkout ${checkoutResp.status}: ${errText.slice(0, 500)}`);
    }

    // Step 3: generate the label.
    const generateResp = await fetch("https://melhorenvio.com.br/api/v2/me/shipment/generate", {
      method: "POST",
      headers: meHeaders,
      body: JSON.stringify({ orders: [shipmentId] }),
    });
    if (!generateResp.ok) {
      const errText = await generateResp.text();
      throw new Error(`Melhor Envio generate ${generateResp.status}: ${errText.slice(0, 500)}`);
    }

    // Step 4: get the printable label URL (public so the customer/admin can open it directly).
    const printResp = await fetch("https://melhorenvio.com.br/api/v2/me/shipment/print", {
      method: "POST",
      headers: meHeaders,
      body: JSON.stringify({ mode: "public", orders: [shipmentId] }),
    });
    const printJson = printResp.ok ? await printResp.json() : null;

    // Step 5: fetch the tracking code now that the label exists.
    const cartInfoResp = await fetch(`https://melhorenvio.com.br/api/v2/me/cart/${shipmentId}`, {
      headers: meHeaders,
    });
    const cartInfo = cartInfoResp.ok ? await cartInfoResp.json() : null;
    const trackingCode = (cartInfo?.tracking as string | undefined) ?? null;

    await admin
      .from("orders")
      .update({
        melhor_envio_shipment_id: shipmentId,
        tracking_code: trackingCode,
        label_url: printJson?.url ?? null,
        label_generated_count: 1,
        status: "shipped",
      })
      .eq("id", orderId);

    return jsonResponse({ trackingCode, labelUrl: printJson?.url ?? null });
  } catch (error) {
    console.error("[generate-shipping-label]", error);
    const message = error instanceof Error ? error.message : "Erro ao gerar etiqueta.";
    return jsonResponse({ error: message }, 500);
  }
});
