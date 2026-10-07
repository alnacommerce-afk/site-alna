# Integrações de marketing/SEO (Google + Meta)

Registro do que já está configurado e de como o site alimenta cada ferramenta — feito em 29–30/09/2026
depois de auditar o estado real (várias coisas já existiam e não estavam documentadas em lugar nenhum).

## Contas já existentes

Não presuma que nenhuma dessas precisa ser criada — todas já existem e estão em uso:

- **Google Search Console** — duas propriedades, ambas "Propriedade de domínio" (verificação por DNS,
  mais forte que tag HTML): `alna.sale` e `store.alna.sale`. Sitemaps das duas já cadastrados.
- **Google Analytics 4** — Measurement ID `G-DP9VE6XSRF`, Property ID `554769095`
  (`site_settings.ga4_measurement_id` / `ga4_property_id`). Linker configurado entre `alna.sale` e
  `store.alna.sale` (evita contar uma visita que passa de um domínio pro outro como duas sessões).
  Falta a chave de conta de serviço (`google_analytics` no Vault) pro card "visitantes agora" do
  `/admin` funcionar — sem ela ele mostra "não configurado" (não afeta a coleta de dados em si).
- **Google Merchant Center** — conta "Alna", ID `5856969666`. Fonte de dados única ("PRODUCTS
  SOURCE 1"), tipo "Arquivo (URL)", busca automática diária às 00:00, listagens gratuitas ativas.

## O feed de produtos (Meta + Google, uma função só)

`supabase/functions/meta-catalog-feed/index.ts` (público, sem auth) serve os dois catálogos a partir
dos mesmos dados, via query param — a lógica de montagem das linhas fica em
`supabase/functions/_shared/meta-feed.ts` (`buildFeedCsv`, sem import de Deno/Supabase, testável com
Node puro):

- Meta / Instagram Commerce Manager: `.../functions/v1/meta-catalog-feed`
- Google Merchant Center (fonte de dados "PRODUCTS SOURCE 1"): `.../functions/v1/meta-catalog-feed?for=google`

Os dois formatos **não são iguais**, e por isso o código escolhe pelo parâmetro `target`:

| | Meta | Google |
|---|---|---|
| Delimitador | vírgula (CSV) | tabulação (TSV) — confirmado em support.google.com/merchants/answer/12631822 |
| `availability` | `in stock` / `out of stock` (com espaço) | `in_stock` / `out_of_stock` (com underline) — confirmado em .../answer/6324448 |
| Content-Type da resposta | `text/csv` | `text/tab-separated-values` |

Uma linha por **variação** (SKU), não por produto — por isso o Merchant Center mostra mais "produtos"
(30, em 30/09/2026) do que o catálogo tem de fato (18 produtos publicados).

## Formato das fotos e os avisos do Merchant Center

`src/lib/admin/optimize-image.ts` converte toda foto enviada pelo admin para **JPEG** antes de subir
pro Storage (de propósito — WebP não é universalmente aceito por Meta/WhatsApp/e-mail). Isso já
evita o problema mais comum de "tipo de imagem não aceito" no Google Shopping.

`prepareProductImage` só devolve o **arquivo original sem conversão** em três casos: é GIF animado
ou SVG (perderiam a natureza ao passar pelo canvas), o canvas falha de verdade, ou — só quando o
original já era JPEG/PNG — o JPEG recodificado não ficaria menor. Corrigido em 30/09/2026: antes
desse último caso valia pra QUALQUER formato original, então uma foto que já veio em WebP do
celular/print de tela (formato pequeno o bastante pra "vencer" o JPEG recodificado) subia como WebP
mesmo — causa real por trás de um aviso "Tipo de imagem não aceito em [additional_image_link]" no
Merchant Center (visto pela primeira vez em 30/09/2026, no produto `TOA_FOLHA_1`). Agora qualquer
formato que não seja JPEG/PNG (WebP, AVIF, HEIC, BMP, TIFF...) sempre vira JPEG, mesmo perdendo em
tamanho — evitar um formato rejeitado importa mais que economizar alguns KB.

**Dois avisos do Merchant Center que parecem parecidos mas são bem diferentes:**

- **"Imagem não processada" / "Impede a exibição no Brasil"** — normal, sem ação necessária. O
  Google ainda não rastreou a imagem; pode levar até 3 dias (raramente até 30). Resolve sozinho.
- **"Tipo de imagem não aceito em [additional_image_link]"** — esse sim é um problema de verdade
  (formato de arquivo que o Google não aceita). Ver o parágrafo acima sobre o fallback do WebP.

**Como forçar o Google a rastrear uma imagem de novo mais rápido** (se o processamento passar de
uma semana): trocar o nome do arquivo/URL da imagem no cadastro do produto — manter a mesma URL pode
levar até 3 semanas pro Google notar a mudança; um nome novo aciona um rastreamento em até 3 dias.
Como cada upload nosso já gera um nome de arquivo novo (UUID), isso já acontece automaticamente
sempre que uma foto é trocada.

## Sitemap

`scripts/generate-sitemap.mjs` regera `public/sitemap.xml` com todos os produtos publicados +
páginas estáticas da loja; roda automaticamente como `prebuild` (ver `package.json`). Antes de
30/09/2026 o sitemap só tinha as páginas institucionais — nenhum produto aparecia pro Google.

## Perfil da Empresa no Google (avaliações)

- **Link para pedir avaliação (usar em campanhas, e-mails, QR Code, redes sociais, WhatsApp):**
  `https://g.page/r/CaVwVCwnaWATECA/review`
- **Place ID** do perfil (descoberto seguindo o link de avaliação; serve para a API de Locais do Google):
  `ChIJ34ZjdmmrzgwRpXBULCdpYBM`. Página pública: `https://www.google.com/maps/place/?q=place_id:ChIJ34ZjdmmrzgwRpXBULCdpYBM`
  (sem login mostra só a nota média; total e distribuição por estrela não aparecem na visualização limitada).
- O Google informa que perfis com **5 ou mais avaliações** tendem a atrair mais clientes; em 07/10/2026 o perfil
  ainda estava com **0 avaliações** (aviso "Vá de 0 para mais de 5 avaliações" recebido do Google).

**Regras do Google (confirmadas na política oficial de conteúdo do Google Maps, em
support.google.com/contributionpolicy/answer/7400114) — valem para qualquer campanha nossa:**

- **Proibido dar qualquer vantagem em troca da avaliação:** desconto, cupom, brinde, pontos, sorteio. Mesmo
  "avalie e ganhe 5%" é violação e pode levar à remoção das avaliações ou suspensão do perfil.
- **Proibido pedir avaliação só de quem está satisfeito** (ex.: mandar o link só para quem deu nota alta no NPS
  e desviar os insatisfeitos para um formulário privado). Se o link for enviado, vai para **todos** os clientes
  do grupo escolhido, sem filtrar por nota ou humor.
- Permitido: pedir de forma simples e honesta ("sua opinião ajuda outros clientes"), sem prometer nada.

**Decisão do dono (07/10/2026) — como o link é usado hoje:** na página da pesquisa de satisfação
(`/pesquisa/<pedido>`, link do e-mail enviado 1 dia após a entrega confirmada), quem dá **nota 0–5** vê a caixa "Nos diga o
que aconteceu" (texto salvo em `orders.nps_feedback`, visível em Admin > Marketing > NPS pelo ícone ao lado da
nota) e quem dá **nota 6–10** vê, no pop-up de agradecimento, a mensagem pedindo e o botão "Nos avalie no Google"
(`GOOGLE_REVIEW_URL` em `src/lib/site-urls.ts`). O dono quis que só clientes satisfeitos fossem convidados a
avaliar no Google. **Risco assumido conscientemente:** a política do Google trata isso como "selecionar quem é
convidado a avaliar" (review gating), o que pode levar à remoção de avaliações ou suspensão do perfil. Não
adicionar o link do Google a outros e-mails/canais filtrando por nota, e nunca oferecer vantagem em troca.

**Outras ideias (não aplicadas — cada uma precisa de avaliação de impacto e aprovação do dono):**

1. Link de texto no rodapé da loja e na Home (Home: respeitar a meta de 0,5 s, ver `home-cloudflare/README.md`).
2. Responder a toda avaliação recebida (positiva ou negativa).
3. **Não** colocar panfleto/QR de avaliação dentro da caixa do pedido: atingiria também clientes com problema de
   entrega ou produto (decisão do dono).

## Google Ads — campanha "Cozinha" (criada em 07/10/2026)

Conta do Google Ads `635-244-4697` (login informacoes.asm@gmail.com). Site do anúncio: `alna.sale`.

**Títulos** (máx. 30 caracteres; essa tela aceita só 5):
Alna | Utilidades Domésticas · Utensílios de Madeira · Tábua de Corte de Madeira · 4% de Desconto no Pix ·
Frete Grátis Acima de R$ 150

**Descrições** (a 1ª tem máx. 60; as demais, 90):
1. Utensílios de madeira para a sua cozinha. Compre online.
2. Madeira p/ cozinha e mesa. Frete grátis acima de R$ 150 e 4% de desconto no Pix.
3. Monte uma cozinha mais prática com a Alna. Pague no Pix ou cartão e receba em casa.
4. Tábuas, colheres, pilão e bandejas. Entregamos no Brasil.

Botão de chamada: desligado.

**Política editorial do Google Ads (confirmada em 07/10/2026):** nada de palavra inteira em MAIÚSCULAS nos
textos — a versão inicial com "ALNA" e "OFF" foi reprovada ("Maiúsculas e minúsculas"). Escrever "Alna" e "de
desconto". Marcas e siglas só passam com pedido de revisão (support.google.com/adspolicy/answer/14848295).

**O anúncio promete — manter verdadeiro:** frete grátis acima de R$ 150 (`site_settings.free_shipping_threshold_cents`)
e 4% de desconto no Pix (`PIX_DISCOUNT` em `supabase/functions/checkout-create`). Se um deles mudar, atualizar o anúncio.
Evitar "sem juros" (o total do cartão muda com as parcelas) e "visite nossa loja" (a loja é só online).

**Pendências e próximos passos:**
- Palavras negativas: `fitness`, `academia`, `moda fitness`, `roupa`, `legging`, `treino` (a homônima Alna Fitness,
  `alnabrasil.com.br`, aparece junto nos resultados do Google).
- Endereço final: o link da campanha "Google Ads - Cozinha" gerado em Admin > Marketing > Campanhas, para as vendas
  aparecerem lá.
- Orçamento inicial sugerido: R$ 15–20/dia por 1–2 semanas; depois revisar termos de pesquisa, cliques e vendas e
  ajustar títulos, palavras-chave e orçamento.

**Estratégia do anúncio (definida pelo dono em 07/10/2026):** a loja tem itens de R$ 2 a R$ 17 e frete grátis só a
partir de R$ 150; o cliente é incentivado a encher o carrinho. Os anúncios miram compra em quantidade/atacado.
Por isso o endereço final deve ser a Loja (não um produto isolado) e a loja ganhou o aviso de progresso do frete
grátis (loja e página do produto) e a seção "Complete seu pedido" no carrinho.
Regiões para começar: SC, PR, RS, SP, RJ, MG. Frete medido com 1 tábua (R$ 6,30): Curitiba R$ 15,30 (3 dias), São Paulo
R$ 15,02 (4), Rio/BH R$ 15,28 (4), Florianópolis R$ 16,68 (3), Porto Alegre R$ 19,21 (3), Brasília R$ 22,33 (6), Recife
R$ 24,09 (8), Manaus R$ 33,76 (13).
Lacunas para atacado (não tratadas): preço por quantidade, pedido mínimo, texto do anúncio voltado a revenda.

**Textos para o público de atacado (propostos em 07/10/2026):**
- Descrição (máx. 60): `Compre em quantidade para o seu negócio ou revenda.` · `Nota fiscal para empresas. Compre em quantidade.`
- Descrição (máx. 90): `Compras acima de R$ 250: 5% de desconto. Ideal para revenda e grandes quantidades.` · `Compre em quantidade para o seu negócio. Emitimos nota fiscal para empresas.`
- Título opcional (máx. 30): `Compre em Quantidade`
- Sem o código do cupom no anúncio (ALNA5%OFF tem palavra toda em maiúsculas, e a política editorial reprova); sem siglas como CPF/CNPJ. A nota fiscal é emitida à mão pelo dono por enquanto (depois automática pela Asaas).

**Tela final de revisão do Google Ads (07/10/2026):** nome da campanha "Alna | Utilidades Domésticas"; meta **Tráfego do site**; site `https://alna.sale/` (sem opção de editar nessa tela, então a campanha da Admin > Campanhas ainda não está ligada); nome da empresa ALNA; 5 títulos + 4 descrições (versão consumidor, ainda sem as de atacado); 7 imagens; locais MG, PR, RJ, RS, SC + 1 (SP); 8 temas de palavra-chave (pilão, utensilios de cozinha, loja de utilidades domesticas, rolo de massa, produtos de utilidades domesticas, colher de madeira, loja de utensilios domesticos, utensílios de madeira); orçamento **R$ 3,70/dia (máx. R$ 112/mês)**.
Pendências levantadas na revisão: trocar a Descrição 3 pela de atacado ("Compras acima de R$ 250: 5% de desconto..."); conferir depois de criada se há sufixo de URL final para usar os parâmetros utm da campanha (sem eles as vendas do anúncio não aparecem em Admin > Campanhas); o site não envia o evento de compra ao Google Analytics, então a meta não pode ser "Vendas" por enquanto; palavras negativas ainda a configurar; orçamento muito baixo para testar.

**Decisões do dono em 07/10/2026 (tarde):** o orçamento do Google Ads foi **aumentado** (valor novo não informado; o inicial era R$ 3,70/dia). O público-alvo é **quem compra no atacado** (revenda, uso comercial ou grandes quantidades) — todo texto, tema de palavra-chave e endereço final do anúncio deve falar com esse público. Na Precificação, as colunas **Média em cupom** e **Custo do frete** ficam em **0%** por enquanto (sem dados suficientes); serão preenchidas quando houver média real de vendas.

**Versão do anúncio voltada ao atacado (proposta):**
- Títulos (máx. 30): `Atacado Alna | Utilidades` · `Utensílios de Madeira Atacado` · `Revenda: Compre em Quantidade` · `5% de Desconto Acima de R$ 250` · `Frete Grátis e Nota Fiscal`
- Descrição 1 (máx. 60): `Atacado para revenda: utensílios, toalhas e utilidades.`
- Descrições (máx. 90): `Compras acima de R$ 250: 5% de desconto. Frete grátis acima de R$ 150 para todo o Brasil.` · `Nota fiscal para empresas. Pagamento por Pix ou cartão. Entrega em todo o Brasil.` · `Cozinha, toalhas de banho e roupas em quantidade. Monte o pedido direto no site.`
- Temas de palavra-chave a procurar na lista do Google (só aceita termos da lista deles): atacado de utilidades domésticas, atacado de utensílios de madeira, utensílios de madeira atacado, atacado de toalhas, toalhas de banho atacado, revenda de utilidades domésticas, fornecedor de utilidades domésticas, tábua de corte atacado, comprar utensílios de cozinha em quantidade.
- Palavras negativas: fitness, academia, moda fitness, legging, treino, receita, como fazer, usado, grátis.
- Endereço final ideal: `https://store.alna.sale/atacado` (página criada para isso). A Home ainda não tem link para ela (aguarda autorização do dono).

