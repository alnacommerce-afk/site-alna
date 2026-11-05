-- Pedidos do titular (LGPD, art. 18): "Exercer meus direitos" em /politica-de-privacidade.
-- Qualquer visitante pode registrar um pedido (inclusive sem conta); só o admin lê e atualiza.
-- Cada pedido recebe um protocolo para o cliente acompanhar; o prazo de resposta é controlado pelo admin.

create table if not exists public.data_requests (
  id uuid primary key default gen_random_uuid(),
  protocol text not null unique default (
    'LGPD-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6))
  ),
  request_type text not null check (
    request_type in ('acesso', 'correcao', 'exclusao', 'portabilidade', 'revogacao', 'informacao', 'outro')
  ),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 254 and position('@' in email) > 1),
  phone text check (phone is null or char_length(phone) <= 30),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'recebido' check (status in ('recebido', 'em_analise', 'concluido', 'negado')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists data_requests_status_idx on public.data_requests (status, created_at);

alter table public.data_requests enable row level security;

create policy data_requests_public_insert on public.data_requests
  for insert
  to anon, authenticated
  with check (status = 'recebido' and responded_at is null);

create policy data_requests_admin_all on public.data_requests
  for all
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- Quem envia recebe o protocolo de volta (RLS não permite ler a linha, então a função devolve só o protocolo).
create or replace function public.create_data_request(
  p_request_type text,
  p_name text,
  p_email text,
  p_phone text,
  p_details text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_protocol text;
begin
  insert into public.data_requests (request_type, name, email, phone, details)
  values (p_request_type, trim(p_name), lower(trim(p_email)), nullif(trim(p_phone), ''), nullif(trim(p_details), ''))
  returning protocol into v_protocol;
  return v_protocol;
end;
$$;

revoke all on function public.create_data_request(text, text, text, text, text) from public;
grant execute on function public.create_data_request(text, text, text, text, text) to anon, authenticated;
