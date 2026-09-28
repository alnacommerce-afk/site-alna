// Admin-only (verify_jwt: true). Powers the "Valor Etiqueta" and "Rastreio" columns in
// Admin > Pedidos. Two different Melhor Envio endpoints, because they answer two different
// questions:
//   - POST /me/shipment/tracking (batched, one call for every order) — the live tracking status.
//     Never persisted: it's meant to always reflect what ME says right now.
//   - GET /me/orders/search?q={id} (one call per shipment) — the label's real price. Only called
//     for orders whose orders.label_price_cents is still null (labels bought before that column
//     existed, or before this endpoint fix); once fetched it's saved, so this per-shipment call
//     only ever runs once per order. NOTE: GET /me/cart/{id} looks similar but only works while the
//     shipment is still sitting in the cart — once checked out it 404s, which is why this used to
//     silently fail for every already-generated label. /me/orders/search works for any lifecycle
//     stage (released, posted, delivered, ...).
import { createClient } from "jsr:@supabase/supabase-js@2";

const ME_API = "https://melhorenvio.com.br/api/v2";

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

    const shipped = (orders ?? []) as OrderShipmentRow[];
    const result: Record<string, { status: string | null; labelPriceCents: number | null }> = {};
    if (shipped.length === 0) return jsonResponse({ orders: result });

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
      result[order.id] = { status: null, labelPriceCents: order.label_price_cents };
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

    return jsonResponse({ orders: result });
  } catch (error) {
    console.error("[get-order-shipment-info]", error);
    const message = error instanceof Error ? error.message : "Erro ao consultar a Melhor Envio.";
    return jsonResponse({ error: message }, 500);
  }
});
