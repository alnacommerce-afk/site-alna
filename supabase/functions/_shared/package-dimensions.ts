// Packs an order into ONE parcel using only the products' own measures (no envelope/box added).
// Shared by calculate-shipping (quote), checkout-create (charged freight) and
// generate-shipping-label (purchased label) so the three always agree on the parcel.
//
// Measures are per single unit (cm / kg, edited in Admin > Anúncio > Medidas). For each SKU the
// units are laid side by side along the product's longest axis, so N units grow only the
// cross-section — 10 colheres of 26x2x2 become 26x8x6, not 26x20x20. Several SKUs are merged by
// volume into a roughly square cross-section that still fits every SKU's block.

// Used only when a variant has no measures filled in yet, so the quote never breaks.
const DEFAULT_HEIGHT_CM = 2;
const DEFAULT_WIDTH_CM = 11;
const DEFAULT_LENGTH_CM = 16;
const DEFAULT_WEIGHT_KG = 0.3;

export type PackItem = {
  quantity: number;
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  weight_kg: number | null;
};

export type Parcel = { height: number; width: number; length: number; weight: number };

type Block = { length: number; side1: number; side2: number };

function positive(value: number | null | undefined, fallback: number): number {
  return value != null && Number.isFinite(value) && value > 0 ? value : fallback;
}

// n units of a product whose sorted dimensions are a >= b >= c: the long axis `a` stays the parcel
// length, and units are arranged in a cols x rows grid of b x c footprints, choosing the most
// square cross-section (then the smallest area).
function packSku(a: number, b: number, c: number, n: number): Block {
  let best: { s1: number; s2: number } | null = null;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const s1 = cols * b;
    const s2 = rows * c;
    if (
      !best ||
      Math.max(s1, s2) < Math.max(best.s1, best.s2) ||
      (Math.max(s1, s2) === Math.max(best.s1, best.s2) && s1 * s2 < best.s1 * best.s2)
    ) {
      best = { s1, s2 };
    }
  }
  return { length: a, side1: best!.s1, side2: best!.s2 };
}

export function packOrder(items: PackItem[]): Parcel {
  const blocks: Block[] = [];
  let weight = 0;

  for (const item of items) {
    const quantity = Math.max(1, Math.floor(item.quantity));
    const dims = [
      positive(item.height_cm, DEFAULT_HEIGHT_CM),
      positive(item.width_cm, DEFAULT_WIDTH_CM),
      positive(item.length_cm, DEFAULT_LENGTH_CM),
    ].sort((x, y) => y - x);
    blocks.push(packSku(dims[0]!, dims[1]!, dims[2]!, quantity));
    weight += positive(item.weight_kg, DEFAULT_WEIGHT_KG) * quantity;
  }

  const length = Math.max(...blocks.map((b) => b.length));
  const volume = blocks.reduce((sum, b) => sum + b.length * b.side1 * b.side2, 0);
  const area = volume / length;

  // Every block must fit the cross-section (smaller side x larger side), and the cross-section
  // must hold the total volume.
  let small = Math.max(...blocks.map((b) => Math.min(b.side1, b.side2)));
  let large = Math.max(...blocks.map((b) => Math.max(b.side1, b.side2)));
  if (small * large < area) {
    small = Math.max(small, Math.ceil(Math.sqrt(area)));
    large = Math.max(large, Math.ceil(area / small));
  }

  return {
    length: Math.ceil(length),
    width: Math.ceil(large),
    height: Math.ceil(small),
    weight: Math.ceil(weight * 1000) / 1000,
  };
}
