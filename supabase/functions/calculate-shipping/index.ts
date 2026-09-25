// Public. Calculates real shipping cost via Melhor Envio, restricted to J&T Express
// only (service id 33 on this account — confirmed live) per explicit merchant requirement.
// The Melhor Envio token lives in Supabase Vault (Admin > Conexões de API, id "melhor_envio").
import { createClient } from "jsr:@supabase/supabase-js@2";

import { packOrder } from "../_shared/package-dimensions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JT_EXPRESS_SERVICE_ID = "33";

type RequestBody = {
  destinationZip: string;
  items: { variantId: string; quantity: number }[];
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    const destinationZip = onlyDigits(body.destinationZip ?? "");
    if (destinationZip.length !== 8) {
      return jsonResponse({ error: "CEP de destino inválido." }, 400);
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return jsonResponse({ error: "Carrinho vazio." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const [{ data: settings }, { data: variants, error: variantsError }, { data: token }] =
      await Promise.all([
        adminClient
          .from("site_settings")
          .select("shipping_origin_zip, free_shipping_threshold_cents")
          .eq("id", "default")
          .maybeSingle(),
        adminClient
          .from("product_variants")
          .select("id, price_cents, package_height_cm, package_length_cm, package_weight_kg, package_width_cm")
          .in(
            "id",
            body.items.map((i) => i.variantId),
          ),
        adminClient.rpc("get_integration_secret", { p_integration_id: "melhor_envio" }),
      ]);

    if (variantsError) throw variantsError;

    // Default here must match the one in src/routes/index.tsx (used when site_settings has no row).
    const freeShippingThresholdCents = settings?.free_shipping_threshold_cents ?? 10000;
    const subtotalCents = body.items.reduce((sum, item) => {
      const variant = (variants ?? []).find((v) => v.id === item.variantId);
      return sum + (variant?.price_cents ?? 0) * item.quantity;
    }, 0);
    const freeShipping = subtotalCents >= freeShippingThresholdCents;

    const originZip = onlyDigits(settings?.shipping_origin_zip ?? "");
    if (originZip.length !== 8) {
      return jsonResponse(
        { error: "Endereço de origem do frete não configurado (Admin > Configurações)." },
        503,
      );
    }
    if (!token) {
      return jsonResponse(
        { error: "Frete indisponível no momento. Fale com a gente pelo WhatsApp para confirmar o valor." },
        503,
      );
    }

    // The whole order goes as ONE parcel built from the products' own measures (no box/envelope).
    const parcel = packOrder(
      body.items.map((item) => {
        const variant = (variants ?? []).find((v) => v.id === item.variantId);
        if (!variant) throw new Error(`Variante ${item.variantId} não encontrada.`);
        return {
          quantity: item.quantity,
          height_cm: variant.package_height_cm,
          width_cm: variant.package_width_cm,
          length_cm: variant.package_length_cm,
          weight_kg: variant.package_weight_kg,
        };
      }),
    );
    const products = [
      {
        id: "pedido",
        width: parcel.width,
        height: parcel.height,
        length: parcel.length,
        weight: parcel.weight,
        insurance_value: subtotalCents / 100,
        quantity: 1,
      },
    ];

    const meResponse = await fetch("https://melhorenvio.com.br/api/v2/me/shipment/calculate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "ALNA (noreply@alna.sale)",
      },
      body: JSON.stringify({
        from: { postal_code: originZip },
        to: { postal_code: destinationZip },
        products,
        services: JT_EXPRESS_SERVICE_ID,
      }),
    });

    if (!meResponse.ok) {
      const errText = await meResponse.text();
      throw new Error(`Melhor Envio ${meResponse.status}: ${errText.slice(0, 300)}`);
    }

    const parsed = await meResponse.json();
    // Melhor Envio returns a single object (not an array) when `services` restricts the
    // quote to exactly one carrier — which is always the case here (J&T Express only).
    const options = Array.isArray(parsed) ? parsed : [parsed];
    const jt = (options as Array<Record<string, unknown>>).find(
      (o) => !o.error && String(o.id) === JT_EXPRESS_SERVICE_ID,
    );

    if (!jt) {
      return jsonResponse(
        { error: "Frete indisponível para esse CEP com a transportadora atual." },
        422,
      );
    }

    const originalPriceCents = Math.round(Number(jt.price) * 100);

    return jsonResponse({
      serviceId: jt.id,
      // Melhor Envio's internal company name for this carrier is "JeT" — show the real brand name.
      carrierName: "J&T Express",
      priceCents: freeShipping ? 0 : originalPriceCents,
      originalPriceCents,
      freeShipping,
      deliveryTimeDays: jt.delivery_time,
    });
  } catch (error) {
    console.error("[calculate-shipping]", error);
    const message = error instanceof Error ? error.message : "Erro ao calcular o frete.";
    return jsonResponse({ error: message }, 500);
  }
});
