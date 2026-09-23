-- track_order_events() compared new.status (enum order_status) to the literal 'refunded',
-- which is not a value of that enum. Postgres casts the literal to the enum type to compare,
-- so this raised "invalid input value for enum order_status" on EVERY update to public.orders
-- (not just ones actually going refunded) — including sync-delivery-status's delivered_at/status
-- update, which silently failed and caused it to resend the "chegou" e-mail every 30 minutes.
-- Cast the column to text instead, so the comparison never errors regardless of enum contents.
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

  if new.status::text in ('paid', 'shipped', 'completed') then
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

  if new.status::text = 'cancelled' then
    insert into order_events (order_id, kind, title, occurred_at)
    values (new.id, 'cancelled', 'Pedido cancelado', now())
    on conflict (order_id, kind) do nothing;
  end if;

  if new.status::text = 'refunded' then
    insert into order_events (order_id, kind, title, detail, occurred_at)
    values (new.id, 'refunded', 'Pagamento estornado', 'O valor foi devolvido na forma de pagamento usada na compra.', now())
    on conflict (order_id, kind) do nothing;
  end if;

  return new;
end;
$$;
