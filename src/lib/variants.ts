// Variações: primária (ex.: cor) e secundária (ex.: tamanho) ligada a ela pelo parent_variant_id.
// Regra de venda: quem o cliente compra é a variação que NÃO é pai de ninguém. Assim, uma primária
// que tem secundárias nunca vira compra sozinha (e nunca define o "a partir de"), mesmo que a
// Precificação tenha dado um preço a ela. Produto sem secundárias continua igual a antes.
export type VariantLink = { id: string; parent_variant_id?: string | null };

export function sellableVariants<T extends VariantLink>(variants: T[]): T[] {
  const parentIds = new Set(
    variants.map((v) => v.parent_variant_id).filter((x): x is string => Boolean(x)),
  );
  return variants.filter((v) => !parentIds.has(v.id));
}
