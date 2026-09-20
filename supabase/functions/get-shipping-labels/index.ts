// Admin-only (verify_jwt: true). Serves a ready-to-print pair of pages per order: our own packing
// slip (order ID + SKU/quantity of each item) followed by a proper 100x150mm (10x15cm) version of
// the Melhor Envio label — their PDF is a full page with the label graphic stretched to fill it (no
// fixed physical size, and no room to add our own text on it), so we re-embed that page onto a
// correctly-sized page instead, preserving its aspect ratio (never stretching — that would distort
// the barcode). Results are cached per order (orders.label_pdf_url); requesting more than one order
// merges every order's pages into a single PDF for the "baixar em massa" button.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MM_TO_PT = 2.8346456693;
const PAGE_WIDTH_PT = 100 * MM_TO_PT;
const PAGE_HEIGHT_PT = 150 * MM_TO_PT;
const MARGIN_PT = 16;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type OrderItem = { sku: string | null; product_title: string; variant_name: string | null; quantity: number };

// Breaks text into lines that fit within maxWidth at the given font/size — pdf-lib's drawText
// never wraps on its own.
function wrapText(text: string, font: import("npm:pdf-lib@1.17.1").PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function buildPackingSlipPage(doc: PDFDocument, orderId: string, items: OrderItem[]) {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
  const contentWidth = PAGE_WIDTH_PT - MARGIN_PT * 2;
  let y = PAGE_HEIGHT_PT - MARGIN_PT - 14;

  page.drawText(`Pedido #${orderId.slice(0, 8)}`, { x: MARGIN_PT, y, size: 16, font: boldFont, color: rgb(0, 0, 0) });
  y -= 16;
  page.drawText(orderId, { x: MARGIN_PT, y, size: 7, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 18;
  page.drawLine({
    start: { x: MARGIN_PT, y },
    end: { x: PAGE_WIDTH_PT - MARGIN_PT, y },
    thickness: 0.75,
    color: rgb(0, 0, 0),
  });
  y -= 18;
  page.drawText("ITENS DO PEDIDO", { x: MARGIN_PT, y, size: 10, font: boldFont });
  y -= 16;

  for (const item of items) {
    const label = `${item.sku ?? "s/ SKU"} — ${item.product_title}${item.variant_name ? ` (${item.variant_name})` : ""}`;
    const lines = wrapText(label, font, 9, contentWidth - 30);
    for (const [i, line] of lines.entries()) {
      if (y < MARGIN_PT) break; // out of space — extremely unlikely for a real order
      page.drawText(line, { x: MARGIN_PT, y, size: 9, font });
      if (i === lines.length - 1) {
        page.drawText(`Qtd: ${item.quantity}`, {
          x: PAGE_WIDTH_PT - MARGIN_PT - font.widthOfTextAtSize(`Qtd: ${item.quantity}`, 9),
          y,
          size: 9,
          font: boldFont,
        });
      }
      y -= 12;
    }
    y -= 6;
  }
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

    // Make sure every order has its packing-slip + 100x150mm label PDF cached.
    for (const order of readyOrders) {
      if (order.label_pdf_url) continue;

      const fileResp = await fetch(
        `https://melhorenvio.com.br/api/v2/me/imprimir/pdf/${order.melhor_envio_shipment_id}`,
        {
          headers: {
            Authorization: `Bearer ${meToken}`,
            Accept: "application/json",
            "User-Agent": "Alna Commerce (noreply@alna.sale)",
          },
        },
      );
      if (!fileResp.ok) continue;
      const [sourceUrl] = (await fileResp.json()) as string[];
      if (!sourceUrl) continue;

      const [sourceResp, itemsResult] = await Promise.all([
        fetch(sourceUrl),
        admin.from("order_items").select("sku, product_title, variant_name, quantity").eq("order_id", order.id),
      ]);
      const sourceBytes = new Uint8Array(await sourceResp.arrayBuffer());
      const sourceDoc = await PDFDocument.load(sourceBytes);
      const [sourcePage] = sourceDoc.getPages();
      const { width: srcW, height: srcH } = sourcePage.getSize();

      const outputDoc = await PDFDocument.create();
      await buildPackingSlipPage(outputDoc, order.id, (itemsResult.data ?? []) as OrderItem[]);

      const embedded = await outputDoc.embedPage(sourcePage);
      const scale = Math.min(PAGE_WIDTH_PT / srcW, PAGE_HEIGHT_PT / srcH);
      const drawW = srcW * scale;
      const drawH = srcH * scale;
      const labelPage = outputDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
      labelPage.drawPage(embedded, {
        x: (PAGE_WIDTH_PT - drawW) / 2,
        y: (PAGE_HEIGHT_PT - drawH) / 2,
        width: drawW,
        height: drawH,
      });
      const outputBytes = await outputDoc.save();

      const path = `${order.id}.pdf`;
      const { error: uploadError } = await admin.storage
        .from("shipping-labels")
        .upload(path, outputBytes, { contentType: "application/pdf", upsert: true });
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

    // Multiple orders — merge every page of every order into a single PDF for batch printing.
    const merged = await PDFDocument.create();
    for (const order of withPdf) {
      const resp = await fetch(order.label_pdf_url!);
      const bytes = new Uint8Array(await resp.arrayBuffer());
      const doc = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      for (const page of pages) merged.addPage(page);
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
