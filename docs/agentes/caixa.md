# Diário do Caixa

Acrescenta sempre; nunca apaga. Cada entrada: data, computador, período lido, contagens (só números), recomendação e o que o dono decidiu. Nunca registra dados de cliente.

## 2026-10-15 — Computador HOME — implantação
- Skill `caixa` criada e aprovada pelo dono (Onda 2, terceiro funcionário).
- Ainda não foi acionado. Primeira leitura prevista entre 16 e 19/10/2026, quando o dono decide se a caixa "Salve seu carrinho" fica, é ajustada ou sai.
- Teste pendente: sessão nova dentro de `C:\Users\Pichau\dev\site-alna`, com a pergunta: "caixa, a caixa Salve seu carrinho vale a pena?". Como os dados ainda são poucos, o esperado é ele dizer isso e recomendar esperar.

## 2026-10-15 — Computador HOME — primeira leitura (pergunta do dono)
- Período lido: do primeiro carrinho salvo (12/10/2026) até hoje (15/10/2026). Projeto Supabase Site-Alna, só leitura (SELECT agregado).
- Contagens: carrinhos salvos = 1; recuperados (viraram pedido) = 0; parados pelo cliente = 0; com lembrete 1 = 1; com lembrete 2 = 1; contatados por WhatsApp = 0.
- Limite: o banco não guarda de qual forma o carrinho foi salvo (pela caixa "Salve seu carrinho" ou sozinho, por quem já tinha e-mail). Sem esse dado não dá para comparar os dois grupos. Lacuna registrada para decisão do dono.
- Recomendação: **Esperar.** Amostra de 1 carrinho não decide nada. Reler entre 16 e 19/10/2026, depois de checar se o dono quer um marcador de origem no carrinho.
- Decisão do dono: pendente.

## 2026-10-16 — Computador HOME — decisão do dono sobre o carrinho de teste
- O carrinho salvo pelo e-mail do próprio dono (atualizado em 16/10 às 16:43 Brasília, origem `caixa`) conta como **cliente real** na análise. Não é para apagar.
- Contagem atual (banco, só leitura): 1 carrinho com origem `caixa` (e-mail do dono, criado em 12/10) e 3 sem origem (anteriores à publicação).
- Para a decisão sobre a caixa, o dono quer acompanhar o fluxo a cada teste: o Caixa consulta o banco quando o dono avisar.
