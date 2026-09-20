// Builds the product feed (CSV) that Meta's Commerce Manager reads on a schedule. Kept free of any
// Deno/Supabase import so it can be unit-tested anywhere; the meta-catalog-feed function only fetches
// the rows and calls buildFeedCsv.
//
// One row per VARIANT (Meta wants each sellable item as its own row); variants of the same product
// share `item_group_id`. Products without a photo or a price are skipped, because Meta rejects them.

export type FeedVariant = {
  sku: string | null;
  gtin_ean?: string | null;
  name: string | null;
  price_cents: number;
  compare_at_price_cents: number | null;
  stock_quantity: number;
};
export type FeedImage = { storage_path: string; position: number };
export type FeedProduct = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  categories?: { name: string }[] | null;
  product_images: FeedImage[] | null;
  product_variants: FeedVariant[] | null;
};

export const FEED_COLUMNS = [
  "id",
  "item_group_id",
  "title",
  "description",
  "availability",
  "inventory",
  "condition",
  "price",
  "sale_price",
  "link",
  "image_link",
  "additional_image_link",
  "brand",
  "mpn",
  "gtin",
  "product_type",
  "google_product_category",
  "identifier_exists",
] as const;

// Google's product taxonomy (text path) per store category. Anything not listed here is left empty and
// Google classifies the product on its own.
const GOOGLE_CATEGORY: Record<string, string> = {
  colheres: "Home & Garden > Kitchen & Dining > Kitchen Tools & Utensils",
};

const validGtin = (value: string | null | undefined): string =>
  value && /^(\d{8}|\d{12,14})$/.test(value.trim()) ? value.trim() : "";

type Options = {
  /** Store origin, e.g. https://store.alna.sale (no trailing slash). */
  siteUrl: string;
  /** Public URL prefix of the product-media bucket, ending in "/". */
  imageBaseUrl: string;
  brand: string;
  /** "google" also fills identifier_exists, a column only Google's feed spec has. */
  target?: "meta" | "google";
};

const csvCell = (value: string | number | null | undefined): string => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const money = (cents: number): string => `${(cents / 100).toFixed(2)} BRL`;

// Descriptions are written with light markdown (**bold**, # headings, [links](url)); Meta shows the raw
// text, so strip the markup and any HTML.
const plainText = (source: string | null, fallback: string): string => {
  const text = (source ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__|\*|`)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return (text || fallback).slice(0, 5000);
};

export function buildFeedCsv(products: FeedProduct[], options: Options): string {
  const google = options.target === "google";
  const columns = FEED_COLUMNS.filter((column) => google || column !== "identifier_exists");
  const rows: string[] = [columns.join(",")];

  for (const product of products) {
    const images = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position);
    const variants = (product.product_variants ?? []).filter((v) => v.price_cents > 0);
    if (images.length === 0 || variants.length === 0) continue;

    const imageUrl = (path: string) => `${options.imageBaseUrl}${path}`;
    const multiple = variants.length > 1;
    const title = product.title.trim();
    const description = plainText(product.description, title);

    variants.forEach((variant, index) => {
      const onSale =
        variant.compare_at_price_cents != null && variant.compare_at_price_cents > variant.price_cents;
      const cells: Record<(typeof FEED_COLUMNS)[number], string | number> = {
        id: variant.sku?.trim() || `${product.id}-${index + 1}`,
        item_group_id: product.id,
        title: multiple && variant.name?.trim() ? `${title} - ${variant.name.trim()}` : title,
        description,
        availability: variant.stock_quantity > 0 ? "in stock" : "out of stock",
        inventory: Math.max(0, variant.stock_quantity),
        condition: "new",
        // Meta: `price` is the regular price and `sale_price` the discounted one.
        price: money(onSale ? variant.compare_at_price_cents! : variant.price_cents),
        sale_price: onSale ? money(variant.price_cents) : "",
        link: `${options.siteUrl}/produto/${product.slug}`,
        image_link: imageUrl(images[0].storage_path),
        additional_image_link: images
          .slice(1, 11)
          .map((image) => imageUrl(image.storage_path))
          .join(","),
        brand: options.brand,
        mpn: variant.sku?.trim() || "",
        gtin: validGtin(variant.gtin_ean),
        product_type: product.categories?.[0]?.name?.trim() || "",
        google_product_category:
          GOOGLE_CATEGORY[product.categories?.[0]?.name?.trim().toLowerCase() ?? ""] ?? "",
        // Products without a barcode must say so, or Google flags them as missing identifiers.
        identifier_exists: validGtin(variant.gtin_ean) ? "yes" : "no",
      };
      rows.push(columns.map((column) => csvCell(cells[column])).join(","));
    });
  }

  return rows.join("\r\n") + "\r\n";
}
