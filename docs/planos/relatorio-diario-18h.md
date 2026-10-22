# Plano: relatório diário das 18h (Discord, visão de sócio)

**Autor:** Gerente, com base em Arquiteto (19/10/2026). **Status:** proposta. Nada foi publicado nem agendado. Cada passo só roda com o "ok" do dono.

## 1. O que o dono pediu
Todo dia às 18h, um resumo no Discord com: como rodou cada setor, o que aprendeu, se houve erro e se foi corrigido, o que o dono precisa fazer, e os números de marketing (acessos, carrinhos, compras).

## 2. Formato da mensagem (sequência fixa)
1. **Abertura (3 linhas):** data, o que mudou no dia, quantas pendências são do dono.
2. **Marketing (números do dia e da semana):** acessos, carrinhos, compras, e a taxa entre eles.
3. **Setores (uma linha por setor):** Backoffice (Executor e Memória), Auditoria, Arquiteto, Financeiro, Jurídico, Vendas (Vendedor, Estoquista, Vitrine).
   Para cada um: rodou? aprendeu? erro? corrigido? pendência do dono?
4. **Pendências do dono (no máximo 5, com o pedido de decisão):** cada uma com uma frase e a pergunta.
5. **Rodapé:** commit do dia, links para os diários e para este plano.

Regra: se um setor não rodou, a linha diz "não rodou hoje", sem inventar atividade.

## 3. Fontes de dados (fato)
- **Acessos:** GA4 (fato: existe integração no código, `src/lib/analytics/ga4.ts`, e a Visão Geral usa uma conta de serviço do Google). Não consegui verificar se a conta de serviço e o Property ID estão preenchidos. Precisa confirmar no painel Admin > Conexões. Sem isso, não há número de acesso.
- **Carrinhos:** tabela `abandoned_carts` (fato: existe). Mostra carrinhos salvos, não todos os carrinhos abertos. Definição a fechar com o dono: "carrinho" = carrinho salvo (padrão proposto) ou também carrinho com item sem salvar (não há registro no banco hoje).
- **Compras:** tabela `orders` com status de pagamento (fato: existe). Definição proposta: pedido pago no dia (horário de Brasília).
- **Pedidos de teste:** separar pedidos e carrinhos dos e-mails de teste do dono (`aleqs.santos`, `informacoes.asm`, `alnaexpedicao`). Decisão do dono (16/10): contam como clientes reais no Caixa, então no relatório de marketing ficam em uma linha separada, para não inflar o número.
- **Setores:** diários em `docs/agentes/`, `docs/SESSOES.md`, `git log` do dia e tabelas `agent_task` e `agent_handoff` (criadas em 19/10).

## 4. Dados pessoais
O relatório só mostra números e nomes de produto. Nada de CPF, e-mail ou nome de cliente. A redação é a mesma do índice do RAG.

## 5. Como vai ser feito (ordem)
- [ ] **R1.** Confirmar a conta de serviço do GA4 e o Property ID (dono, no painel). Requer ok.
- [ ] **R2.** Definir "carrinho" e "compra" (dono). Requer decisão.
- [ ] **R3.** Função de consulta de números (só leitura, no Supabase) e teste com dados de ontem. Requer ok para publicar.
- [ ] **R4.** Função de montagem do relatório, lendo `agent_task`, `agent_handoff`, diários e commits do dia. Requer ok.
- [ ] **R5.** Envio ao Discord pelo webhook guardado no Vault (já criado, `discord_webhook_relatorio`), agendado no `pg_cron` às 21h UTC (18h de Brasília). Requer ok.
- [ ] **R6.** Primeira execução em modo teste, com a Auditoria conferindo o texto antes de ativar a rotina. Requer ok.

## 6. Plano de apresentação (o que eu falo, nessa ordem, em cada relatório)
- **Minuto 0–1:** "Hoje foram X mudanças. Y coisas esperam você." (é a primeira linha de todo dia.)
- **Minuto 1–2 (marketing):** acessos, carrinhos, compras, e a variação em relação a ontem e à semana anterior. Se não houver dado, digo "sem dado de acesso" e não invento.
- **Minuto 2–4 (setores):** uma linha por setor. Erro: o que deu errado, o que foi feito, e se está resolvido.
- **Minuto 4–5 (pendências):** no máximo cinco, cada uma com a pergunta que você precisa responder.
- **Fechamento:** "Nada foi publicado sem o seu ok." (repete em todo relatório, para não haver dúvida.)

## 7. Riscos
- R-a. Número de acesso errado (GA4 sem conta de serviço ou com dado de outra propriedade). Mitigação: a linha de acesso mostra a data e a fonte.
- R-b. Relatório longo demais e o dono deixa de ler. Mitigação: limite de cinco pendências e uma linha por setor.
- R-c. Falha no envio às 18h. Mitigação: o pg_cron registra o resultado; se falhar, a Memória registra e reenvia no dia seguinte, sem repetir o relatório antigo.
- R-d. Dado de cliente vazar no Discord. Mitigação: só números agregados e a redação do item 4.

## 8. Decisões do dono
1. A conta de serviço do GA4 está preenchida? (Admin > Conexões.)
2. Definição de "carrinho": só os salvos, ou também os abertos sem salvar?
3. Definição de "compra": pedido pago no dia?
4. Pode usar o horário de 18h de Brasília (21h UTC)?
5. O relatório inclui o fim de semana, ou só dias úteis?
