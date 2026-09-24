-- "Desconto no anúncio": um preço "de" mais alto (compare_at_price_cents) que, aplicado esse %
-- de desconto, cai exatamente no preço calculado (price_cents) — a margem real do lojista nunca
-- muda, só a forma como o preço aparece pro cliente (risca o "de", cobra o "por").
alter table public.product_variants
  add column if not exists discount_pct numeric not null default 0;
