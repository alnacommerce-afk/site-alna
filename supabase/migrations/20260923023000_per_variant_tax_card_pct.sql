-- Imposto e taxa de cartão passam a ser por variação (produtos/categorias diferentes têm
-- alíquotas diferentes) — só a margem desejada continua única para a loja toda em
-- pricing_settings. Semeia cada variação com o % global que já estava configurado, para não
-- resetar o cálculo que o admin já tinha ajustado.
alter table public.product_variants
  add column if not exists tax_rate_pct numeric not null default 0,
  add column if not exists card_fee_pct numeric not null default 0;

update public.product_variants
set tax_rate_pct = coalesce((select tax_rate_pct from public.pricing_settings where id = 'default'), 0),
    card_fee_pct = coalesce((select card_fee_pct from public.pricing_settings where id = 'default'), 0);

alter table public.pricing_settings
  drop column if exists tax_rate_pct,
  drop column if exists card_fee_pct;
