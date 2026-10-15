# Diário do Detetive

Acrescenta sempre; nunca apaga. Cada entrada: data, computador, sintoma, hipóteses (com prova a favor e contra), causa identificada ou pendência, e o que o dono decidiu.

## 2026-10-14 — Computador HOME — implantação
- Skill `detetive` criada e aprovada pelo dono (Onda 2, primeiro funcionário).
- Ainda não foi acionado em nenhuma investigação real. Teste pendente: sessão nova dentro de `C:\Users\Pichau\dev\site-alna`, com uma pergunta de investigação já conhecida.

## 2026-10-14 — Computador HOME — pedido de teste 8433b1a9 pendente desde 15/09
- **Sintoma:** o pedido de teste 8433b1a9 continua "pending" desde 15/09 e o dono quer saber o que aconteceu.
- **Fatos vistos:**
  - Banco (leitura): pedido `pending`, Pix, `payment_status` PENDING, total R$ 59,40, criado em 15/09 14:26 UTC, última alteração em 09/10 16:52 UTC. Sem CPF gravado. Já tem cliente na Asaas (conta antiga). `pix_regenerated_count` = 0. É o único pedido pendente do banco.
  - Código `supabase/functions/regenerate-pix/index.ts`: sem CPF, responde 422 "Pedido sem CPF/CNPJ" e libera a tentativa (não gasta uma das 3). Idade máxima de 30 dias, então a partir de 15/10 14:26 UTC responde `too_old`.
  - `docs/PENDENCIAS.md` (linha 55) e `docs/DECISOES.md` (09/10): a decisão de cancelar o pedido está em aberto, aguardando o dono.
- **Hipóteses:**
  1. (mais provável) Pedido de teste nunca pago e nunca cancelado. A regeneração do Pix não consegue refazer a cobrança porque falta CPF. Prova a favor: status pending, sem CPF, decisão pendente desde 09/10. Prova contra: nenhuma. Falta: confirmar no painel Asaas (conta antiga) se a cobrança `pay_avh5ao0zktwck1bb` ainda está aberta ou vencida.
  2. Pagamento feito e webhook não atualizou o pedido. Prova contra: a conta antiga não foi consultada; o webhook só avança `pending→paid` (commit 533be84). Não verificado.
- **Causa:** a pendência foi causada pela falta de decisão do dono sobre cancelar, não por defeito de código.
- **Pendência:** o dono decide cancelar (ou não) antes de 15/10 14:26 UTC, quando o `regenerate-pix` deixa de atender este pedido.
- **Decisão do dono:** (em aberto)
