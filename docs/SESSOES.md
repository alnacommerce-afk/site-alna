# Diário das sessões — quem fez o quê, em qual computador

**Regra (14/10/2026):** o dono usa **um chat por computador**, na mesma pasta do Google Drive; os chats **não se enxergam**. O que os liga é este diário, o GitHub e os bilhetes de presença do hook. Ao concluir um bloco de trabalho — e **sempre** que o dono disser que vai trocar de computador ou encerrar — o assistente **acrescenta** (nunca apaga) uma entrada abaixo, **com o nome do computador**, e faz commit e push.
Formato: `## AAAA-MM-DD HH:MM — <Computador> — título` + Feito · Em andamento · Próximo passo · Commits.

**Computadores:** **Computador HOME** = `PICHAUP-JOBNERU` (nome combinado pelo dono em 14/10/2026: tudo que foi conversado no chat do projeto neste computador foi feito por ele). O outro computador será nomeado quando o instalador rodar lá (arquivo compartilhado `.claude\computadores.json`, pasta do Drive).

---

## 2026-10-14 — Computador HOME — registro retroativo e início do modelo de dois computadores
Registro feito em 14/10/2026 a partir da conversa; **datas exatas e detalhes ficam em `git log`, `DECISOES.md` e `db-changes-applied-by-claude.md`**. Tudo abaixo foi feito pelo **Computador HOME** no chat do projeto:
- **Pedidos e e-mails:** correção do e-mail "chegou" repetido a cada 30 min (gatilho `track_order_events` comparando o status com um valor inexistente do enum); assuntos novos dos e-mails de boas-vindas e carrinho (12/10); cupom de carrinho abandonado confirmado em 5% (o "10%" era um e-mail de teste de 09/10).
- **Admin:** formulário de novo produto não perde dados; campos fiscais pré-preenchidos; **Precificação** do zero (fórmula `Custo ÷ [1 − (imposto + cartão + margem)]`, percentuais por SKU com preenchimento em massa, custo do frete, desconto de anúncio, sincronização diária com o FinMarket HUB); **Pedidos**: colunas "Valor Etiqueta" (valor real pelo `/me/orders/search` do Melhor Envio e cotação ao vivo para pedido ainda sem etiqueta) e "Rastreio", tabela sem rolagem horizontal; limite da IA do catálogo (cadastro salva sem complemento, ícone "?" no catálogo) e escolha de variações por botões.
- **Loja e Home:** banner da `/loja` com a embaixadora em recorte orgânico; link de campanha UTM aponta para `alna.sale`; botão principal da Home em duas linhas; correção do deploy da Home no Cloudflare (a integração com o GitHub estava desconectada); no checkout, trocar o CEP limpa o endereço inteiro.
- **Pagamentos e segurança (06/10):** incidente de 401 da Asaas e fila de webhooks pausada; monitoramento `payment-health-check` (a cada 6 h) com alerta por e-mail; valor `refunded` no enum de status; leitura pública de `site_settings` restringida por coluna (e-mail do admin e endereço de origem deixaram de ser públicos).
- **Planejamento (12–14/10):** avaliação de skills/agentes (Addy Osmani, Playwright CLI) → `docs/PLANO-AGENTES-E-SKILLS.md` (proposta); hook + skill de atualização automática do repositório → `docs/HOOK-ATUALIZAR-REPOSITORIO.md`; instalador para o outro computador → `docs/PASSO-A-PASSO-OUTRO-COMPUTADOR.md`.
- **Em andamento / próximo passo:** (1) instalar o hook no outro computador e dar nome a ele; (2) aguardar o ok do dono para a Fase 0 do plano de agentes (etiqueta no git + inventário dos commits); (3) pendências do Google Ads e Plano B de tráfego seguem em `PENDENCIAS.md` (outras conversas as atualizaram em 13/10).
- **Commits:** ver `git log` de 06/10 a 14/10/2026. O autor do repositório é o mesmo nos dois computadores; por isso este diário existe.

**Nota sobre registros anteriores:** `PENDENCIAS.md`, `DECISOES.md` e o painel do Google Ads citam "outra conversa/outra máquina" (09/10 a 13/10) **sem dizer qual computador**. Quando o outro computador for nomeado, o assistente pergunta ao dono e anota aqui a qual deles pertence cada registro.
