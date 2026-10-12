# Relatório de vendas para o FinMarket HUB (`sales-report`)

Função de leitura (somente consulta), protegida por chave de API. Chamada só pelo FinMarket HUB, nunca pelo site.
Código: `supabase/functions/sales-report/index.ts`. Combinado com o dono em 12/10/2026 ("eu concordo com o fin market / ok aplique").

**Chave:** guardada no Cofre (Vault) como `finmarket_hub_api` (Admin > Conexões de API) e enviada no cabeçalho `x-api-key`. Nunca colar a chave em conversa.
**Dados pessoais:** nenhum (sem nome, e-mail, CPF, endereço; cupom pessoal sai só com o nome do modelo).

## Parâmetros (todos opcionais)

| Parâmetro | Valor |
|---|---|
| `from` / `to` | datas ISO (`created_at >= from` e `< to`); data inválida → 400 |
| `status` | lista separada por vírgula de `paid,shipped,completed,cancelled,refunded,pending`, ou `all` (tudo **menos** `pending`). Padrão: `paid,shipped,completed`. Valor inválido → 400 |
| `offset` / `limit` | paginação; `limit` máximo 100 |
| `include_gateway=1` | também consulta a Asaas ao vivo para pedidos que ainda não têm taxa/líquido guardados (mais lento) |

## Campos por pedido

`order_id, created_at, status` (status real do pedido), `payment_method` (`pix` | `credit_card`), `installment_count`,
`items_subtotal_cents` (produtos antes de qualquer desconto), `coupon_code` (código do cupom normal, ou o **nome do modelo** — BOAS_VINDAS, CARRINHO_ABANDONADO… — quando o cupom é pessoal; "PESSOAL" se o modelo não for conhecido; vários separados por vírgula),
`coupon_discount_cents`, `shipping_charged_cents` (frete cobrado do cliente; 0 se grátis), `label_price_cents` (o que a Melhor Envio cobrou pela etiqueta; `null` até gerar a etiqueta),
`pix_discount_cents`, `card_surcharge_cents`, `pix_discount_pct`, `card_fee_pct`, `card_fee_fixed_cents` (a regra usada no checkout; `null` quando não se aplica),
`gross_total_cents` (total pago pelo cliente),
`gateway_fee_cents`, `net_received_cents`, `gateway_data_available` (**sempre presentes**; `null`/`false` quando não há dado guardado e `include_gateway` não foi pedido),
`items[]`.

## Campos por item

`sku, title, variant, quantity, unit_price_cents` (preço do anúncio, já com o desconto do anúncio, antes de cupom/Pix/cartão/frete) e os números de precificação:
`cost_total_cents` (custo + custo extra + frete de compra), `tax_rate_pct, card_fee_pct, margin_pct, coupon_avg_pct, shipping_cost_pct, discount_pct` (em porcentagem: 5 = 5%),
`compare_at_price_cents` (preço "de"), `pricing_estimated`.

- `pricing_estimated = false`: números **copiados no momento da compra** (tabela `order_item_pricing`).
- `pricing_estimated = true`: sem foto do momento da compra (pedidos feitos antes de 12/10/2026, preenchidos com os valores de hoje da variação) — pode diferir do que valia na data da venda.

## Onde os dados ficam (só o administrador enxerga)

- `order_item_pricing` e `order_payment_snapshot`: RLS ligada, **sem políticas e sem permissão para anon/authenticated** (só a chave de serviço das funções lê). Custo e margem **não** ficam em `order_items`/`orders`, porque o cliente consegue ler os próprios pedidos.
- Gravados pelo `checkout-create` em segundo plano: qualquer erro ao salvar é só registrado no log e **nunca** atrasa nem impede o pedido ou a cobrança.
- Taxa real da Asaas e líquido: gravados pelo `asaas-webhook` na confirmação do pagamento quando é cobrança única (Pix e cartão 1x). Parcelado de 2x a 12x precisa somar as parcelas → continua via `include_gateway=1`.
- Pedidos da conta Asaas antiga (MEI) devolvem 404 na chave nova: taxa/líquido ficam `null`.

## Trava do webhook (corrige um risco)

`PAYMENT_CONFIRMED` e depois `PAYMENT_RECEIVED` (e reenvios) só podem mudar o pedido de `pending` → `paid`. Um pedido já `shipped`, `completed`, `refunded` ou `cancelled` **não volta** para `paid`
(antes, um evento atrasado do cartão podia desfazer o envio e reenviar e-mail/recompensa). Estorno, cancelamento e as demais transições seguem como antes.

## Como testar (depois de publicar no Lovable)

1. Fazer um pedido pequeno no Pix em store.alna.sale e pagar. Conferir que o pedido vai para "Pago".
2. Consultar `?status=all` (sem `include_gateway`): o pedido novo deve vir com `pricing_estimated = false` em todos os itens, `pix_discount_pct = 4`, e `gateway_fee_cents`/`net_received_cents` preenchidos se a Asaas mandou `netValue` no aviso (senão `null` — e então `?include_gateway=1`).
3. Conferir `label_price_cents` depois de gerar a etiqueta e os nomes de cupom (sem códigos pessoais).
