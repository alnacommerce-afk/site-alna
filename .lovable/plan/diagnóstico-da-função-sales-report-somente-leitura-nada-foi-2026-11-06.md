# Diagnóstico da função sales-report (somente leitura — nada foi alterado)

## Resumo
Causa provável: **não encontrei falha do lado do site**. A função está no ar, o código e as colunas que ela lê não mudaram desde 12/10, e nenhuma mudança desde 30/10 tocou as tabelas que ela usa. Não consegui provar 100% porque os registros de chamadas antigas não estão mais disponíveis e o meu acesso ao cofre de chaves é bloqueado pela plataforma.

## Respostas, item por item
1. **Registros de 01/11 até agora:** não dá para responder. Os registros de chamadas guardam só os últimos minutos (o mais antigo de qualquer função é de 06/11 às 18:30 de Brasília). Nesse período não houve nenhuma chamada à sales-report. Ou seja, não há prova de quantas chamadas chegaram desde 01/11, nem com qual resultado.
2. **Teste interno com a chave:** não foi feito. A plataforma bloqueia a minha leitura do cofre (erro exato: "Agent access to secrets is not allowed"). O teste sem chave respondeu **401 em 1,7 s**, o esperado: a função está publicada e recusa quem não tem a chave.
3. **Chave finmarket_hub_api:** status "conectada", com a chave guardada. A última geração ou troca registrada foi em **12/10/2026, 09:01 (Brasília)**, então ela não mudou desde então. Não pude confirmar direto no cofre se ela devolve o valor (mesmo bloqueio do item 2).
4. **Mudanças desde 30/10:** só uma, a de 05/11 (formulário LGPD). Ela cria uma tabela nova de pedidos de titulares e uma função para registrá-los. Não toca pedidos, itens, variações, cupons, as fotos de preço/pagamento nem a função que lê a chave. O código da sales-report não muda desde 12/10. As colunas que ela busca continuam existindo com o mesmo nome. **Nada disso poderia quebrar a leitura.** E a falha começou em 01/11, antes da mudança de 05/11.
5. **Tempo, processamento e memória:** sem registros de 01/11 a 05/11, não dá para afirmar. Pelo código, a consulta à Asaas por pedido só roda quando o FinMarket pede `include_gateway=1`, e a URL que você passou não pede. Então a Asaas não deveria deixar a função lenta nessas chamadas.

## Observação
O FinMarket manda `since`, `updated_since`, `page` e `per_page`, mas a função ignora esses quatro e usa só `from`, `to`, `status`, `offset` e `limit`. Isso não gera erro, só pode trazer mais pedidos que o esperado. Já `status=cancelled,refunded` é aceito.

## Próximos passos sugeridos (preciso do seu ok)
- **A (recomendado, sem mexer no site):** pedir ao FinMarket o código de erro exato (401, 500, tempo esgotado) e o horário de uma chamada que falhou. Também conferir se a URL deles aponta para este projeto (ogxsdptftgxrujkfscvi) e se a chave salva lá é a de 12/10. Na próxima rodada de 3 em 3 horas, eu leio o registro na hora em que a chamada acontecer.
- **B (opcional, com seu ok):** você mesmo faz o teste do item 2, pelo painel em Admin > Conexões ou com uma chamada que eu preparo para você colar a chave. Eu não vejo a chave em momento nenhum.
- Nenhuma correção no site é necessária por enquanto.
