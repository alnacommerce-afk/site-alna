# Rascunho — 2ª contestação do Google Ads (conta 635-244-4697)

Versão 3, de 13/10/2026 — **o formulário real abriu** (link do e-mail do Google → "Começar" → "Conferir problemas" → "Contestar a suspensão"). Ele tem **2 campos de texto** e uma 2ª etapa "Confirmação":
1. "Quais mudanças você fez na sua conta ou nos pagamentos desde a última contestação?"
2. "Você quer incluir outras informações que não estavam na contestação anterior?"
Aviso do Google no formulário: várias contestações em 7 dias sem corrigir o problema são marcadas como infundadas e limitam novos envios → **enviar UMA vez**.

O problema que o Google mostra (verificação de 08/10/2026 03:27): "Página de destino não está funcionando — Campanha Alna | Utilidades Domésticas, Grupo de recursos 1: sua página de destino está inacessível ou não está funcionando corretamente".

Só afirmar o que é verdade no dia do envio. Limites de caracteres dos campos: **desconhecidos** (se o contador reclamar, encurtar).

## CAMPO 1 — Quais mudanças você fez na sua conta ou nos pagamentos desde a última contestação?

Desde a contestação de 8 de outubro de 2026 fizemos estas mudanças:
1) O perfil de pagamentos do Google Ads agora está no nome da empresa, ALNA COMMERCE LTDA (organização, CNPJ 57.135.009/0001-27); antes estava em nome da pessoa física do sócio. O nome e o endereço foram verificados pelo Google em 9 de outubro de 2026.
2) Em 13 de outubro de 2026 concluímos a verificação do anunciante da conta (dados da organização e da Dun & Bradstreet, origem do pagamento e afiliação). O painel mostra "Advertiser identity verified — ALNA COMMERCE LTDA".
3) O recebimento dos pagamentos da loja passou para uma conta de pagamentos no CNPJ da própria empresa.

## CAMPO 2 — Você quer incluir outras informações que não estavam na contestação anterior?

Quem somos: ALNA COMMERCE LTDA, CNPJ 57.135.009/0001-27, ativa desde 03/09/2024, com sede em R. Luiz Rafael Flor, 450, Nova Brasília, Brusque/SC, CEP 88.352-553. Vendemos utensílios de madeira para cozinha, toalhas e itens de cama, mesa e banho, com nota fiscal e entrega para todo o Brasil, no varejo e em atacado para revenda.

Sobre o motivo da suspensão (página de destino fora do ar na verificação de 8 de outubro, 03:27): não conseguimos reproduzir a falha. A página https://store.alna.sale/atacado é informativa, sem formulário e sem pedido de senha ou dados pessoais, e responde normalmente aos robôs do Google (AdsBot, AdsBot Mobile e Googlebot: 9 testes em 13 de outubro de 2026, todos com resposta 200 em até 1 segundo). Passamos a acessar a página automaticamente a cada 5 minutos, para que esteja sempre pronta para responder.

Mudanças no site: razão social, CNPJ e endereço no rodapé de todas as páginas, na página inicial e em "Sobre"; contato por WhatsApp (51) 99491-1125 e contato@alna.sale; políticas de privacidade, termos de uso e troca e devolução publicadas. Dois domínios antigos da marca (alnacommerce.com e alna.cc) tinham falha de acesso ou de certificado e hoje redirecionam para alna.sale com HTTPS válido. Em 8 de outubro de 2026 encerramos uma conta antiga e duplicada do Merchant Center, mantendo apenas a da loja (store.alna.sale). Em 8 de outubro de 2026 o Search Console não indicava ações manuais nem problemas de segurança.

Os dados de cartão são digitados somente no checkout, em HTTPS, e enviados à processadora de pagamentos; não os armazenamos. Pedimos o e-mail do cliente para a compra e, com o consentimento dele, para cupom e lembrete de carrinho, sempre com opção de cancelar.

[PARÁGRAFO OPCIONAL — **só incluir se for verdade e depois de conferir o URL final das campanhas da 962** (e o histórico da 172):] Por transparência: o sócio possui outras duas contas de Google Ads, em outras Contas do Google — a 172-390-8582 (cancelada) e a 962-967-1605 (pausada pelo prazo da verificação do anunciante). Foram usadas apenas em testes de outros projetos, sem relação com os domínios da ALNA, e nunca veicularam anúncios da ALNA. Os perfis de pagamentos são distintos.

Ficamos à disposição para enviar qualquer documento, como o cartão do CNPJ.

## Fatos usados e como foram verificados (13/10/2026)
| Afirmação | Verificação |
|---|---|
| Pagador = LTDA, verificada em 09/10 | Print do dono (Detalhes do pagador: nome e endereço "Verificado em 9 de out. de 2026") |
| Verificação do anunciante concluída 13/10 | Histórico/Policy tasks (D&B, About your business, funding source) e "Google Ads verified your affiliation" (prints do dono) |
| Asaas no CNPJ da LTDA | API Asaas 09/10 (APPROVED) + pedidos pagos |
| Falha não reproduzida; 9 testes 200 | `curl` em 08/10 (15/15) e 13/10 (9/9, 0,4–1,0 s) |
| Acesso automático a cada 5 min | cron `keep-warm-atacado` `*/5`, ativo, 288 execuções/24 h |
| Identidade, políticas, WhatsApp, e-mail no site | `curl` 13/10 (`/sobre`, `/loja`, `alna.sale`; políticas 200) |
| alna.cc e alnacommerce.com redirecionam, HTTPS válido | `curl` 13/10 |
| Merchant Center antigo encerrado em 8/10 | Palavra do dono (sem comprovante) — só a data |
| Search Console limpo em 08/10 | Print do dono em 08/10 (**data explícita no texto; não afirmar "hoje"**) |
| Cartão não armazenado | Código de `checkout-create` (leitura em 09/10) |
| Parágrafo das outras contas | Prints (perfis distintos; 172 cancelada sem violação; 962 pausada por verificação). **"Testes de outros projetos / sem relação com a ALNA" é declaração do dono, ainda sem o URL final** |

## Antes de enviar
- [ ] Dono lê os 2 textos e confirma cada afirmação; decide o parágrafo opcional (outras contas).
- [ ] Conferir o URL final das campanhas da 962 (e a 172) antes de afirmar "nunca veicularam anúncios da ALNA".
- [ ] Colar no formulário, avançar para a etapa 2 ("Confirmação"), **mandar print ao Claude antes do botão final**.
- [ ] Enviar UMA vez. Não criar outra conta Google Ads; não anunciar a ALNA por outra conta.
