# Mudanças de banco aplicadas direto no Supabase (fora de `supabase/migrations/`)

Estas mudanças foram aplicadas pelo Claude via ferramenta de migração do Supabase em 01–07/10/2026. **Não estão em
`supabase/migrations/` de propósito**: se o Lovable tentasse reaplicar arquivos de migração que já existem no banco, a
publicação poderia falhar. Este documento é o registro do que existe no banco, para reconstruir se for preciso.
A versão aplicada de cada uma aparece na tabela de migrações do Supabase (nome entre parênteses).

## marketing_campaigns_and_order_utm (20261001120941)
Tabela `marketing_campaigns` (nome + `utm_campaign` único; só admin lê/escreve) e `orders.utm_campaign`.

## nps_feedback_text (20261007122331)
`orders.nps_feedback text` — texto que o cliente escreve na pesquisa quando dá nota de 0 a 5.

## google_review_stats (20261007124249)
Tabela `google_review_stats` (linha `id='default'`, `star_1..star_5`); só admin. Alimenta o quadro "Notas do Google"
em Admin > Marketing > NPS. Começou com `star_5 = 8`.

## coupon_min_order_and_alna5off (20261007134620)
`coupons.min_order_cents integer not null default 0`. O cupom `ALNA5%OFF` (5%) já existia desde 16/09/2026; a migração
só definiu o mínimo de R$ 250 (25000).

## coupon_usage_limits_and_alerts (20261007141752)
- `coupons`: `max_uses` (nulo = sem limite), `uses_count`, `show_on_site`, `alerted_5_at`, `alerted_1_at`.
- `orders.coupon_counted_at` + gatilho `orders_count_coupon_use` (função `count_coupon_use_on_paid`): conta **um uso
  quando o pedido é pago pela primeira vez** (paid/shipped/completed). O saldo `max_uses - uses_count` pode ficar
  **negativo** — a compra do cliente nunca é barrada. Avisa o admin por e-mail (função `coupon-alert-hooks`, via
  `pg_net`) quando restam 5, quando resta 1 e a cada uso além do limite.
- Gatilho `coupons_reset_alerts`: ao aumentar `max_uses`, os avisos de 5 e de 1 voltam a valer.
- Modelo de e-mail `coupon_alert`.
- Valores iniciais: `max_uses = 10` em `ALNA5%OFF`, `INDICA5%OFF` e `NOVIDADE5%OFF`; `show_on_site = true` em
  `ALNA5%OFF`; modelo `weekly_marketing` ligado a `NOVIDADE5%OFF` e `referral_reward` ligado a `INDICA5%OFF`.
  `ALNA10%OFF` (e-mail de carrinho abandonado) continua sem limite.

Cupons em uso: `ALNA5%OFF` (atacado, acima de R$ 250, divulgado no site com termômetro), `INDICA5%OFF` (indicação),
`NOVIDADE5%OFF` (e-mail semanal) e `ALNA10%OFF` (carrinho abandonado 24h).

## personal_cart_coupons (aplicada em 07/10/2026)
- `coupons.personal_for_email` e `coupons.auto_generated`: cupom pessoal do e-mail de carrinho abandonado de 24h.
- Regras (função `supabase/functions/_shared/personal-coupon.ts`): o cupom ligado ao modelo `cart_reminder_24h`
  (`ALNA10%OFF`, que segue ativo por causa dos panfletos) serve só de **molde** (percentual e mínimo). Cada e-mail
  recebe um código `VOLTA-XXXXXX` de **uso único**, amarrado ao e-mail do cliente, válido por **7 dias**.
  Se o cliente abandonar de novo com o código ainda válido e não usado, recebe **o mesmo código**; se o último foi
  emitido há menos de **30 dias** (venceu ou foi usado), o e-mail sai **sem cupom**; depois de 30 dias, código novo.
- O uso conta quando o pagamento é confirmado (mesmo gatilho dos outros cupons). Cupons automáticos não disparam os
  avisos de 5/1 uso ao admin. No `checkout-create`, cupom pessoal é estrito: outro e-mail, já usado ou vencido
  devolve erro explicado em vez de ser ignorado.
- `ALNA10%OFF` ganhou `max_uses = 10` (aviso e termômetro, nunca bloqueia), editável em Admin > Marketing > Cupons.
- O modelo de e-mail `cart_reminder_24h` agora usa os campos `{{chamada}}` (assunto) e `{{cupom_bloco_html}}` (some
  quando o cliente não tem direito a cupom novo).
- Admin > Cupons esconde os cupons automáticos e mostra o contador "X cupons pessoais gerados, Y já usados".

## pricing_coupon_and_shipping_pct (aplicada em 07/10/2026)
- `product_variants.coupon_avg_pct` e `product_variants.shipping_cost_pct` (padrão 0, por variação): entram no
  divisor da fórmula de preço em Admin > Marketing > Precificação, junto com imposto, cartão e margem:
  `preço = custo ÷ [1 − (imposto + cartão + margem + cupom + frete)%]`.
- ATENÇÃO: a Precificação **aplica o preço sozinha, na hora**, sempre que qualquer % muda (comportamento antigo da
  tela). Por isso "Aplicar a todos" e "Usar média real" nas colunas de cupom e de frete pedem uma confirmação que
  mostra o antes/depois da soma dos preços; os campos por linha são editáveis a qualquer momento.
- "Usar média real" nunca preenche sozinho. Média de cupom = descontos ÷ valor vendido (antes do cupom); média de
  frete = etiquetas pagas pela loja ÷ valor vendido em produtos (sem o frete que o cliente pagou, que financia
  a etiqueta, e já sem o cupom); ambas sobre pedidos pagos/enviados/concluídos nos últimos 90 dias
  (`src/lib/admin/sales-averages.ts`). A coluna "Frete até a capital" foi removida da tela.
- Telas novas/alteradas: Cupons (quadro "Média de uso do cupom" com 30/60/90 dias) e "Gasto com frete"
  (`/admin/marketing/gasto-frete`, 7 e 30 dias, etiqueta zerada quando o cliente pagou o frete).
