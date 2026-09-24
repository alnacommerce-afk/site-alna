-- FinMarket HUB devolve 3 custos por SKU (compra, extra e frete) que juntos formam o custo total —
-- estávamos somando só compra + extra, deixando o frete de fora do preço calculado.
alter table public.product_variants
  add column if not exists freight_cost_cents integer;
