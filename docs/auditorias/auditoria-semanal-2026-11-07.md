# AUDITORIA SEMANAL — 07/11/2026 (Computador HOME)

Conduzida pelo Gerente. Verificações só de leitura, salvo onde o dono pediu correção (relatório das 18h). Cada item diz o que foi **verificado** e o que é **inferência**.

## Resumo para o dono
1. **Pedidos:** o último pedido criado no banco é de 17/10. Último carrinho salvo em 24/10. O seu pedido de teste vai dizer se o checkout está gravando pedidos. (verificado)
2. **Relatório das 18h — corrigido.** A seção de setores lia `agent_task`, que não é atualizada desde 19/10. Agora o relatório traz a "AUDITORIA DIÁRIA (automática)" com itens A1 a A6. Teste enviado ao Discord em 07/11. (verificado)
3. **alna.cc (sem www): funciona de forma intermitente.** Você testou e funcionou; eu testei 6 vezes e errou em todas as tentativas HTTPS, e o HTTP alternou entre 403 e 301. Causa: o DNS de `alna.cc` tem registros extras que não são da loja (IPs 45.55.107.236, 104.156.247.183, 108.61.89.136 e um IPv6 que responde 403). Pedir à Hostnet para deixar só o registro que aponta para `www`. (verificado)
4. **Certificado de `www.alna.cc` renovado:** vale até 17/01/2027. (verificado; o alerta de 17/11 era do certificado antigo)
5. **Segurança do banco: sem risco imediato.** As funções de segredo verificam se é administrador. Há 7 funções de gatilho acessíveis pelo papel anônimo, que devem ser fechadas (ajuste de baixo risco). Detalhes abaixo.

## Site (medido em 07/11)
| Página | Resultado (1ª medição) |
|---|---|
| alna.sale | 200, 0,15 s |
| alna.sale/atacado | 200, 0,29 s |
| store.alna.sale (raiz) | 302 para /loja, 2,5 s (o redirecionamento é o trecho lento) |
| store.alna.sale/loja | 200, 0,58 s |
| store.alna.sale/carrinho | 200, 0,32 s |
| store.alna.sale/checkout | 200, 0,92 s |
| store.alna.sale/politica-de-privacidade | 200, 0,32 s |
| www.alna.cc | 301 para alna.sale (ok) |
| alna.cc (sem www) | intermitente (ver resumo, item 3) |

- Re-medição agora: `alna.sale` 200 em 0,35 s; o item de 0,15 s anterior é uma medição isolada. Os valores acima são de 07/11 e mostram ordem de grandeza, não média.
- Não verificado: visual da Home após o commit `81178ff` (rodapé) e `726d7e4` (link Contato removido); páginas de admin (exigem login); nota PageSpeed (depende de prints do dono).

## Checkout, carrinho e pagamento
- Páginas respondem. Não foi feita compra de teste (não autorizado).
- **Pedido 8433b1a9** (Pix antigo, Asaas antiga, R$ 59,40, criado em 15/09/2026): continua **PENDING**. Não há confirmação de pagamento. É a decisão pendente de cancelar ou manter. (verificado no banco)
- Cron `payment-health-check` roda a cada 6 horas e passou com sucesso (`cron.job_run_details`). (verificado)
- Cron `process-abandoned-carts` roda a cada 5 min, com sucesso nas últimas execuções. (verificado)

## Discord (relatório das 18h)
- Agendamento `relatorio-diario-18h-brasilia` (job 10): todo dia às 21h UTC (18h de Brasília). (verificado)
- Causa da falha de ligação (verificado no código e no banco): a seção "Setores" lia `agent_task` das últimas 24 h; a tabela tem 7 registros, o último em 19/10/2026 22:46 UTC.
- **Correção aplicada (07/11):** migração `auditoria_resumo` (só leitura, acesso só para o serviço interno) e Edge Function `relatorio-diario` v3. A mensagem agora traz a "AUDITORIA DIÁRIA (automática)" com itens numerados:
  - A1 Páginas (status e tempo, 5 páginas);
  - A2 Pedidos (último pedido);
  - A3 Carrinhos salvos (último);
  - A4 Agendamentos (falhas nas últimas 24 h);
  - A5 Setores (último registro no banco, alerta após 3 dias);
  - A6 Estoque (variações com 100 unidades).
- Teste: envio ao Discord em 07/11 com resposta `enviado: true` (HTTP 200). (verificado)
- Acessos (GA4): no teste, 4 usuários, 7 sessões e 36 visualizações em 06/11. (verificado)

## Setores (estado de cada um)
| Setor | Estado | Pendências |
|---|---|---|
| **Gerente** | Diário sem entrada entre 24/10 e 06/11. Registro retroativo feito hoje em `docs/agentes/gerente.md` | Nenhuma |
| **Executor do Backoffice** | Sem execução registrada desde 19/10 | Nenhuma tarefa pendente identificada |
| **Memória do Backoffice** | Ativa; `SESSOES.md` com entrada de 07/11 | Nenhuma |
| **Auditoria** | Última conferência ao vivo em 19/10 (sem erro nas páginas). Hoje: conferência de páginas e de alna.cc | Visual da variação `short-masculino`; confirmar a correção do DNS de alna.cc |
| **Financeiro** | Pedido 8433b1a9 PENDING (R$ 59,40, desde 15/09) | Decisão: cancelar ou manter. Caixa "Salve seu carrinho": leitura prevista para 30/10–06/11, sem registro |
| **Jurídico (Google Ads)** | `STATUS.md` com última atualização em 14/10. Sem fato novo | Hostnet (DNS de alna.cc); respostas R7 (3) e (4). Não enviar nova contestação sem fato novo |
| **Arquiteto** | RAG parado: a extensão `vector` está instalada (0.8.2), mas a tabela de trechos e a função de busca foram retiradas em 22/10 | Decidir provedor de embeddings e a chave da LLM (ver abaixo) |
| **Vendas (Vendedor)** | Campanha de 27/10 com 2 cupons: sem registro se saiu | Confirmar com o dono |
| **Estoquista** | **64 de 71 variações com exatamente 100 unidades** (lista no Discord, item A6). Os números antigos (51 de 54) estavam desatualizados | Confirmação do dono: são estoques reais ou valor padrão? |
| **Vitrine** | Foto da variação primária aguarda escolha do dono | Escolha do dono |
| **Vigia (repositório)** | Funcionando: `main` em `726d7e4`, sincronizado com `origin/main`; só esta pasta de auditoria sem commit | Nenhuma |

### RAG: o que falta para voltar a funcionar
- Confirmado na documentação oficial do Supabase: existe embedding nativo nas Edge Functions com o modelo `gte-small`, sem chave externa. **Limitação:** o modelo é voltado a inglês e corta textos em 512 tokens; nossos documentos são em português, então a busca tende a ser pior.
- Alternativa: um provedor de embeddings multilíngue com chave paga (como a Voyage usada antes, que tinha limite de 3 requisições por minuto sem cartão).
- A resposta em linguagem natural exige uma chave da LLM (Anthropic), guardada no Vault. **Não me envie a chave no chat**: você a cadastra no Vault.
- Decisão do dono: qual provedor de embeddings e se a chave da LLM será cadastrada agora.

## Banco de dados e segurança (Supabase, só leitura)
- **Funções de segredo** (`set_integration_secret`, `clear_integration_secret`): **sem risco.** Verificam o papel de administrador antes de agir. (verificado no código da função)
- **Função `create_data_request`** (formulário LGPD público): acessível sem login; é intencional. Pode receber mensagens em excesso (sem limite de envio), risco baixo.
- **5 funções de gatilho** (`debit_stock_on_paid`, `handle_stock_quantity_change`, `remember_old_product_slug`, `sync_referral_reward_percent`, `track_order_events`) executáveis pelo papel anônimo. Gatilho não deve ser chamado pela API. Risco baixo; correção de hábito: retirar a permissão do papel anônimo. **Exige o seu ok.**
- **`has_role`:** acessível pelo papel anônimo. Usada nas políticas de acesso; retirar só do papel anônimo, com teste. **Exige o seu ok.**
- **Proteção contra senha vazada** desativada no login (Auth). Ativar é uma mudança de configuração. **Exige o seu ok.**
- **4 tabelas sem política de acesso** (`agent_handoff`, `agent_task`, `order_item_pricing`, `order_payment_snapshot`): fechadas para o público, o esperado para tabelas internas. Sem ação.

## Repositório
- `main` em `726d7e4` (07/11), sincronizado com `origin/main`.
- Migração `auditoria_resumo` e Edge Function `relatorio-diario` v3 aplicadas no banco e publicadas, **ainda não commitadas** no repositório (arquivos em `supabase/`). Commit só com ordem do dono.

## Pendências do dono (consolidadas)
1. **Seu pedido de teste:** para confirmar que o checkout grava pedido (desde 17/10 nada entrou).
2. **Hostnet:** deixar só o registro de `alna.cc` que aponta para `www`.
3. **Pedido 8433b1a9:** cancelar ou manter.
4. **Estoque:** confirmar as 64 variações com 100 unidades (item A6).
5. **RAG:** provedor de embeddings e chave da LLM (cadastrar no Vault).
6. **Segurança (baixo risco):** autorizar o fechamento das permissões anônimas das funções de gatilho e de `has_role`, e a proteção de senha vazada.
7. **Campanha de 27/10:** saiu ou não.
8. **Caixa "Salve seu carrinho":** decisão.
9. **Foto da variação primária** (Vitrine) e prints do PageSpeed da `/loja`.

## Rotina diária e semanal no Discord
- **Diária (feita):** a mensagem das 18h traz a "AUDITORIA DIÁRIA (automática)", com itens A1 a A6 para responder pelo número.
- **Semanal (aguarda ok):** esta auditoria completa seria enviada por Claude todo domingo, com o título "AUDITORIA SEMANAL", por uma rotina agendada. Custo: uma sessão de Claude por semana. Exige o seu ok.
