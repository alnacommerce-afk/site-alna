-- Monitoramento do fluxo de pagamento (Asaas). Uma linha por verificação; payment-health-check
-- (cron) e checkout-create (falha real de cliente) gravam aqui e alertam o admin por e-mail.
--   asaas_api_key        — a chave de API da Asaas ainda é aceita?
--   asaas_webhook_queue  — a fila de webhooks da Asaas está ativa e não pausada?
--   site_webhook_endpoint — nosso asaas-webhook responde 200 com o token configurado?
--   checkout_asaas       — um cliente de verdade esbarrou num erro de credencial da Asaas?
create table if not exists public.payment_health_status (
  check_name text primary key,
  ok boolean not null,
  detail text,
  checked_at timestamptz not null default now(),
  last_alert_at timestamptz
);

alter table public.payment_health_status enable row level security;

create policy payment_health_status_admin_select on public.payment_health_status
  for select
  using (has_role(auth.uid(), 'admin'::app_role));

-- A cada 6 horas: a Asaas pausa a fila de webhooks após 15 falhas seguidas e perde eventos com mais
-- de 14 dias — quanto antes o alerta chegar, menos tempo de pagamentos sem confirmação.
select cron.schedule(
  'payment-health-check',
  '0 */6 * * *',
  $$
  select net.http_post(
    url := 'https://ogxsdptftgxrujkfscvi.supabase.co/functions/v1/payment-health-check',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
