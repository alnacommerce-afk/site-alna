-- Margem também passa a ser por variação (mesmo motivo de imposto/cartão: um produto específico
-- pode precisar de margem maior ou menor que o resto). Semeia com o valor global que já estava em
-- pricing_settings, depois derruba essa tabela — não sobra mais nenhum % único para a loja toda.
alter table public.product_variants
  add column if not exists margin_pct numeric not null default 0;

update public.product_variants
set margin_pct = coalesce((select desired_margin_pct from public.pricing_settings where id = 'default'), 0);

drop table if exists public.pricing_settings;
