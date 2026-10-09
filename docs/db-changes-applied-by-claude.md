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

## order_status_emails_and_survey_text (aplicada em 07/10/2026)
- `orders.shipped_email_sent_at`: marca que o e-mail "Pedido enviado" já saiu (garante 1 só por pedido; pedidos que
  já tinham código de rastreio foram marcados na hora, para ninguém receber aviso retroativo).
- Novos modelos de e-mail: `order_shipped` (código de rastreio), `order_cancelled` (pagamento recusado/cancelado, "nada
  foi cobrado") e `order_refunded` (estorno registrado). Editáveis em Admin > Marketing > Fluxo de E-mail.
- `post_purchase_nps` reescrito: assunto "Como foi a sua compra na ALNA, {{nome}}?", sem promessa de desconto por
  participar; botão "Responder a pesquisa".
- Quando sai cada e-mail: "enviado" quando a etiqueta é gerada e o código existe (se o código só aparecer depois,
  o `sync-delivery-status` envia nessa hora); "cancelado" em recusa de cartão/reprovação de risco (e em
  PAYMENT_DELETED só se o pedido já estava pago); "estorno" em PAYMENT_REFUNDED/PARTIALLY_REFUNDED. Todos só
  disparam na mudança de situação, então reenvio do webhook pela Asaas não duplica.

## order_prepared_and_posted_emails (aplicada em 07/10/2026) — substitui o "Pedido enviado" acima
- O e-mail "Pedido enviado" dizia "a caminho" cedo demais (a etiqueta só significa que o pacote foi embalado). Foi
  trocado por dois: `order_prepared` ("preparado para envio, será deixado no ponto de coleta", sai ao gerar a etiqueta,
  sem precisar de código) e `order_posted` ("já foi deixado no ponto de coleta" + código de rastreio + link
  `https://www.melhorrastreio.com.br/app/jet/<código>`, sai quando o Melhor Envio informa `posted_at`, na conferência
  de até 30 min). O modelo `order_shipped` foi apagado.
- Novas colunas `orders.prepared_email_sent_at` e `orders.posted_email_sent_at` (uma só mensagem de cada por pedido).
  `orders.shipped_email_sent_at` ficou sem uso (pode ser apagada depois). Pedidos já concluídos foram marcados para não
  receber nada retroativo.
- `sync-delivery-status` também reenvia o "preparado" se o envio na geração da etiqueta falhou (rede de segurança).

## sync_order_step_texts_and_cron_10min (aplicada em 07/10/2026)
- Regra do dono: status e textos do pedido iguais em todos os lugares (Minha Conta, página do pedido, admin, e-mails, mapa).
  Etapas e nomes padrão: "Pagamento confirmado" → "Pedido preparado para envio" (etiqueta gerada, aparece na hora) →
  "Deixado no ponto de coleta" (Melhor Envio informa `posted_at`) → "Pedido entregue".
- `track_order_events()` e os eventos já gravados (`label_generated`, `posted`) usam o novo texto.
- `sync-delivery-status` (cron `sync-delivery-status`, job 2) passou de `*/30` para `*/10 * * * *`: Minha Conta e e-mails
  chegam no máximo 10 min depois do Melhor Envio.
- Página do pedido (`/pedido/<id>`): mostra a linha do tempo assim que existe etiqueta (não espera mais o código de
  rastreio), consulta o Melhor Envio ao vivo pelo id do envio e deixou de expor o link "Ver etiqueta de envio" ao cliente
  (`get-order-status` não devolve mais `label_url`); ganhou o link "Acompanhar a entrega" (melhorrastreio, J&T).

## selo "Preparado para envio" (07/10/2026, só front-end)
- O pedido vira `shipped` ao gerar a etiqueta. Enquanto o ponto de coleta não bipar, o selo mostra **"Preparado para envio"**
  em Minha Conta (usa o evento `posted` de `order_events`) e em Admin > Pedidos (usa o status ao vivo do Melhor Envio:
  pending/generated/released). Depois do bip vira "Enviado"; entregue continua "Concluído". Sem mudança no banco.

## marketing_campaign_every_20_days (aplicada em 07/10/2026)
- **E-mail "Obrigado! Indique e ganhe 5%" (`nps_thank_you`) descontinuado**: modelo apagado; `submit-nps-survey` e `record-nps` não o enviam
  mais (a própria página da pesquisa agradece e mostra o link de indicação para nota 5+).
- **Lista de marketing:** nota **0 a 3 fica de fora; 4 a 10 entra** (quem já cancelou o recebimento não volta).
- **Campanha única a cada 20 dias** para TODA a lista (antes era um ritmo por pessoa: 15/20/15 dias). `send-weekly-marketing`
  (cron diário 10:00 UTC) só dispara quando passaram 20 dias de `site_settings.marketing_last_campaign_at` (relógio iniciado em
  07/10/2026 → 1ª campanha em 27/10/2026). Mostra os produtos publicados desde a campanha anterior (mais novos primeiro, até 6);
  sem novidades usa os produtos escolhidos no modelo; sem nenhum, espera. Lista vazia também espera sem gastar o ciclo.
- **Cupom:** o modelo `weekly_marketing` usa `RECOMPRA5%OFF` (estava em 10% por engano, corrigido para 5%, limite de 10 usos
  que só avisa). Modelo reescrito ("Chegaram novidades na ALNA para você") com botão "Ver todas as novidades".
- **Rodapé de cancelamento** (marketing e lembretes de carrinho): "Esta mensagem foi enviada para o e-mail X. Se não quiser
  receber esses e-mails da ALNA, cancele o recebimento AQUI." O clique em AQUI põe o e-mail na lista de cancelados e o remove de
  `marketing_subscribers` (função `unsubscribe-email`).
- E-mail da pesquisa (`post_purchase_nps`): assunto "Como foi sua compra, {{nome}}?" e texto humilde; SEM promessa de desconto
  (ainda não existe cupom por responder; ver pendência com o dono).

## e-mail de marketing redesenhado + menu "E-mail marketing" (07/10/2026)
- Layout do e-mail (`supabase/functions/_shared/marketing-email.ts`): saudação, bloco do cupom (botão verde com o código,
  leva a `https://store.alna.sale/loja?cupom=CODIGO`) e uma linha por produto, imagem e texto alternando de lado (imagem e botão
  "Ver produto" abrem a página do produto; texto = título, 1ª frase da descrição, preço). Modelo `weekly_marketing` reescrito.
- Link `?cupom=`: o site guarda o código (`src/lib/marketing/pending-coupon.ts`) e o carrinho o mostra já digitado no campo de
  cupom (o cliente ainda clica em Aplicar; o cupom é validado normalmente).
- Nova tela Admin > Marketing > **E-mail marketing** (`/admin/marketing/email-marketing`): troca do cupom da campanha (grava
  `email_templates.coupon_id` do `weekly_marketing`), produtos de reserva (`featured_product_ids`, usados só sem novidades),
  lista de quem está na lista de marketing e de quem saiu (`email_suppressions`), e a data da próxima campanha.
- PENDENTE de decisão do dono: até 3 cupons por pedido (hoje o carrinho, `checkout-create`, `validate-coupon` e o gatilho de
  contagem aceitam 1 só).

## marketing_email_campaigns + preço "de/por" + título que nunca repete + menu em gavetas (07/10/2026)
- Tabela `marketing_email_campaigns` (id, sent_at, subject único, recipients, product_count; RLS só admin): histórico das
  campanhas de e-mail marketing. ATENÇÃO: `marketing_campaigns` já existe e é a lista de campanhas UTM — não confundir.
- `send-weekly-marketing` escolhe, a cada campanha, um título que nunca foi usado (12 ideias, algumas com o nome do 1º produto;
  esgotadas, acrescenta a data) e grava no histórico; o campo "assunto" do modelo `weekly_marketing` deixou de valer (fica só
  como reserva). Preço do produto no e-mail = variação mais barata, com o preço "de" (`compare_at_price_cents`) riscado ao lado
  quando maior, igual à loja.
- Admin: "Anúncio" e "Marketing" viraram gavetas que recolhem/expandem com animação (abrem sozinhas na página atual e lembram a
  última escolha neste navegador). Tela E-mail marketing ganhou o quadro "Campanhas enviadas".

## até 3 cupons por pedido, somando (aplicada em 07/10/2026)
- Decisão do dono: até **3 cupons por pedido, os percentuais se SOMAM, sem teto** (só nunca passa de 100% do pedido).
  Cada cupom segue as próprias regras (valor mínimo, validade, pessoal/uso único); o que não cumpre o mínimo não desconta.
- Carrinho (`cart-context.tsx`): lista `coupons` (migra o antigo `coupon` único do localStorage); `eligibleCoupons` e
  `discountPercent`. Carrinho/checkout mostram cada cupom com "Remover", o campo continua até o 3º e o resumo mostra
  "Desconto (A + B + C = -X%)".
- `checkout-create` recebe `couponCodes[]` (aceita ainda `couponCode`), valida cada um no servidor e grava em
  `orders.coupon_code` a lista separada por VÍRGULA ("A,B,C"; por isso o código de cupom não pode ter vírgula — o cadastro em
  Cupons agora recusa).
- Gatilho `count_coupon_use_on_paid` percorre a lista: cada cupom ganha 1 uso (e seus próprios avisos de 5/1/estourou) quando o
  pedido é pago. Relatórios (média de cupom, Precificação, sales-report) já leem `discount_cents`/`coupon_code`, sem mudança.

## product_slug_redirects + endereço toalha-sublimar + vídeo Shorts (07/10/2026)
- Tabela `product_slug_redirects` (old_slug → product_id; leitura pública, escrita só admin) e gatilho
  `products_remember_old_slug`: toda troca de `products.slug` guarda o endereço antigo sozinha. A página do produto
  (`src/routes/produto/$slug.tsx`) redireciona (301) o endereço antigo para o atual.
- Produto "Toalha para Sublimação 70x140cm Branca": `toalha-de-time` → **`toalha-sublimar`** (o antigo redireciona).
  `/atacado` atualizado. O mapa do site (sitemap) é regenerado a cada publicação. Não há campo de slug no admin (por ora a troca
  é feita no banco).
- Vídeo do produto: campo "Vídeo" em Admin > Catálogo > (produto); na loja aparece o link "▶ Assistir vídeo do produto" logo
  abaixo das miniaturas das fotos e abre numa janela. Passou a aceitar links do YouTube Shorts (`youtube.com/shorts/ID`), /live e
  /embed; Shorts abre em formato vertical (9:16).

## vídeo dentro da galeria do produto (07/10/2026, só front-end)
- O vídeo (campo "Vídeo" do produto) agora é uma miniatura com botão de play na **2ª posição** da fila de fotos (ou a última,
  se o produto tem 1 só foto). Ao clicar, toca **no lugar da foto grande** (Shorts em formato vertical com faixas pretas), com
  autoplay; o player só é carregado nesse clique (não pesa a página). O link "▶ Assistir vídeo" e a janela foram removidos.
  Miniatura = imagem do próprio YouTube (Vimeo mostra um quadro azul com o play). Vale para todo produto com vídeo cadastrado.

## vídeo enviado como arquivo MP4 + capa (08/10/2026)
- Coluna `products.video_poster_url` (capa do vídeo). `products.video_url` agora aponta para o MP4 guardado no bucket
  `product-media` (`<produto>/video-<uuid>.mp4`; capa `<produto>/video-capa-<uuid>.jpg`, redimensionada a 640 px).
- Admin > Catálogo > produto: o campo de link (YouTube/Vimeo) foi REMOVIDO e substituído por "Enviar vídeo (MP4, até 8 MB; ideal
  ~3 MB)" ao lado de "Capa do vídeo (imagem)". Trocar/remover apaga os arquivos antigos do armazenamento. Link antigo de YouTube
  já cadastrado continua tocando até o MP4 ser enviado (o formulário mostra "link externo antigo").
- Loja: arquivo toca num `<video>` simples dentro da galeria (2ª miniatura = a capa), só baixado após o clique.

## /loja: ajustes de carregamento do LCP (08/10/2026, só front-end; nenhum espaço no back end)
- PageSpeed celular de 08/10/2026 (antes): Loja 70–81 (oscila), LCP 9,6 s, FCP 2,1 s, ~4 MB de peso; Home 99, Atacado 97, Checkout 96,
  Produto 94, Carrinho 91.
- Foto da modelo (continua o PNG de 590 KB — o dono decidiu NÃO converter para WebP): `fetchPriority="high"`, largura/altura
  declaradas (1344×752) e sem o fade de entrada (era a causa de 0,14 s de espera + 0,6 s de fade).
- Cartões de produto: só os 2 primeiros carregam logo (eram 6); os demais ficam em lazy.
- `<main>` envolvendo o conteúdo da página (acessibilidade). O cabeçalho e o rodapé ficam fora.
- PENDENTE de decisão do dono: contraste. O verde da marca #16a34a dá 3,3:1 (mínimo 4,5:1 para texto pequeno) no texto branco
  sobre verde (barra do topo, selos "OFF", "Loja ALNA") e no texto verde sobre branco (cupom, links). Opção: #15803d (≈5:1) só nos
  textos pequenos. Fotos dos cartões têm 1200 px mostradas a ~208 px (cópias menores usariam mais armazenamento; fica para depois).

## contraste: verde da loja mais escuro (08/10/2026, só front-end; nenhum espaço no back end)
- O verde da marca `#16a34a` dava 3,3:1 (mínimo 4,5:1 para texto pequeno). Em TODA a loja pública (fora do admin) passou para `#15803d`
  (≈5:1), o mesmo tom em textos, selos e botões, para não ficar dois verdes na mesma tela. Atacado: degradê do botão grande
  `#15803d → #166534`. A Home (alna.sale, pasta home-cloudflare) e os e-mails NÃO foram alterados (continuam `#16a34a`).
- Conferido por varredura de contraste em /loja, /produto, /atacado e /carrinho: 0 textos abaixo do mínimo.

## análise do JavaScript (08/10/2026)
- Base do cliente (gzip): `index` 98 kB (React + TanStack Router/Start/Query), `client` 56 kB (supabase-js), `awaited` 14 kB,
  `site-footer` 13 kB, `link` 13 kB… ≈ 240 kB em ~24 arquivos por página. Telas do admin (fluxo-email 66 kB, product-form 35 kB) são
  carregadas só no admin. Não vale trocar o supabase-js por `fetch` agora (refator grande, risco no checkout, ganho pequeno).

## Confiança da empresa para o Google Ads + verificação da página de atacado (08/10/2026)
- Contexto: conta Google Ads suspensa em 08/10/2026 por "phishing" (problema listado: página de destino não funciona); contestação nº
  6452280642 enviada em 08/10/2026 (ver memória project-google-ads-suspensao).
- **Home (alna.sale, `home-cloudflare/index.html`):** rodapé agora mostra "ALNA COMMERCE · CNPJ 57.135.009/0001-27 · Brusque, SC" e o
  link "Sobre"; o JSON-LD da organização ganhou `legalName` e `taxID`. Peso do HTML: 23.354 → 23.501 bytes (+147 B, +0,6%); 0 requisições
  novas, 0 JavaScript novo. Atualiza pelo Cloudflare Pages (git) — conferir o deploy.
- **/sobre (loja):** nova seção "Quem somos" (razão social, CNPJ, cidade, o que vende, atendimento, links para atacado e contato).
- **Verificação a cada 5 minutos:** cron `keep-warm-atacado` (`*/5 * * * *`, job 7) faz um GET em https://store.alna.sale/atacado
  (User-Agent "ALNA-keep-warm") para o servidor não ficar frio. Sem armazenamento (as respostas do pg_net são apagadas sozinhas).
  Para desligar: `select cron.unschedule('keep-warm-atacado');`. Não garante 100% (só aquece o ponto de atendimento mais próximo).
- Depois que a conta voltar: desligar a "expansão do URL final" da campanha para o Google usar só /atacado.

## identificação completa da empresa no site (08/10/2026, conforme o Cartão CNPJ)
- Cartão CNPJ (emitido 10/03/2026): nome empresarial **ALNA COMMERCE LTDA**, CNPJ 57.135.009/0001-27, ME, aberta em 03/09/2024, sócio-
  administrador Alexander dos Santos Machado, sede R. Luiz Rafael Flor, 450 (apto no complemento, NÃO publicado), Nova Brasília,
  Brusque/SC, CEP 88.352-553. Decisão do dono (opção A): mostrar o endereço SEM o apartamento.
- Novo `src/lib/company.ts` (constantes); rodapé da loja, /contato e /sobre mostram "ALNA COMMERCE LTDA · CNPJ · endereço" já no HTML
  do servidor (antes a razão social "ALNA COMMERCE" aparecia sem LTDA até o banco carregar). Home (alna.sale): rodapé e dados
  estruturados (JSON-LD com endereço e CEP) atualizados. Home: 23.354 → 23.636 bytes (+282 B, +1,2%), 0 requisições novas.
- Google Ads: a conta é paga por pessoa física (ALEXANDER DOS SANTOS MACHADO), o site é da LTDA; mudar o tipo do perfil de pagamentos
  exige falar com o suporte do Google Ads. Cloudflare: "Always Use HTTPS" ligado em alnacommerce.com (http agora 301 em 0,2 s).

## 08/10/2026 — Checkout: frete calculado ao digitar o CEP

- `src/routes/checkout.tsx`: o frete passa a ser calculado assim que o CEP tem 8 números (com ou sem hífen), sem precisar sair do campo;
  busca do endereço (ViaCEP) e cálculo do frete rodam ao mesmo tempo; respostas antigas são descartadas se o cliente continua digitando;
  CEP incompleto zera o frete (botão "Finalizar pedido" fica desabilitado até calcular); erro mostra "Tentar de novo".
  Nenhuma mudança de banco, nenhum arquivo/imagem novo; peso da página praticamente igual.
- Teste de pagamento com a conta Asaas nova (ALNA COMMERCE LTDA): pedido 79a722c7 (Pix R$ 20,26) criado 18:25 UTC e marcado Pago em ~1 min pelo webhook.

## 09/10/2026 — Horário de postagem em horário de Brasília

- Melhor Envio devolve `posted_at` sem fuso e em horário de Brasília (as datas da etiqueta vêm em UTC). Novo `_shared/melhor-envio-time.ts`
  (`postedAtToIso`, acrescenta -03:00); usado em `sync-delivery-status` (evento "posted" do histórico) e `get-order-status` (/pedido).
  Horário de entrega NÃO alterado (formato ainda não verificado).
- Banco (via execute_sql): evento `posted` do pedido b75dbe6a corrigido de 11:14 para 14:14 (Brasília), +3 h numa linha.
- Publicar no Lovable para valer; conferir com o pedido 79a722c7 quando for postado.

## 09/10/2026 — Carrinho abandonado (carrinho salvo + lembretes 1 h e 24 h + WhatsApp no admin)

- **Migração `abandoned_carts`** (apply_migration): tabela `abandoned_carts` (1 linha por e-mail em minúsculas; token do link; itens
  [{variantId, quantity}]; resumo/valor calculados no servidor; datas dos lembretes, `stopped_at`, `recovered_at`, `recovered_order_id`),
  RLS ligada, só o admin lê/atualiza/apaga (o público grava pela função com service role). Novos modelos de e-mail `abandoned_cart_1h`
  (sem cupom) e `abandoned_cart_24h` (cupom: copiado do modelo ligado a `cart_reminder_24h`; cada cliente recebe código pessoal VOLTA-xxxx).
- **Funções novas** (publicar no Lovable): `save-cart` (grava/atualiza/para; e-mail ou token), `get-saved-cart` (reabre o carrinho
  pelo link `/carrinho?c=<token>` com preço e estoque de agora), `process-abandoned-carts` (cron a cada 5 min — **agendar só depois de publicar**;
  1 h sem movimento → e-mail 1; 24 h → e-mail 2 com cupom; nada entre 22h e 8h de Brasília; apaga carrinhos com 90 dias sem movimento).
  `_shared/cart-items.ts` (dados ao vivo dos itens). `checkout-create` marca o carrinho salvo como `recovered_at` quando o pedido é criado.
- **Regras**: máx. 2 lembretes por ciclo; novo ciclo do mesmo e-mail só depois de 7 dias; quem comprou/criou pedido/pediu para sair não recebe;
  descadastro usa `unsubscribe-email?email=` (existente) e a lista `email_suppressions`; cupom segue a regra de até 3 cupons que somam.
- **Front**: `SaveCartBox` no carrinho (e-mail obrigatório, WhatsApp opcional, consentimento), captura no checkout ao confirmar o e-mail
  (com aviso), sincronização do carrinho a cada mudança (3 s de espera, só para quem salvou), restauração por `?c=`.
  Admin: nova tela Marketing > Carrinhos abandonados (carrinhos salvos + pedidos pendentes, botão WhatsApp com mensagem editável via wa.me,
  copiar link, números de recuperação); mapa de fluxos ganhou o Fluxo 9; política de privacidade atualizada.
