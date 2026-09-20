-- Every e-mail the store tries to send (sent, failed or skipped), written by the edge functions
-- through send-email.ts and read by Admin > E-mails.
create table if not exists public.email_send_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  from_email text not null,
  to_email text not null,
  subject text not null,
  template text,
  html text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  provider_id text,
  error text
);

create index if not exists email_send_log_created_at_idx on public.email_send_log (created_at desc);
create index if not exists email_send_log_status_idx on public.email_send_log (status);

alter table public.email_send_log enable row level security;

drop policy if exists "Admins can read the e-mail log" on public.email_send_log;
create policy "Admins can read the e-mail log"
  on public.email_send_log for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

grant select on public.email_send_log to authenticated;
grant all on public.email_send_log to service_role;
