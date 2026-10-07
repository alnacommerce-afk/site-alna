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

**Correção (07/10/2026, tarde):** o diagnóstico da campanha mostra "grupo de recursos" e estratégia "Maximizar conversões" — termos de uma campanha **Performance Max**, não de campanha inteligente como eu tinha tratado antes. Status: **Pendente** (grupo de recursos em análise de política); aviso **"A qualidade do anúncio é baixa"** porque os recursos estão incompletos. Orçamento atual: **R$ 10,90/dia**. Para melhorar: abrir "Editar grupo de recursos" e completar — títulos (até 15, 30 caracteres), títulos longos (até 5, 90), descrições (1 de 60 + até 4 de 90), imagens quadradas, horizontais e **retrato 4:5**, logotipos, nome da empresa, endereço final e, se houver, temas de pesquisa/sinais de público.

**Recursos de atacado para o grupo de recursos (limites conferidos, sem palavra inteira em maiúsculas):**
- Títulos (15): Atacado Alna | Utilidades · Utensílios de Madeira Atacado · Revenda: Compre em Quantidade · 5% de Desconto Acima de R$ 250 · Frete Grátis e Nota Fiscal · Toalhas de Banho no Atacado · Atacado Utilidades Domésticas · Tábua de Corte Atacado · Nota Fiscal para Empresas · Frete Grátis Acima de R$ 150 · Entrega para Todo o Brasil · Compre em Quantidade · Utilidades para Revenda · Pilão e Rolo Atacado · Pague no Pix ou Cartão
- Títulos longos (5): Atacado de utensílios de madeira, toalhas e utilidades domésticas para revenda · Compre em quantidade com 5% de desconto acima de R$ 250 e frete grátis acima de R$ 150 · Utilidades domésticas para revenda e uso comercial, com nota fiscal para empresas · Monte seu pedido de atacado direto no site e receba em todo o Brasil · Tábuas, pilões, rolos e toalhas em quantidade para o seu negócio
- Descrições: (60) Atacado para revenda: utensílios, toalhas e utilidades. · (90) Compras acima de R$ 250: 5% de desconto. Frete grátis acima de R$ 150 para todo o Brasil. · Nota fiscal para empresas. Pagamento por Pix ou cartão. Entrega em todo o Brasil. · Cozinha, toalhas de banho e roupas em quantidade. Monte o pedido direto no site. · Atacado e revenda sem pedido mínimo. Monte o pedido no site e pague no Pix ou cartão.
- Endereço final: `https://store.alna.sale/atacado`.

**Tela "Editar recursos" do grupo de recursos (07/10/2026):** qualidade do anúncio **Média**; URL final ainda `https://alna.sale/` (campo editável → trocar para `https://store.alna.sale/atacado`); 5 títulos antigos (precisa de mais), 1 título longo, 4 descrições (suficientes), 6 imagens (faltam 1 horizontal, 1 quadrada e 2 verticais 4:5), 1 logotipo (sugerido adicionar o horizontal "ALNA" do site), 0 vídeos ("Gerar vídeos"), 0 sitelinks, sem sinais de público ("Nenhum indicador fornecido").
Sitelinks propostos (texto ≤25, linhas de descrição ≤35): Atacado e revenda → /atacado · Cozinha em madeira → /loja?categoria=cozinha · Toalhas de banho → /loja?categoria=toalhas · Todos os produtos → /loja · Fale com a gente → /contato · Trocas e devoluções → /politica-de-troca-e-devolucao (todos em `https://store.alna.sale`).
Imagens extras geradas para essa tela: `pmax-horizontal-toalhas`, `pmax-quadrada-toalhas`, `pmax-retrato-cozinha`, `pmax-retrato-toalhas` (1200 px, fundo branco, fotos do próprio catálogo).

**Segunda passada na tela "Editar recursos" (07/10/2026):** URL final já é `https://store.alna.sale/atacado`; 15 títulos; 2 títulos longos (o 1º, "Alna | Utilidades Domésticas", é curto demais — trocar/adicionar até 5); 4 descrições; 6 sitelinks adicionados; CTA "Comprar agora"; imagens ainda sem os 4 arquivos novos; 0 vídeos.
**Rastreamento das vendas do anúncio:** em "Mais opções > Opções de URL do grupo de recursos > Sufixo do URL final" usar `utm_source=google&utm_medium=cpc&utm_campaign=google-ads-atacado` (sem `?`). A campanha "Google Ads Atacado" (`google-ads-atacado`) foi criada em Admin > Marketing > Campanhas link UTM para contar as vendas. O contador de visualizações pode aparecer no GA4 com o nome da campanha do Ads (auto-tagging), mas o número de vendas vem do pedido.
**Outros recursos propostos:** Promoção (5% de desconto, gasto mínimo R$ 250); Frases de destaque (≤25): Nota fiscal para empresas · Frete grátis acima R$ 150 · Entrega em todo o Brasil · Pix com 4% de desconto · Atacado e revenda · Compre em quantidade; Snippet estruturado "Tipos": Utensílios de madeira, Toalhas de banho, Tábuas de corte, Pilões, Rolos de massa; Caminho de exibição: `atacado` / `revenda`; **NÃO usar** "Regras de URL" do grupo de recursos para bloquear páginas: elas são regras de INCLUSÃO (só mostram o anúncio
em URLs que contêm o texto) — a sugestão anterior de listar /admin, /checkout etc. estava errada e foi corrigida em 07/10/2026.
Exclusões de página, se precisar, ficam nas configurações da campanha (expansão de URL final) e só existem com a expansão ligada.

**Conferência na documentação oficial do Google Ads (07/10/2026) — Performance Max** (support.google.com/google-ads/answer/17091269 e /14587068): títulos até 30 caracteres (3 a 15; **ao menos um com até 15**); títulos longos até 90 (1 a 5); descrições até 90 (2 a 5; **ao menos uma com menos de 60**); nome da empresa até 25; caminho de exibição 2 campos de até 15; imagens quadrada 1200x1200 (mín. 300), horizontal 1200x628 (mín. 600x314), vertical 4:5 960x1200 (mín. 480x600); logotipo quadrado 1200x1200 (mín. 128) e horizontal 1200x300 (mín. 512x128). Palavras negativas valem no nível da campanha (até 10.000) e da conta (até 1.000) e **não** pegam variações próximas — cada palavra tem de ser escrita. Sinais de público não são segmentação rígida. "Regras de URL" do grupo de recursos são **inclusão**. Limites de sitelink (25/35) e frase de destaque (25) confirmados só em fontes especializadas, não na página oficial consultada — o contador do próprio formulário é a referência.


## STATUS (07/10/2026, fim do dia): campanha NO AR

A primeira campanha do Google Ads da ALNA — **"Alna | Utilidades Domésticas"** (tipo Performance Max, 1 grupo de recursos, público: **atacado/revenda**) — foi **criada em 07/10/2026 e já está rodando** (fase de aprendizado: "Sua campanha está aprendendo e melhorando"; sem tarefas pendentes). Orçamento R$ 10,90/dia. Conta `635-244-4697`. No momento do print: custo R$ 0,00, 0 cliques (recém-iniciada).
Rastreamento das vendas: sufixo do URL final `utm_source=google&utm_medium=cpc&utm_campaign=google-ads-atacado` → linha **"Google Ads Atacado"** em Admin > Marketing > Campanhas link UTM (conta as vendas pelo pedido). Endereço final: `https://store.alna.sale/atacado`.
Promoção do Google na conta: gastar R$ 1,2 mil em campanhas até 06/12/2026 dá R$ 2,4 mil de crédito (não gastar só por isso).
**Como acompanhar (não mexer em nada durante o aprendizado, em geral alguns dias a semanas — não verificado o prazo exato):** olhar no Ads impressões, cliques e custo; em Insights, os termos de pesquisa e as páginas de destino; no admin, vendas e % de frete em "Campanhas link UTM" e "Gasto com frete". Pendências abertas: palavras negativas da campanha (fitness, academia, legging, treino, receita, grátis, usado — uma a uma, sem variações próximas), 2 títulos curtos (≤15 caracteres: "Atacado Alna", "Compre Atacado"), os 4 arquivos de imagem novos, vídeo e sinais de público, caso ainda não adicionados.
