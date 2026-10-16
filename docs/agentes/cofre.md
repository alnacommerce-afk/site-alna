# Diário do Cofre

Acrescenta sempre; nunca apaga. Cada entrada: data, computador, pedido, chaves citadas (só nomes), o que foi verificado e o que o dono decidiu. Nunca registra valores de chaves, senhas ou tokens.

## 2026-10-15 — Computador HOME — implantação
- Skill `cofre` criada e aprovada pelo dono (Onda 2, segundo funcionário).
- Ainda não foi acionado em nenhuma consulta real. Teste pendente: sessão nova dentro de `C:\Users\Pichau\dev\site-alna`, com uma pergunta já conhecida: onde está a chave `finmarket_hub_api` e quando foi trocada pela última vez.

## 2026-10-15 — Computador HOME — consulta: `finmarket_hub_api`
- Pedido: onde está a chave `finmarket_hub_api` e quando foi trocada pela última vez.
- Onde está (visto no repositório): Cofre do Supabase (Vault), id `finmarket_hub_api`, gerida em Admin > Conexões de API (botão "Gerar chave"). Usada pelo FinMarket HUB no cabeçalho `x-api-key`, lida pela função `sales-report`. Fontes: `docs/sales-report-finmarket.md`, `supabase/functions/sales-report/index.ts`, `src/routes/admin/conexoes.tsx`.
- Quando foi trocada: NÃO CONFIRMADO. O repositório não registra data de troca. Vistos: linha criada como `pending` nas migrações de 19/09/2026 (`20260919120000_finmarket_hub_integration.sql` e `20260919202729_...sql`) e o botão "Gerar chave" em 19/09/2026 (commit 1c1a94e). Nenhuma troca registrada depois disso.
- Pendente: data real da última geração no Vault. Exige confirmação do dono para o acesso ao Cofre/Supabase (só nome e data, nunca o valor).
- Nenhum valor foi lido, exibido ou gravado.
- Dono autorizou a checagem (só nome e data). Leitura no Supabase (projeto `ogxsdptftgxrujkfscvi`), sem o valor: segredo no Vault com o nome `integration:finmarket_hub_api`, criado em 19/09/2026 20:33 UTC (17:33 Brasília) e última gravação em 12/10/2026 12:01 UTC (09:01 Brasília). Status da conexão: `connected`.
- Leitura: a data de 12/10 é a última GRAVAÇÃO no Vault, não prova de troca da chave (uma regravação com o mesmo valor também atualiza a data). Confirmar com o dono se houve geração nova em 12/10.

## 2026-10-15 — Computador HOME — conferência da data no Vault (autorizada pelo dono)
- Projeto Supabase `Site-Alna` (`ogxsdptftgxrujkfscvi`), consulta só de metadados em `vault.secrets` (nome, criação, última gravação; a coluna do valor não foi lida).
- Nome real no Vault: `integration:finmarket_hub_api` (o registro anterior citava só `finmarket_hub_api`; corrigido aqui).
- Criada em 19/09/2026 17:33 (Brasília). Última gravação em 12/10/2026 09:01 (Brasília).
- Ressalva: a última gravação não prova troca da chave; regravar com o mesmo valor também atualiza a data.
- Nenhum valor foi lido, exibido ou gravado.
