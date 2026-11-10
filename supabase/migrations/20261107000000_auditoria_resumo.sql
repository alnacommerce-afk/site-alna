-- Auditoria diária/semanal no relatório das 18h (07/11/2026).
-- Resumo só de leitura, usado pela Edge Function relatorio-diario. Sem dado pessoal: só datas e contagens.
-- Acesso só para service_role (quem chama é a Edge Function, com o token do Vault).

create or replace function public.auditoria_resumo()
returns jsonb
language sql
security definer
set search_path = public, cron
as $$
  select jsonb_build_object(
    'ultimo_pedido_qualquer', (select max(created_at) from public.orders),
    'ultimo_pedido_pago', (select max(created_at) from public.orders where payment_status in ('RECEIVED', 'CONFIRMED')),
    'ultimo_carrinho_salvo', (select max(created_at) from public.abandoned_carts),
    'ultima_tarefa_agente', (select max(atualizado_em) from public.agent_task),
    'agendamentos_com_falha_24h', (
      select count(*) from cron.job_run_details
      where status <> 'succeeded' and start_time > now() - interval '24 hours'
    ),
    'variantes_estoque_100', (select count(*) from public.product_variants where stock_quantity = 100)
  );
$$;

revoke all on function public.auditoria_resumo() from public, anon, authenticated;
grant execute on function public.auditoria_resumo() to service_role;
