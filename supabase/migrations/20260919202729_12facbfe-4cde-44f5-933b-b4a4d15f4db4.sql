insert into public.integration_connections (id, label, status)
values
  ('finmarket_hub_api', 'FinMarket HUB — chave que o FinMarket usa para ler as vendas', 'pending'),
  ('finmarket_hub_skus', 'FinMarket HUB — chave para buscar SKUs e custos', 'pending')
on conflict (id) do nothing;

alter table public.product_variants
  add column if not exists cost_cents integer,
  add column if not exists extra_cost_cents integer,
  add column if not exists cost_synced_at timestamptz;