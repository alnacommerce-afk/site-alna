-- Margem p/ promo (%) por variação. Padrão 0: não muda nenhum preço existente.
-- Já aplicada no projeto Site-Alna em 21/11/2026 (apply_migration, nome margem_promo_pct).
alter table public.product_variants add column if not exists margem_promo_pct numeric not null default 0;
