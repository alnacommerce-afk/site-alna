-- Order history ("história do pedido"): one row per milestone (compra, pagamento, etiqueta,
-- postagem, entrega...). Customers read their own orders' events; admins read all. Nobody writes
-- from the app: rows come from the trigger below and from the sync-delivery-status function
-- (service role).
create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null,
  title text not null,
  detail text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (order_id, kind)
);

create index if not exists order_events_order_id_idx on public.order_events (order_id, occurred_at);

alter table public.order_events enable row level security;

create policy order_events_customer_select on public.order_events
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_events.order_id and o.user_id = auth.uid()));

create policy order_events_admin_all on public.order_events
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

grant select on public.order_events to authenticated;

create or replace function public.track_order_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into order_events (order_id, kind, title, occurred_at)
    values (new.id, 'order_created', 'Compra realizada', new.created_at)
    on conflict (order_id, kind) do nothing;
  end if;

  if new.status in ('paid', 'shipped', 'completed') then
    insert into order_events (order_id, kind, title, detail, occurred_at)
    values (new.id, 'payment_confirmed', 'Pagamento confirmado', 'Recebemos o seu pagamento e já estamos preparando o pedido.', now())
    on conflict (order_id, kind) do nothing;
  end if;

  if new.label_url is not null or new.melhor_envio_shipment_id is not null then
    insert into order_events (order_id, kind, title, detail, occurred_at)
    values (
      new.id, 'label_generated', 'Etiqueta de envio gerada',
      case when new.tracking_code is not null then 'Código de rastreio: ' || new.tracking_code
           else 'Pedido embalado e aguardando a coleta ou postagem.' end,
      now()
    )
    on conflict (order_id, kind) do update
      set detail = excluded.detail
      where new.tracking_code is not null;
  end if;

  if new.delivered_at is not null then
    insert into order_events (order_id, kind, title, detail, occurred_at)
    values (new.id, 'delivered', 'Pedido entregue', 'O pedido chegou ao destino. Obrigado por comprar na ALNA!', new.delivered_at)
    on conflict (order_id, kind) do nothing;
  end if;

  if new.status = 'cancelled' then
    insert into order_events (order_id, kind, title, occurred_at)
    values (new.id, 'cancelled', 'Pedido cancelado', now())
    on conflict (order_id, kind) do nothing;
  end if;

  if new.status = 'refunded' then
    insert into order_events (order_id, kind, title, detail, occurred_at)
    values (new.id, 'refunded', 'Pagamento estornado', 'O valor foi devolvido na forma de pagamento usada na compra.', now())
    on conflict (order_id, kind) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_track_events on public.orders;
create trigger orders_track_events
  after insert or update on public.orders
  for each row execute function public.track_order_events();

-- Backfill: rebuild the history of orders that already exist, using the best dates we have.
insert into public.order_events (order_id, kind, title, occurred_at)
select id, 'order_created', 'Compra realizada', created_at from public.orders
on conflict (order_id, kind) do nothing;

insert into public.order_events (order_id, kind, title, detail, occurred_at)
select id, 'payment_confirmed', 'Pagamento confirmado',
       'Recebemos o seu pagamento e já estamos preparando o pedido.', updated_at
from public.orders where status in ('paid', 'shipped', 'completed')
on conflict (order_id, kind) do nothing;

insert into public.order_events (order_id, kind, title, detail, occurred_at)
select id, 'label_generated', 'Etiqueta de envio gerada',
       case when tracking_code is not null then 'Código de rastreio: ' || tracking_code
            else 'Pedido embalado e aguardando a coleta ou postagem.' end,
       updated_at
from public.orders where label_url is not null or melhor_envio_shipment_id is not null
on conflict (order_id, kind) do nothing;

insert into public.order_events (order_id, kind, title, detail, occurred_at)
select id, 'delivered', 'Pedido entregue', 'O pedido chegou ao destino. Obrigado por comprar na ALNA!', delivered_at
from public.orders where delivered_at is not null
on conflict (order_id, kind) do nothing;
