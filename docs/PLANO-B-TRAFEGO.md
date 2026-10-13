# Plano B de tráfego (sem depender do Google Ads) — 13/10/2026

Contexto: a conta Google Ads 635-244-4697 está suspensa (3 contestações recusadas em 13/10). Este plano traz visitantes e pedidos por outros caminhos, **sem criar conta nova de Google Ads e sem contornar a suspensão**. Prioridade do dono: loja rápida (Home ≤ 0,5 s) e pedidos. Toda mudança no site passa pelo formato "benefício, risco, espaço no back end, efeito no carregamento" **antes** de aplicar.

## 1. Ponto de partida (fatos verificados em 13/10)
- Loja no ar e rápida; **21 produtos / 33 variações** (Cozinha 7, Toalhas 8, Roupas 6); página de atacado própria na Home (`alna.sale/atacado`, carrossel por categoria, WhatsApp).
- **Público próprio ≈ zero:** 1 inscrito na lista de e-mail, 0 pelo pop-up, 1 carrinho salvo; Search Console: 9 cliques em ~3 semanas (alna.sale) e 3 (store). Ou seja: o plano começa do zero e precisa **gerar audiência**.
- Já existe: GA4 (carrega depois da página pronta), Search Console e Merchant Center ("Alna" 5856969666) ativos e limpos, feed de produtos (`meta-catalog-feed`: 33 itens, `?for=google` e Meta), JSON-LD de produto e de política de devolução, **links com rastreamento por campanha** (Admin > Marketing > Campanhas: `utm_campaign` fica gravado no pedido), cupons (ALNA5%OFF, indicação 5%), carrinho abandonado, lista de e-mail, gerador de ideias de posts (Admin), Instagram @store.alna.sale.
- **Não existe:** Meta Pixel no site (só a verificação de domínio do Facebook); atributos `gender`/`age_group` e `google_product_category` no feed; nenhuma campanha ativa em lugar nenhum.

## 2. Canais, por ordem de prioridade (impacto × esforço × risco)
| # | Canal | Custo | Rapidez | Para quê | Quem faz |
|---|---|---|---|---|---|
| 1 | **Atacado B2B ativo (atendimento a quem chega + contato 1 a 1 consentido; ligação, e-mail e Instagram antes do WhatsApp)** | R$ 0 | dias | atacado (lojas, restaurantes, padarias, lanchonetes, buffets, sublimação) | dono + Claude (scripts, listas, mensagens) |
| 2 | **Instagram/Facebook orgânico + WhatsApp Business** | R$ 0 | 2–4 semanas | marca + leads | dono (posts) + Claude (ideias/legendas) |
| 3 | **Google Merchant Center — listagens gratuitas** | R$ 0 | semanas | varejo (Aba Shopping/Pesquisa) | Claude (feed) + dono (painel) |
| 4 | **SEO / Search Console** | R$ 0 | 1–3 meses | tráfego orgânico | Claude + dono |
| 5 | **Meta Ads (Instagram/Facebook): anúncio que abre WhatsApp** (atacado) e catálogo (varejo) | R$ (a decidir) | 1–2 semanas p/ aprender | atacado + varejo | Claude (setup/pixel) + dono (conta/pagamento) |
| 6 | **E-mail + indicação** (já pronto) | R$ 0 | quando houver lista | recompra | automático |
| 7 | **Marketplaces** (Mercado Livre/Shopee) | comissão | 1–2 meses | volume | só depois de validar o que gira (pesquisa necessária) |
| 8 | Outros pagos (TikTok Ads, Microsoft Advertising) | R$ | — | teste futuro | depois (a importação do Google Ads da Microsoft exige a conta do Google; não serve agora) |

## 3. O que fazer em cada canal

### 3.1 Atacado B2B (começa já) — **CORRIGIDO em 13/10 depois de ler a política do WhatsApp**
- **Correção importante:** a Política de Mensagens do WhatsApp Business só permite contatar quem **deu o número e permissão (opt-in)**; spam/mensagem não solicitada leva a **limitação ou suspensão** do número. Então a meta original de "15 contatos frios por dia por WhatsApp" **foi retirada**. Nova meta: **responder rápido a quem chega** (anúncio, site, Instagram) e fazer **5–10 contatos 1 a 1 por dia**, de preferência por **ligação, e-mail ou Instagram**, e por WhatsApp **só para empresas que publicam esse número para pedidos**. Detalhes e modelos: `docs/WHATSAPP-ATACADO-MODELOS.md`.
- Públicos: restaurantes, padarias, lanchonetes e buffets (utensílios de madeira); lojas de casa/enxoval e revendedores (toalhas); quem trabalha com sublimação (toalhas brancas para sublimar). Onde achar: Google Maps (busca manual na região de Brusque/Itajaí/Blumenau/Florianópolis), Instagram, grupos de revenda.
- **Claude entrega:** 3 modelos de mensagem (frio, retorno, fechamento), planilha de acompanhamento e regra de cupom ALNA5%OFF (5% acima de R$ 250).
- **Atribuição:** a mensagem pré-preenchida do WhatsApp pode levar um código da origem (ex.: "Origem: Insta"); mudança pequena em `alna.sale/atacado` — avaliar antes.

### 3.2 Instagram/Facebook e WhatsApp Business
- WhatsApp Business: saudação automática, resposta rápida, **catálogo** (as 3 categorias), etiquetas por fase do lead.
- Instagram: link da bio → `alna.sale/atacado` (atacado) ou `store.alna.sale/loja` (varejo), com link rastreado (Admin > Marketing > Campanhas).
- Conteúdo (3–4/semana): Reels curtos de produto, antes/depois, "como usar", bastidores de embalagem; usar o gerador de ideias do Admin.

### 3.3 Merchant Center (listagens gratuitas)
- **Fato (docs do Google):** listagens gratuitas exigem informações de frete (obrigatório no Brasil) e política de devolução acessível sem login; para **roupas no Brasil, `age_group` e `gender` são obrigatórios**; `item_group_id` é obrigatório para variações (já temos).
- **Lacunas do nosso feed (33 itens):** `gender` e `age_group` vazios (afeta as 6 roupas), `google_product_category` vazio. **Ação do Claude:** completar o feed (sem efeito no site). **Ação do dono:** conferir no Merchant Center o diagnóstico de produtos, o frete e a política de devolução (prints).
- **Risco a vigiar (inferência):** o Merchant Center usa a mesma Conta do Google da conta suspensa; a suspensão do Ads **não** suspende automaticamente o MC, mas pode haver reflexo. Acompanhar o status e **não** mexer em nada que lembre a conta antiga encerrada.

### 3.4 SEO / Search Console
- Hoje: alna.sale 11 indexadas / 9 não; store 10 / 6 (as "não indexadas" provavelmente incluem redirecionamentos dos domínios antigos — **precisa do relatório de motivos**, print do dono).
- Ações: enviar/confirmar sitemaps (`store.alna.sale/sitemap.xml` e `alna.sale/sitemap.xml`, que já inclui `/atacado`); pedir indexação de `alna.sale/atacado` (Inspeção de URL); revisar título/descrição por categoria (campos SEO das categorias existem); ligar as páginas de categoria entre si; 1 página de conteúdo por semana (ex.: "como escolher toalha de banho por gramatura", "como cuidar de utensílios de madeira").
- Expectativa honesta: SEO leva semanas a meses; é a base de longo prazo.

### 3.5 Meta Ads (pago) — só depois dos itens 1–4 começarem
- **Pré-requisitos (docs da Meta):** página do Facebook da empresa + WhatsApp Business conectado (não dá para anunciar de perfil pessoal); para catálogo: catálogo + **pixel** ligados, IDs do catálogo iguais aos do pixel, imagens ≥ 500×500; links do catálogo no domínio do negócio.
- **Duas frentes:** (a) **anúncio que abre conversa no WhatsApp** (atacado) — mede **custo por conversa**; (b) **catálogo dinâmico** (varejo) — só vale com pixel acumulando dados (semanas).
- **Mudança no site necessária:** instalar o **Meta Pixel carregado depois da página pronta** (mesmo padrão do GA4) com eventos de produto/carrinho/compra. **Precisa de avaliação antes** (peso, requisições; meta da Home ≤ 0,5 s) e do seu "ok".
- **Orçamento (sugestão, a decidir com o dono):** começar com **R$ 15–20/dia** (a campanha do Google rodava com R$ 10,90/dia), 14 dias de teste; **regra de parada:** se após 14 dias e ~R$ 250 o custo por conversa qualificada passar do limite combinado, pausar e rever criativos/público.
- **Identidade:** abrir a conta de anúncios **no nome da ALNA COMMERCE LTDA** (mesma razão social do site e do pagamento) — coerência é o que evita bloqueios.

### 3.6 E-mail e indicação
- Já prontos: lembretes de carrinho, cupom de boas-vindas (pop-up na `/loja`), campanha a cada 20 dias (próxima 27/10), recompensa de indicação 5%. Falta **audiência**: o canal só rende depois que 1–5 geram visitas.

### 3.7 Marketplaces (fase 2)
- Precisam de pesquisa de comissão, regras de nota fiscal e integração de estoque **antes** de decidir. Sugestão: escolher 3–5 produtos que girarem no WhatsApp/Instagram e testar 1 marketplace.

## 4. Calendário sugerido (30 dias)
| Semana | Foco | Entregáveis |
|---|---|---|
| 1 (13–20/10) | base | links rastreados; scripts de WhatsApp; WhatsApp Business; sitemap/indexação; feed do Google completo; prints do Merchant Center e do Search Console |
| 2 (20–27/10) | atacado ativo | 5–10 contatos 1 a 1/dia (ver política do WhatsApp); 3–4 posts; ajuste de `alna.sale/atacado` para origem da mensagem (se aprovado); 4ª contestação do Google só se houver fato novo |
| 3 (27/10–3/11) | pago pequeno | Pixel (se aprovado); conta e página Meta; 1 campanha WhatsApp com R$ 15–20/dia; campanha de e-mail de 27/10 |
| 4 (3–10/11) | decidir | leitura de custo por conversa e pedidos por canal (utm_campaign + GA4); escalar o que deu resultado, cortar o resto; avaliar marketplace |

## 5. Medição (semanal, segunda-feira)
Pedidos por `utm_campaign` (Admin > Marketing > Campanhas); sessões e origens no GA4; cliques e impressões no Search Console; produtos aprovados/impressões no Merchant Center; conversas e fechamentos no WhatsApp (planilha); custo por conversa (Meta).

## 6. O que NÃO fazer
- Criar conta nova de Google Ads, usar outra identidade para anunciar ou "emprestar" conta de terceiros (viola a política "Circumventing systems" e agrava a suspensão).
- Mexer em campanhas/contas 962 e 172 do Google Ads.
- Adicionar formulário de captura de dados no domínio enquanto o caso do Google estiver aberto (captura por WhatsApp).

## 7. Decisões que dependem do dono
1. **Orçamento** do Meta Ads (sugestão R$ 15–20/dia por 14 dias) e **quem atende o WhatsApp** (tempo de resposta importa).
2. "ok, aplique" para: (a) completar o feed do Google (sem efeito no site); (b) código da origem na mensagem do WhatsApp de `alna.sale/atacado`; (c) Meta Pixel (após avaliação de peso).
3. Prints: Merchant Center (diagnóstico, frete, devolução), Search Console (motivos das páginas não indexadas, sitemaps).
4. Início: sugestão de começar o canal 1 (WhatsApp B2B) **imediatamente**, pois não depende de nada do site.

## Fontes consultadas (13/10/2026)
- Google Merchant Center: listagens gratuitas e requisitos (support.google.com/merchants/answer/13889434; /14011730; /7052112).
- Meta: requisitos de anúncios de catálogo (facebook.com/business/help/232493917827200); anúncios que abrem o WhatsApp (developers.facebook.com/…/click-to-whatsapp; facebook.com/business/help/1583303048513172).
