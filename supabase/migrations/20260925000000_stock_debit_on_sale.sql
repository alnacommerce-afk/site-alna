-- Stock now lives in Admin > Anúncio > Estoque and is debited automatically on every sale.
-- An order debits stock exactly once, the first time it reaches a paid-like status; stock_debited_at
-- is the idempotency guard (card orders are inserted pending and updated to paid; Pix orders are
-- updated to paid by the Asaas webhook — both go through the same trigger).
alter table public.orders add column if not exists stock_debited_at timestamptz;

-- Orders that already exist were counted by hand in the stock numbers; never debit them again.
update public.orders set stock_debited_at = now()
where stock_debited_at is null and status::text in ('paid', 'shipped', 'completed');

create or replace function public.debit_stock_on_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stock_debited_at is null and new.status::text in ('paid', 'shipped', 'completed') then
    update public.product_variants v
       set stock_quantity = greatest(v.stock_quantity - i.qty, 0)
      from (
        select product_variant_id, sum(quantity)::int as qty
          from public.order_items
         where order_id = new.id and product_variant_id is not null
         group by product_variant_id
      ) i
     where v.id = i.product_variant_id;
    new.stock_debited_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_debit_stock on public.orders;
create trigger orders_debit_stock
  before insert or update on public.orders
  for each row execute function public.debit_stock_on_paid();
