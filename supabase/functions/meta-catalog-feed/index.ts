// Public, read-only (verify_jwt: false). The product feed Meta's Commerce Manager fetches on a
// schedule (Catálogo > Fontes de dados > Feed programado). It only exposes what the storefront
// already shows publicly: published products, their prices, stock and photos.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildFeedCsv, type FeedProduct } from "../_shared/meta-feed.ts";

const STORE_URL = "https://store.alna.sale";

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Método não permitido.", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  // The anon key is enough: these rows are already readable by every visitor of the store.
  const client = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "");

  const { data, error } = await client
    .from("products")
    .select(
      `id, title, slug, description,
       product_images(storage_path, position),
       product_variants(sku, name, price_cents, compare_at_price_cents, stock_quantity)`,
    )
    .eq("status", "published")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[meta-catalog-feed]", error);
    return new Response("Feed indisponível no momento.", { status: 503 });
  }

  const csv = buildFeedCsv((data ?? []) as FeedProduct[], {
    siteUrl: STORE_URL,
    imageBaseUrl: `${supabaseUrl}/storage/v1/object/public/product-media/`,
    brand: "ALNA",
  });

  return new Response(req.method === "HEAD" ? null : csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});
