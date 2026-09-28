// Admin-only (verify_jwt: true). Powers the "Valor Etiqueta" and "Rastreio" columns in
// Admin > Pedidos. Three different Melhor Envio calls, because they answer three different
// questions:
//   - POST /me/shipment/tracking (batched, one call for every already-shipped order) — the live
//     tracking status. Never persisted: it's meant to always reflect what ME says right now.
//   - GET /me/orders/search?q={id} (one call per shipment) — an already-generated label's real,
//     final price. Only called for shipped orders whose orders.label_price_cents is still null
//     (labels bought before that column existed, or before this endpoint fix); once fetched it's
//     saved, so this per-shipment call only ever runs once per order. NOTE: GET /me/cart/{id} looks
//     similar but only works while the shipment is still sitting in the cart — once checked out it
//     404s, which is why this used to silently fail for every already-generated label.
//     /me/orders/search works for any lifecycle stage (released, posted, delivered, ...).
//   - POST /me/shipment/calculate (one call per paid-but-not-yet-shipped order) — a live quote of
//     what generating the label would cost right now, so the admin can check their Melhor Envio
//     balance before clicking "Gerar etiqueta". Same packing/params generate-shipping-label uses to
//     actually buy the label, so the quote matches what would really be charged. Never persisted —
//     it's a quote, not a purchase, and could change.
import { createClient } from "jsr:@supabase/supabase-js@2";

import { packOrder } from "../_shared/package-dimensions.ts";

const ME_API = "https://melhorenvio.com.br/api/v2";
const JT_EXPRESS_SERVICE_ID = 33;

function onlyDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

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

type OrderShipmentRow = {
  id: string;
  melhor_envio_shipment_id: string | null;
  label_price_cents: number | null;
};

type PendingOrderRow = {
  id: string;
  shipping_address: { zip?: string } | null;
  order_items: { quantity: number; product_variants: PendingVariant | null }[];
};

type PendingVariant = {
  package_height_cm: number | null;
  package_length_cm: number | null;
  package_weight_kg: number | null;
  package_width_cm: number | null;
};

type ShipmentResult = {
  status: string | null;
  labelPriceCents: number | null;
  quotedLabelPriceCents: number | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
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

    const { data: orders, error: ordersError } = await admin
      .from("orders")
      .select("id, melhor_envio_shipment_id, label_price_cents")
      .not("melhor_envio_shipment_id", "is", null);
    if (ordersError) throw ordersError;

    const { data: pending, error: pendingError } = await admin
      .from("orders")
      .select(
        "id, shipping_address, order_items(quantity, product_variants(package_height_cm, package_length_cm, package_weight_kg, package_width_cm))",
      )
      .eq("status", "paid")
      .is("melhor_envio_shipment_id", null);
    if (pendingError) throw pendingError;

    const shipped = (orders ?? []) as OrderShipmentRow[];
    const pendingOrders = (pending ?? []) as unknown as PendingOrderRow[];
    const result: Record<string, ShipmentResult> = {};
    if (shipped.length === 0 && pendingOrders.length === 0) return jsonResponse({ orders: result });

    const meToken = await admin
      .rpc("get_integration_secret", { p_integration_id: "melhor_envio" })
      .then((r) => r.data as string | null);
    if (!meToken) return jsonResponse({ error: "Melhor Envio não configurado." }, 503);

    const meHeaders = {
      Authorization: `Bearer ${meToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "ALNA (noreply@alna.sale)",
    };

    for (const order of shipped) {
      result[order.id] = {
        status: null,
        labelPriceCents: order.label_price_cents,
        quotedLabelPriceCents: null,
      };
    }
    for (const order of pendingOrders) {
      result[order.id] = { status: null, labelPriceCents: null, quotedLabelPriceCents: null };
    }

    // Live tracking status — one batched call for every shipment.
    try {
      const shipmentIds = shipped.map((o) => o.melhor_envio_shipment_id!);
      const trackingResp = await fetch(`${ME_API}/me/shipment/tracking`, {
        method: "POST",
        headers: meHeaders,
        body: JSON.stringify({ orders: shipmentIds }),
      });
      if (trackingResp.ok) {
        const trackingJson = (await trackingResp.json()) as Record<
          string,
          { status?: string | null }
        >;
        for (const order of shipped) {
          const entry = trackingJson[order.melhor_envio_shipment_id!];
          if (entry) result[order.id].status = entry.status ?? null;
        }
      } else {
        console.error("[get-order-shipment-info] tracking falhou", trackingResp.status);
      }
    } catch (error) {
      console.error("[get-order-shipment-info] tracking falhou", error);
    }

    // Backfill the label price for orders bought before label_price_cents existed — one lookup
    // each, but only ever needed once per order since the result is saved right after.
    const missingPrice = shipped.filter((o) => o.label_price_cents == null);
    for (const order of missingPrice) {
      try {
        const searchResp = await fetch(
          `${ME_API}/me/orders/search?q=${order.melhor_envio_shipment_id}`,
          { headers: meHeaders },
        );
        if (!searchResp.ok) {
          const errText = await searchResp.text();
          console.error(
            "[get-order-shipment-info] orders/search falhou",
            order.id,
            searchResp.status,
            errText.slice(0, 300),
          );
          continue;
        }
        // The API docs show a flat array, but in practice this returns the same paginated shape as
        // "listar etiquetas" ({ current_page, data: [...] }) — handle both defensively.
        const searchJson = (await searchResp.json()) as
          | Array<{ price?: number | null }>
          | { data?: Array<{ price?: number | null }> };
        const orderInfo = Array.isArray(searchJson) ? searchJson[0] : searchJson?.data?.[0];
        if (typeof orderInfo?.price !== "number") {
          console.error(
            "[get-order-shipment-info] orders/search sem price",
            order.id,
            JSON.stringify(searchJson).slice(0, 300),
          );
          continue;
        }
        const labelPriceCents = Math.round(orderInfo.price * 100);
        await admin
          .from("orders")
          .update({ label_price_cents: labelPriceCents })
          .eq("id", order.id);
        result[order.id].labelPriceCents = labelPriceCents;
      } catch (error) {
        console.error("[get-order-shipment-info] preço falhou", order.id, error);
      }
    }

    // Live quote for paid orders with no label yet, so the admin can see if their Melhor Envio
    // balance covers it before clicking "Gerar etiqueta". Same packing generate-shipping-label uses
    // to buy the real label, so this is the real current cost — not an estimate.
    if (pendingOrders.length > 0) {
      const { data: settings } = await admin
        .from("site_settings")
        .select("shipping_origin_zip")
        .eq("id", "default")
        .maybeSingle();
      const originZip = onlyDigits(settings?.shipping_origin_zip);

      for (const order of pendingOrders) {
        try {
          const destinationZip = onlyDigits(order.shipping_address?.zip);
          if (originZip.length !== 8 || destinationZip.length !== 8) continue;

          const parcel = packOrder(
            order.order_items.map((item) => ({
              quantity: item.quantity,
              height_cm: item.product_variants?.package_height_cm ?? null,
              width_cm: item.product_variants?.package_width_cm ?? null,
              length_cm: item.product_variants?.package_length_cm ?? null,
              weight_kg: item.product_variants?.package_weight_kg ?? null,
            })),
          );

          const calcResp = await fetch(`${ME_API}/me/shipment/calculate`, {
            method: "POST",
            headers: meHeaders,
            body: JSON.stringify({
              from: { postal_code: originZip },
              to: { postal_code: destinationZip },
              products: [
                {
                  id: "pedido",
                  width: parcel.width,
                  height: parcel.height,
                  length: parcel.length,
                  weight: parcel.weight,
                  insurance_value: 0,
                  quantity: 1,
                },
              ],
              services: String(JT_EXPRESS_SERVICE_ID),
            }),
          });
          if (!calcResp.ok) {
            console.error("[get-order-shipment-info] calculate falhou", order.id, calcResp.status);
            continue;
          }
          const calcJson = await calcResp.json();
          const options = Array.isArray(calcJson) ? calcJson : [calcJson];
          const jt = (options as Array<Record<string, unknown>>).find(
            (o) => !o.error && String(o.id) === String(JT_EXPRESS_SERVICE_ID),
          );
          if (jt && typeof jt.price !== "undefined") {
            result[order.id].quotedLabelPriceCents = Math.round(Number(jt.price) * 100);
          }
        } catch (error) {
          console.error("[get-order-shipment-info] cotação falhou", order.id, error);
        }
      }
    }

    return jsonResponse({ orders: result });
  } catch (error) {
    console.error("[get-order-shipment-info]", error);
    const message = error instanceof Error ? error.message : "Erro ao consultar a Melhor Envio.";
    return jsonResponse({ error: message }, 500);
  }
});
