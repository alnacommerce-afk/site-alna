// Admin-only (verify_jwt: true). Serves a ready-to-print 100x150mm (10x15cm) version of one or
// more orders' shipping labels — Melhor Envio's own PDF is a full page with the label graphic
// stretched to fill it (no fixed physical size), so we re-embed that page onto a correctly-sized
// page instead, preserving its aspect ratio (never stretching — that would distort the barcode).
// Results are cached per order (orders.label_pdf_url); requesting more than one order merges them
// into a single multi-page PDF for the "baixar em massa" button.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MM_TO_PT = 2.8346456693;
const LABEL_WIDTH_PT = 100 * MM_TO_PT;
const LABEL_HEIGHT_PT = 150 * MM_TO_PT;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

    const { orderIds } = (await req.json()) as { orderIds: string[] };
    if (!orderIds?.length) return jsonResponse({ error: "orderIds obrigatório." }, 400);

    const { data: orders, error: ordersError } = await admin
      .from("orders")
      .select("id, melhor_envio_shipment_id, label_pdf_url")
      .in("id", orderIds);
    if (ordersError) throw ordersError;

    const readyOrders = (orders ?? []).filter((o) => o.melhor_envio_shipment_id);
    if (!readyOrders.length) {
      return jsonResponse({ error: "Nenhum dos pedidos selecionados tem etiqueta gerada." }, 404);
    }

    const meToken = await admin
      .rpc("get_integration_secret", { p_integration_id: "melhor_envio" })
      .then((r) => r.data as string | null);
    if (!meToken) return jsonResponse({ error: "Melhor Envio não configurado." }, 503);

    // Make sure every order has its 100x150mm PDF cached.
    for (const order of readyOrders) {
      if (order.label_pdf_url) continue;

      const fileResp = await fetch(
        `https://melhorenvio.com.br/api/v2/me/imprimir/pdf/${order.melhor_envio_shipment_id}`,
        {
          headers: {
            Authorization: `Bearer ${meToken}`,
            Accept: "application/json",
            "User-Agent": "Alna Commerce (contato@alna.cc)",
          },
        },
      );
      if (!fileResp.ok) continue;
      const [sourceUrl] = (await fileResp.json()) as string[];
      if (!sourceUrl) continue;

      const sourceResp = await fetch(sourceUrl);
      const sourceBytes = new Uint8Array(await sourceResp.arrayBuffer());
      const sourceDoc = await PDFDocument.load(sourceBytes);
      const [sourcePage] = sourceDoc.getPages();
      const { width: srcW, height: srcH } = sourcePage.getSize();

      const resizedDoc = await PDFDocument.create();
      const embedded = await resizedDoc.embedPage(sourcePage);
      const scale = Math.min(LABEL_WIDTH_PT / srcW, LABEL_HEIGHT_PT / srcH);
      const drawW = srcW * scale;
      const drawH = srcH * scale;
      const page = resizedDoc.addPage([LABEL_WIDTH_PT, LABEL_HEIGHT_PT]);
      page.drawPage(embedded, {
        x: (LABEL_WIDTH_PT - drawW) / 2,
        y: (LABEL_HEIGHT_PT - drawH) / 2,
        width: drawW,
        height: drawH,
      });
      const resizedBytes = await resizedDoc.save();

      const path = `${order.id}.pdf`;
      const { error: uploadError } = await admin.storage
        .from("shipping-labels")
        .upload(path, resizedBytes, { contentType: "application/pdf", upsert: true });
      if (uploadError) {
        console.error("[get-shipping-labels] falha ao salvar etiqueta", order.id, uploadError);
        continue;
      }
      const { data: pub } = admin.storage.from("shipping-labels").getPublicUrl(path);
      await admin.from("orders").update({ label_pdf_url: pub.publicUrl }).eq("id", order.id);
      order.label_pdf_url = pub.publicUrl;
    }

    const withPdf = readyOrders.filter((o) => o.label_pdf_url);
    if (!withPdf.length) {
      return jsonResponse({ error: "Não foi possível preparar as etiquetas." }, 502);
    }

    if (withPdf.length === 1) {
      return jsonResponse({ url: withPdf[0].label_pdf_url });
    }

    // Multiple orders — merge into a single multi-page PDF, one label per page.
    const merged = await PDFDocument.create();
    for (const order of withPdf) {
      const resp = await fetch(order.label_pdf_url!);
      const bytes = new Uint8Array(await resp.arrayBuffer());
      const doc = await PDFDocument.load(bytes);
      const [page] = await merged.copyPages(doc, [0]);
      merged.addPage(page);
    }
    const mergedBytes = await merged.save();
    const batchPath = `bulk/${crypto.randomUUID()}.pdf`;
    const { error: batchUploadError } = await admin.storage
      .from("shipping-labels")
      .upload(batchPath, mergedBytes, { contentType: "application/pdf", upsert: true });
    if (batchUploadError) throw batchUploadError;
    const { data: batchPub } = admin.storage.from("shipping-labels").getPublicUrl(batchPath);

    return jsonResponse({ url: batchPub.publicUrl, count: withPdf.length });
  } catch (error) {
    console.error("[get-shipping-labels]", error);
    const message = error instanceof Error ? error.message : "Erro ao preparar etiquetas.";
    return jsonResponse({ error: message }, 500);
  }
});
