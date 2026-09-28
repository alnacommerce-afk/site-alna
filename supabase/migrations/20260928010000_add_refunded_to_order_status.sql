-- asaas-webhook now writes status: "refunded" for refund events (see 20260928000000's sibling
-- commit), distinct from "cancelled" — but the enum never got the new value, so the first refund
-- would fail with "invalid input value for enum order_status: refunded".
alter type public.order_status add value if not exists 'refunded';
