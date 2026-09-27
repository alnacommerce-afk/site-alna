-- Valor pago pela etiqueta na Melhor Envio, capturado no momento da compra (generate-shipping-label
-- já busca esse dado do carrinho da ME pra pegar o código de rastreio — só precisava guardá-lo).
-- Nulo para pedidos sem etiqueta gerada ainda, ou gerados antes desta coluna existir (o admin
-- Pedidos faz um backfill sob demanda pra esses, consultando a Melhor Envio).
alter table public.orders
  add column if not exists label_price_cents integer;
