-- Global % settings for Admin > Precificação (alíquota de imposto, taxa do cartão, margem
-- desejada). A single row, admin-only in both directions — unlike site_settings, nothing here is
-- ever meant to be readable by the storefront (it's the store's cost/margin structure).
create table if not exists public.pricing_settings (
  id text primary key default 'default',
  tax_rate_pct numeric not null default 0,
  card_fee_pct numeric not null default 0,
  desired_margin_pct numeric not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.pricing_settings (id) values ('default')
on conflict (id) do nothing;

alter table public.pricing_settings enable row level security;

create policy pricing_settings_admin_all on public.pricing_settings
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create trigger set_pricing_settings_updated_at
  before update on public.pricing_settings
  for each row execute function public.set_updated_at();
