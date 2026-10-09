// Live data for the items of a saved cart: current price, stock and photo, read fresh every time so a
// reminder e-mail (or a reopened cart) never shows an old price or a sold-out product.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type CartLine = { variantId: string; quantity: number };

export type LiveCartLine = {
  variantId: string;
  quantity: number;
  productSlug: string;
  productTitle: string;
  variantName: string;
  priceCents: number;
  maxQuantity: number;
  thumbnailUrl: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_CART_LINES = 20;
export const MAX_LINE_QUANTITY = 99;

/** Keeps only well-formed lines (valid id, quantity 1..99), merging repeated variants. */
export function sanitizeCartLines(input: unknown): CartLine[] {
  if (!Array.isArray(input)) return [];
  const merged = new Map<string, number>();
  for (const raw of input.slice(0, MAX_CART_LINES * 2)) {
    const variantId = typeof raw?.variantId === "string" ? raw.variantId.trim() : "";
    const quantity = Math.floor(Number(raw?.quantity));
    if (!UUID_RE.test(variantId) || !Number.isFinite(quantity) || quantity < 1) continue;
    merged.set(variantId, Math.min(MAX_LINE_QUANTITY, (merged.get(variantId) ?? 0) + quantity));
  }
  return [...merged.entries()].slice(0, MAX_CART_LINES).map(([variantId, quantity]) => ({ variantId, quantity }));
}

/** Lines that can still be bought today (published product, stock > 0), with quantity capped to the stock. */
export async function loadLiveCartLines(admin: SupabaseClient, lines: CartLine[]): Promise<LiveCartLine[]> {
  if (lines.length === 0) return [];
  const { data: variants, error } = await admin
    .from("product_variants")
    .select("id, name, price_cents, stock_quantity, product_id, products(title, slug, status)")
    .in("id", lines.map((l) => l.variantId));
  if (error || !variants) {
    console.error("[cart-items] falha ao ler variações", error);
    return [];
  }

  const productIds = [...new Set(variants.map((v) => v.product_id as string))];
  const { data: images } = await admin
    .from("product_images")
    .select("product_id, storage_path, position")
    .in("product_id", productIds)
    .order("position", { ascending: true });
  const firstImage = new Map<string, string>();
  for (const image of images ?? []) {
    if (!firstImage.has(image.product_id)) firstImage.set(image.product_id, image.storage_path);
  }
  const storageBase = `${Deno.env.get("SUPABASE_URL") ?? ""}/storage/v1/object/public/product-media/`;

  const live: LiveCartLine[] = [];
  for (const line of lines) {
    const variant = variants.find((v) => v.id === line.variantId);
    // deno-lint-ignore no-explicit-any
    const product = variant?.products as any;
    const productRow = Array.isArray(product) ? product[0] : product;
    if (!variant || !productRow || productRow.status !== "published") continue;
    const stock = Number(variant.stock_quantity ?? 0);
    if (stock <= 0) continue;
    const path = firstImage.get(variant.product_id as string);
    live.push({
      variantId: variant.id as string,
      quantity: Math.min(line.quantity, stock),
      productSlug: productRow.slug as string,
      productTitle: productRow.title as string,
      variantName: variant.name as string,
      priceCents: Number(variant.price_cents),
      maxQuantity: stock,
      thumbnailUrl: path ? `${storageBase}${path}` : null,
    });
  }
  return live;
}

export function cartSubtotalCents(lines: LiveCartLine[]) {
  return lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
}

/** "2x Colher de madeira (26cm), 1x Toalha ..." — short text for the admin list and the WhatsApp message. */
export function cartSummary(lines: LiveCartLine[]) {
  const text = lines
    .map((l) => {
      const variant = l.variantName && l.variantName.trim() && l.variantName.trim().toLowerCase() !== "padrão" ? ` (${l.variantName})` : "";
      return `${l.quantity}x ${l.productTitle}${variant}`;
    })
    .join(", ");
  return text.length > 400 ? `${text.slice(0, 397)}...` : text;
}
