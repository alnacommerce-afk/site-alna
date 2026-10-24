# Plano de Meta Ads (Instagram e Facebook) — ALNA

Data: 24/10/2026. Status: **rascunho para o "ok" do dono**. Nada foi criado na Meta, nenhuma campanha foi publicada e o site não foi alterado.

Este plano junta o que já está em `docs/PLANO-B-TRAFEGO.md`, `docs/META-ADS-PASSO-A-PASSO.md`, `docs/META-ADS-COMANDOS.md` e `docs/DECISOES.md`, e acrescenta o que faltava decidir antes de gastar.

---

## 1. Resumo

- **Frente A (agora): atacado, anúncio que abre conversa no WhatsApp.** Orçamento de **R$ 15/dia** (decisão do dono em 14/10), 14 dias de teste, depois leitura e decisão.
- **Frente B (depois): varejo, catálogo dinâmico.** Só depois do Meta Pixel instalado e de pelo menos 14 dias de dados da Frente A.
- **Três pontos precisam de decisão antes de publicar** (seção 3): o desconto prometido no anúncio, o limite do cupom `ALNA5%OFF` e o Pixel.
- **Como medir sucesso:** custo por conversa de WhatsApp **qualificada** e pedidos atribuídos. Conversa iniciada sozinha não conta como resultado.

## 2. Ponto de partida (verificado em 24/10)

| Item | Situação | Fonte |
|---|---|---|
| Meta Pixel no site | **Não existe.** Busca por `fbq`, `connect.facebook` e `fbevents` em `home-cloudflare/` e `src/` não achou nada. Só GA4. | busca no repositório |
| Cupom `ALNA5%OFF` | Ativo, 5%, pedido mínimo R$ 250, **limite de 10 usos**, **uso atual 0**, sem data de validade, visível no site. | consulta ao banco em 24/10 |
| Feed de produtos Meta | Existe (`meta-catalog-feed`, 33 itens). Exclui variações primárias que têm secundárias (regra de 16/10). | `PLANO-B-TRAFEGO.md`, `DECISOES.md` |
| Imagens do anúncio | 6 JPEG prontos em `docs/modelos/meta-anuncios/`: Cozinha, Toalhas e Roupas, em 1080×1080 e 1080×1350. | `DECISOES.md` 14/10 |
| Textos e mensagem de boas-vindas | Prontos em `META-ADS-COMANDOS.md`. | — |
| Conta Meta (portfólio, Página, Instagram, WhatsApp, conta de anúncios, pagamento) | **Último registro: 14/10, aguardando o dono.** Não sei se foi feito. | `SESSOES.md` 14/10 |
| Público próprio | Quase zero (1 inscrito na lista, 1 carrinho salvo em 13/10). A Frente A começa do zero. | `PLANO-B-TRAFEGO.md` |

## 3. Três pontos para decidir antes de gastar

### 3.1 Desconto prometido no anúncio
O texto do anúncio diz "5% de desconto acima de R$ 250". Mas o desconto só vale se o cliente digitar `ALNA5%OFF` no carrinho. O anúncio não mostra o código. Sem o código, a promessa é falsa, e isso é o tipo de coisa que gera reclamação e reprovação do anúncio.

**Opções:**
- **(a) Colocar o código no anúncio** ("use o cupom ALNA5%OFF"). Exige resolver o item 3.2 antes.
- **(b) Tirar o percentual do anúncio** e dizer só "condições especiais de atacado, fale com a gente". Mais seguro, mas menos atraente.

**Recomendação:** (a), porque o cupom já existe, já aparece no site e já tem a regra de pedido mínimo.

### 3.2 Limite do cupom `ALNA5%OFF`
Hoje o cupom acaba em **10 usos** e não tem data de validade. Com anúncio rodando, ele pode acabar em poucos dias e deixar a promessa sem valor.

**Opção recomendada:** subir o limite (por exemplo, 100 usos) e colocar data de validade igual à do teste (14 dias). Assim o cupom encerra junto com a campanha e o custo fica sob controle. Mudança de cupom é da área de **Vendas** (Vendedor), com o "ok" do dono.

### 3.3 Meta Pixel
Sem Pixel não há como medir pedido por anúncio, e a Frente B (catálogo e remarketing) não funciona.

- A **Frente A não depende do Pixel**: a medida é a conversa no WhatsApp e a planilha de leads.
- Para instalar o Pixel: carregar **depois da página pronta**, no mesmo padrão do GA4, com eventos de visualização de produto, carrinho e compra. Antes, avaliar o peso e a meta de 0,5 s da Home.
- Antes de instalar, verificar se o site precisa de aviso de cookies/privacidade para dados enviados à Meta. (No código não encontrei banner de cookies; só há menção na política de privacidade, `src/routes/politica-de-privacidade.tsx`. Confirmar com o dono.)
- **Precisa do "ok" do dono.**

## 4. Estrutura da campanha

### Frente A — ALNA | Atacado | WhatsApp | 2026-10
- **Objetivo:** Engajamento → Mensagens (ou Leads → Conversas, se for o que aparecer na tela). Confirmar o nome na tela, como indicado no passo a passo.
- **Destino:** WhatsApp (número comercial 51 99491-1125, WhatsApp Business já ativo).
- **Orçamento:** R$ 15,00/dia, sem data final, revisão no dia 14.
- **Conjunto de anúncios:** **um só**, para concentrar o aprendizado da Meta. Com R$ 15/dia não dá para dividir em vários.
  - Local: Brasil (começar por SC, PR, RS e SP, se a Meta deixar).
  - Idade: 25 a 60.
  - Público: amplo. Interesses como sinal (restaurantes, padarias, lojas de decoração, toalhas, varejo). Não usar público muito restrito.
  - Posicionamentos: automáticos.
- **Anúncios: 2, não 6.** Dividir R$ 15/dia em seis anúncios deixa cada um sem dados.
  1. **Carrossel** (3 cartões: Cozinha, Toalhas, Roupas) com o texto A.
  2. **Imagem única 4:5** (uma das categorias, a de melhor resultado no outro canal, ou Cozinha por padrão) com o texto B.
- **Textos:** os da seção 4 de `META-ADS-COMANDOS.md`, com o ajuste do item 3.1.
- **Mensagem de boas-vindas:** "Olá! Quero comprar em quantidade na ALNA (anúncio atacado)." Serve para saber a origem.

### Frente B — Catálogo de varejo (só depois)
- Começa quando: Pixel instalado e funcionando + 14 dias da Frente A + "ok" do dono.
- Catálogo do feed Meta (21 produtos, 33 variações), anúncios dinâmicos.
- Públicos de remarketing: quem viu produto, colocou no carrinho ou iniciou checkout (Pixel).
- Orçamento: decidir na hora, com base nos resultados da Frente A.
- **Regra:** uma campanha por vez, sem somar orçamento sem motivo.

## 5. Criativos e regras de conteúdo

- Usar só as 6 imagens já preparadas. Fotos reais dos produtos, faixa azul com a categoria e `alna.sale/atacado`, pouco texto.
- Sem logotipo de terceiros nas imagens.
- Sem "sem juros", "garantido", "o mais barato" ou qualquer promessa que o site não sustenta.
- Só prometer o que o site mostra (pedido mínimo, cupom, Pix, nota fiscal).
- Quando o texto mudar (por exemplo, o item 3.1), atualizar **todos** os lugares que citam o desconto: anúncio, página `/atacado`, mensagem de boas-vindas e planilha de modelos.

## 6. Atendimento — o gargalo mais provável

Um anúncio que gera conversa sem resposta rápida queima dinheiro.

- **Horário de resposta:** seg–sex 8h–18h, sáb 8h–12h. Meta: responder em **até 15 minutos** nesse horário.
- **Fora do horário:** mensagem de ausência ativa no WhatsApp Business, com retorno no próximo dia útil.
- **Modelos de resposta:** `docs/WHATSAPP-ATACADO-MODELOS.md`.
- **Quem atende:** decisão do dono (seção 9).
- Se o tempo de resposta passar de 15 minutos em dias seguidos, **pausar a campanha** até organizar o atendimento.

## 7. Medição

| Nível | O que mede | Onde |
|---|---|---|
| Alcance e custo | Gasto, impressões, cliques, custo por conversa iniciada | Gerenciador de Anúncios (diário) |
| Conversa qualificada | Conversa que virou pergunta de pedido, orçamento ou fechamento | planilha `docs/modelos/leads-atacado.csv` (origem = Anúncio) |
| Pedido | Pedido com cupom ou origem identificada | Admin (cupom e origem), GA4 |

**Limite a registrar:** em anúncio "click-to-WhatsApp" o clique não leva a uma URL. Então o pedido só se liga ao anúncio pela mensagem de boas-vindas e pela planilha, não por `utm_campaign`. Para a Frente B, com Pixel, a ligação passa a ser direta.

**Leitura semanal (toda segunda):** gasto, conversas iniciadas, conversas qualificadas, pedidos, custo por conversa qualificada, custo por pedido. Anotar no `docs/SESSOES.md` (ou no diário que o dono indicar).

## 8. Cronograma (proposta)

| Quando | O que | Quem |
|---|---|---|
| Hoje (24/10) | Decisões da seção 9 | dono |
| Até 27/10 | Conta Meta pronta (passo a passo, etapas 1 a 6). Confirmar o que já foi feito. Verificação da empresa é opcional nesta fase. | dono, com print a cada etapa |
| Após o "ok" do dono | Ajuste do cupom (3.2) e do texto (3.1), se aprovados | Vendas + Backoffice |
| Dia 1 a dia 14 | Frente A rodando com R$ 15/dia | — |
| Dia 14 | Leitura (seção 7) e decisão: manter, trocar criativo ou parar | dono, com relatório |
| Depois do dia 14 | Pixel (se aprovado) e, se houver resultado, Frente B | dono |

## 9. Decisões que dependem do dono

1. **Desconto no anúncio:** (a) código `ALNA5%OFF` no anúncio (recomendado) ou (b) sem percentual.
2. **Limite do cupom:** subir o limite e colocar validade de 14 dias (recomendado) ou manter em 10 usos.
3. **Quem atende o WhatsApp** e em que horário.
4. **Teto de custo por conversa qualificada.** Para definir, preciso do ticket médio real de pedidos de atacado. Sugestão de regra: o custo por conversa qualificada não deve passar de uma fração do pedido médio de atacado. Escolher a fração com o dono.
5. **Pixel:** autorizar a avaliação e a instalação (depende da seção 3.3).
6. **Conta Meta:** confirmar em que etapa está (portfólio, Página, Instagram, WhatsApp, conta de anúncios, pagamento).

## 10. Regras de parada

- **14 dias e cerca de R$ 210 (R$ 15 × 14)** sem conversa qualificada: **pausar** e rever público e criativos antes de gastar mais.
- **Custo por conversa qualificada acima do teto** (decisão 4): pausar.
- **Atendimento atrasado** (seção 6): pausar até organizar.
- **Anúncio reprovado ou conta restrita:** parar, **não criar conta paralela**, levar o motivo ao gerente.

## 11. O que NÃO fazer

- Criar conta nova de anúncios, usar outra identidade ou "emprestar" conta de terceiros. Usar sempre **ALNA COMMERCE LTDA**, com os mesmos dados do site e do pagamento.
- Usar **formulário de Leads da Meta**: os dados ficariam fora do domínio da loja, pelo mesmo motivo que a página `/atacado` não tem formulário durante o caso do Google (`PLANO-B-TRAFEGO.md`, seção 6).
- Mexer em campanhas ou contas do Google Ads (962 e 172, e a 635-244-4697 suspensa).
- Instalar o Pixel ou mudar o site sem o "ok" do dono.
- Prometer no anúncio algo que não esteja em uma página do site.

## 12. Limites deste plano

- As telas da Meta foram conferidas pela documentação oficial de 13/10 e não foram abertas hoje. Onde o nome do botão pode ter mudado, o passo está marcado com 🔎 em `META-ADS-PASSO-A-PASSO.md`: conferir na tela e mandar print.
- Os números de custo por conversa e de conversão **não são estimativas do projeto**. Não há histórico de Meta Ads da ALNA. O plano serve para aprender com R$ 15/dia, não para prever resultado.
- Não foi verificado hoje se a conta Meta já foi criada.
