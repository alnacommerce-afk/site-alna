// HTML blocks of the marketing campaign e-mail (send-weekly-marketing): the coupon button and the
// product rows (image on one side, text on the other, alternating). Kept free of Deno/Supabase
// imports so the layout can be previewed locally. E-mail clients ignore most modern CSS, so the rows
// are plain tables with inline styles.
const SITE_URL = "https://store.alna.sale";
const NAVY = "#12294f";
const GREEN = "#16a34a";

export type MarketingProduct = {
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number | null;
  /** Full ("de") price shown struck through next to the current one, when higher than it. */
  compareAtPriceCents?: number | null;
};

export type MarketingCoupon = {
  code: string;
  discountPercent: number;
  minOrderCents: number;
  /** Set for single-use personal codes: shown as "vale até ... e só pode ser usado uma vez". */
  validUntil?: Date | null;
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Product descriptions are free text (headline first, then measurements, often with emoji and markup).
// Picks the first real sentence — a long line ending in "." or "!" — and cuts it at a word boundary.
function shortDescription(description: string | null, max = 120) {
  if (!description) return "";
  const lines = description
    .replace(/<[^>]*>/g, "\n")
    .split(/\n+/)
    .map((line) => line.replace(/[*_#>`]/g, "").replace(/^[^\p{L}\p{N}]+/u, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const plain =
    lines.find((line) => line.length >= 50 && /[.!]$/.test(line)) ??
    lines.find((line) => line.length >= 40) ??
    lines.join(" ");
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 60)).trim()}…`;
}

/** "Use the coupon" button: opens the store with the code saved, so it lands pre-filled in the cart. */
export function buildCouponBlockHtml(coupon: MarketingCoupon | null) {
  if (!coupon) return "";
  const link = `${SITE_URL}/loja?cupom=${encodeURIComponent(coupon.code)}`;
  const condition =
    coupon.minOrderCents > 0
      ? `${coupon.discountPercent}% de desconto em compras acima de ${formatBRL(coupon.minOrderCents)}`
      : `${coupon.discountPercent}% de desconto na sua próxima compra`;
  return `<div style="text-align:center;margin:24px 0;padding:20px 16px;background:#f0fdf4;border:1px dashed ${GREEN};border-radius:12px;">
    <p style="margin:0 0 12px;font-size:15px;color:${NAVY};">E separamos um cupom para você usar:</p>
    <a href="${link}" style="display:inline-block;background:${GREEN};color:#ffffff;padding:14px 28px;border-radius:8px;font-size:17px;font-weight:bold;letter-spacing:0.5px;text-decoration:none;">${escapeHtml(coupon.code)}</a>
    <p style="margin:12px 0 0;font-size:13px;color:#4b5563;">${condition}.${coupon.validUntil ? ` Vale até ${coupon.validUntil.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} e só pode ser usado uma vez, com o e-mail que recebeu esta mensagem.` : ""} Clique no cupom e ele já fica guardado para você aplicar no carrinho.</p>
  </div>`;
}

/** One row per product, image and text swapping sides on every row; image and button open the product. */
export function buildProductsHtml(products: MarketingProduct[]) {
  const rows = products.map((product, index) => {
    const link = `${SITE_URL}/produto/${product.slug}`;
    const description = escapeHtml(shortDescription(product.description));
    const imageCell = `<td width="46%" valign="middle" style="padding:14px;">
        <a href="${link}" style="text-decoration:none;">${
          product.imageUrl
            ? `<img src="${product.imageUrl}" alt="${escapeHtml(product.title)}" width="100%" style="display:block;width:100%;height:auto;border:0;border-radius:10px;" />`
            : `<span style="display:block;height:160px;background:#e5e7eb;border-radius:10px;"></span>`
        }</a>
      </td>`;
    const textCell = `<td valign="middle" style="padding:14px;">
        <p style="margin:0;font-size:16px;font-weight:bold;line-height:1.3;color:${NAVY};"><a href="${link}" style="color:${NAVY};text-decoration:none;">${escapeHtml(product.title)}</a></p>
        ${description ? `<p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:#4b5563;">${description}</p>` : ""}
        ${product.priceCents != null ? `<p style="margin:10px 0 0;font-size:18px;font-weight:bold;color:${GREEN};">${product.compareAtPriceCents != null && product.compareAtPriceCents > product.priceCents ? `<span style="font-size:13px;font-weight:normal;color:#9ca3af;text-decoration:line-through;margin-right:6px;">${formatBRL(product.compareAtPriceCents)}</span>` : ""}${formatBRL(product.priceCents)}</p>` : ""}
        <p style="margin:12px 0 0;"><a href="${link}" style="display:inline-block;background:${NAVY};color:#ffffff;padding:9px 18px;border-radius:6px;font-size:13px;font-weight:bold;text-decoration:none;">Ver produto</a></p>
      </td>`;
    const cells = index % 2 === 0 ? imageCell + textCell : textCell + imageCell;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;"><tr>${cells}</tr></table>`;
  });
  return `<div style="margin:20px 0;">${rows.join("")}</div>`;
}

// Every campaign gets a title nobody has received before. The ideas rotate; "{produto}" is the first
// product of the campaign, "{{nome}}" is filled in per recipient. If every idea was already used (with the
// same product), the date is appended, so a title never repeats.
const SUBJECT_IDEAS = [
  "{{nome}}, chegou novidade na ALNA 💚",
  "Olha o que acabou de chegar na ALNA",
  "{produto} chegou na ALNA: vem ver!",
  "Novidades para a sua casa, {{nome}} 🏠",
  "Separamos um cupom e novidades para você 🎁",
  "{{nome}}, já viu o que tem de novo na ALNA?",
  "Sua próxima compra com desconto e novidades na ALNA",
  "Tem produto novo esperando por você 💚",
  "Novidades fresquinhas da ALNA para você, {{nome}}",
  "{produto}: veja essa e outras novidades",
  "Que tal renovar a casa? Novidades na ALNA",
  "{{nome}}, preparamos algo especial para você 🎉",
];

export function pickCampaignSubject(usedSubjects: Set<string>, firstProductTitle: string | null, now: Date) {
  const product = (firstProductTitle ?? "").trim().slice(0, 40);
  const candidates = SUBJECT_IDEAS.filter((idea) => product || !idea.includes("{produto}")).map((idea) =>
    idea.replace("{produto}", product),
  );
  const fresh = candidates.find((subject) => !usedSubjects.has(subject));
  if (fresh) return fresh;
  const stamp = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const base = candidates.length ? candidates : [SUBJECT_IDEAS[0]];
  for (let round = 1; ; round++) {
    const suffix = round === 1 ? ` (${stamp})` : ` (${stamp} · ${round})`;
    const dated = base.find((subject) => !usedSubjects.has(`${subject}${suffix}`));
    if (dated) return `${dated}${suffix}`;
  }
}
