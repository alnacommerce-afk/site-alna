-- site_settings é lida pelo site público (rodapé, frete grátis, GA4), mas também guarda dados que
-- não devem ser públicos: e-mail de notificação do admin, endereço de origem do envio e o ID da
-- propriedade GA4. RLS não filtra colunas, então o acesso é cortado por coluna: anon/authenticated
-- só enxergam as colunas abaixo. As edge functions usam service_role e continuam lendo tudo; a
-- tela Admin > Configurações lê a linha completa pela função get_site_settings_admin (só admin).
revoke select on public.site_settings from anon, authenticated;

grant select (
  id, store_name, cnpj, razao_social, phone, whatsapp, email,
  address_city, address_state, business_hours, instagram_handle, facebook_url,
  updated_at, free_shipping_threshold_cents, ga4_measurement_id
) on public.site_settings to anon, authenticated;

create or replace function public.get_site_settings_admin()
returns public.site_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.site_settings;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Forbidden';
  end if;
  select * into result from public.site_settings where id = 'default';
  return result;
end;
$$;

revoke execute on function public.get_site_settings_admin() from public, anon;
grant execute on function public.get_site_settings_admin() to authenticated;
