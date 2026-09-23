-- Daily FinMarket HUB cost/price sync — same pattern as the other pg_cron-driven functions
-- (sync-delivery-status, process-cart-reminders): a plain http_post with no auth, since sync-skus
-- doesn't trust caller input and only acts through the service role. Runs at 09:00 UTC (06:00
-- BRT), before the store's daily traffic, so prices reflect the freshest cost.
select cron.schedule(
  'sync-skus-daily',
  '0 9 * * *',
  $$
  select net.http_post(
    url := 'https://ogxsdptftgxrujkfscvi.supabase.co/functions/v1/sync-skus',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
