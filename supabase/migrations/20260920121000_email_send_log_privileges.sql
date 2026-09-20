-- The log holds e-mail bodies (customer names, order links). Only admins read it (RLS policy) and
-- only the edge functions (service_role) write it; strip the default broad table grants as well.
revoke all on public.email_send_log from anon;
revoke insert, update, delete, truncate, references, trigger on public.email_send_log from authenticated;
