-- Two stock-driven e-mail rules, both fired from a single trigger on product_variants (so they
-- fire the same way whether stock changed via a sale — debit_stock_on_paid's own UPDATE — or via
-- the admin editing it by hand in Admin > Anúncio > Estoque):
--
--   1. "Baixo estoque" — crossing down to <=10 units notifies the admin (SKU + quantidade left),
--      once, not on every sale while it stays low; low_stock_alerted_at is the guard, and it's
--      cleared the moment an admin restocks it back above 10, so a future dip alerts again.
--   2. "Voltou ao estoque" — going from 0 to >0 e-mails everyone on that SKU's restock waitlist.

alter table public.product_variants
  add column if not exists low_stock_alerted_at timestamptz;

-- "Avise-me quando voltar" sign-ups from the product page. Anyone (including guests) can add
-- themselves; only the admin (or the signed-in owner, to check "already on the list") can read.
create table if not exists public.restock_notifications (
  id uuid primary key default gen_random_uuid(),
  product_variant_id uuid not null references public.product_variants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text,
  email text not null,
  created_at timestamptz not null default now(),
  notified_at timestamptz
);

-- One active (not yet notified) sign-up per e-mail per SKU — a second attempt hits this instead of
-- silently duplicating, and the product page shows "você já está na lista" on that conflict.
create unique index if not exists restock_notifications_variant_email_pending_idx
  on public.restock_notifications (product_variant_id, lower(email))
  where notified_at is null;

create index if not exists restock_notifications_pending_idx
  on public.restock_notifications (product_variant_id)
  where notified_at is null;

alter table public.restock_notifications enable row level security;

create policy restock_notifications_insert on public.restock_notifications
  for insert
  with check (user_id is null or user_id = auth.uid());

create policy restock_notifications_owner_select on public.restock_notifications
  for select
  using (auth.uid() = user_id);

create policy restock_notifications_admin_all on public.restock_notifications
  for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create or replace function public.handle_stock_quantity_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stock_quantity <= 10 and old.stock_quantity > 10 and new.low_stock_alerted_at is null then
    new.low_stock_alerted_at := now();
    perform net.http_post(
      url := 'https://ogxsdptftgxrujkfscvi.supabase.co/functions/v1/stock-alert-hooks',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('event', 'low_stock', 'variantId', new.id::text)
    );
  elsif new.stock_quantity > 10 and new.low_stock_alerted_at is not null then
    -- Restocked comfortably — a future dip below 10 is treated as new again, and alerts once more.
    new.low_stock_alerted_at := null;
  end if;

  if old.stock_quantity = 0 and new.stock_quantity > 0 then
    perform net.http_post(
      url := 'https://ogxsdptftgxrujkfscvi.supabase.co/functions/v1/stock-alert-hooks',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('event', 'back_in_stock', 'variantId', new.id::text)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists product_variants_stock_alerts on public.product_variants;
create trigger product_variants_stock_alerts
  before update of stock_quantity on public.product_variants
  for each row
  when (old.stock_quantity is distinct from new.stock_quantity)
  execute function public.handle_stock_quantity_change();

insert into public.email_templates (id, subject, html_body) values
('low_stock_alert', 'Estoque baixo: {{sku}} — restam {{quantidade}}',
 '<p>O SKU <strong>{{sku}}</strong> ({{produto}}{{variante}}) está com apenas <strong>{{quantidade}}</strong> unidade(s) em estoque.</p><p><a href="{{link_estoque}}" style="color:#16a34a;">Atualizar o estoque</a></p>'),
('restock_available', 'Voltou! {{produto}} já está disponível',
 '<p>Olá, {{nome}}!</p><p>O produto que você tinha interesse, <strong>{{produto}}{{variante}}</strong>, já está disponível de novo.</p><p><a href="{{link_produto}}" style="color:#16a34a;">Ver produto</a></p>')
on conflict (id) do nothing;
