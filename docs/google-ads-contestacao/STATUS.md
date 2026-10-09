# Painel de situação — 2ª contestação do Google Ads

**Última atualização:** 09/10/2026 (tarde)

## Situação atual
- Conta **suspensa** (phishing / "página de destino não está funcionando"), desde 08/10/2026 03:27.
- **1ª contestação** (nº 6452280642, enviada em 08/10/2026): **RECUSADA** em 08/10/2026 11:57. O e-mail do Google diz que pode-se enviar outra com
  **informações novas**. O banner do Ads confirma ("Se você tiver novas informações para apoiar a contestação original, envie uma nova").
- **2ª contestação: NÃO enviada.** Texto em `RASCUNHO-2a-contestacao.md`.
- Não criar outra conta de Google Ads (contas ligadas/novas são suspensas na hora). Não cancelar a conta.

## Regra "pode abrir"
Pode abrir a 2ª contestação quando **todos os itens BLOQUEANTES** abaixo estiverem **FEITO** e reverificados no dia do envio.
O item R5 (alna.cc) é bloqueante **até o dono decidir**: se a Hostnet não resolver até **12/10/2026**, o dono pode decidir enviar sem ele
(nesse caso remover do texto a linha sobre alna.cc e registrar a decisão aqui).

## Quadro de itens
| # | Item | Bloqueante? | Status | Quem | Evidência / como verificar |
|---|---|---|---|---|---|
| R1 | Identidade da empresa no site (razão social, CNPJ, endereço) no rodapé, `/sobre`, `/contato` e Home | Sim | **FEITO** | Claude | Commits a890b43/605e8d6; `curl https://store.alna.sale/sobre` mostra ALNA COMMERCE LTDA |
| R2 | Pagador do perfil de pagamentos do Google Ads = ALNA COMMERCE LTDA | Sim | **FEITO** (print do dono, 09/10) | Dono | Tela Faturamento > Configurações: "Detalhes do pagador: ALNA COMMERCE LTDA" |
| R3 | Recebimentos da loja (Asaas) no CNPJ da LTDA | Sim | **FEITO** | Dono/Claude | API Asaas 09/10: ALNA COMMERCE LTDA, 57135009000127, LIMITED, APPROVED; Pix de teste pago pelo webhook novo |
| R4 | `alnacommerce.com` sem erro (antes 522) | Sim | **FEITO** | Dono | `curl -I http://alnacommerce.com` → 301 → https → 301 → alna.sale |
| R5 | `alna.cc`: `https://alna.cc` com certificado válido e `http://alna.cc` sem 403, redirecionando para `https://alna.sale/` | Sim (até decisão do dono) | **PENDENTE — Hostnet** | Hostnet / dono cobra | 09/10 ~13:40: `www.alna.cc` OK (301); `http://alna.cc` = 403; `https://alna.cc` = erro de certificado (SEC_E_WRONG_PRINCIPAL, cert `*.f1.k8.com.br`). Dono respondeu o chamado e aguarda. O dono diz que redireciona "corretamente" no navegador, mas `http://alna.cc` dá erro |
| R6 | Conta antiga e duplicada do Merchant Center (5722404568) tratada | Sim | **FEITO** — encerrada pelo dono por volta das 19h de 08/10/2026 (horário aproximado, sem comprovante) | Dono | Perfil do Chrome dessa conta: "sem acesso"; ativa é "Alna" 5856969666 (store.alna.sale) |
| R7 | Existe OUTRA conta de Google Ads na outra Conta do Google? (para responder o formulário com honestidade) | Não (mas responder certo) | **"a princípio não"** (dono, 09/10) — confirmação leve pendente | Dono | Abrir https://ads.google.com no perfil do Chrome da Conta do Google do Merchant Center antigo; o MC antigo mostrava aviso de Ads com ID vazio |
| R8 | Site publicado no Lovable no estado descrito no texto | Sim | **FEITO** em 09/10 (pop-up, cupons, Pix); **repetir** a cada nova mudança | Dono publica / Claude confere | "publiquei, confere se subiu" |
| R9 | Destino do anúncio `/atacado` responde 200 rápido, inclusive com AdsBot, sem formulário | Sim | **FEITO** em 09/10 (200, ~1,5 s); **reverificar no dia do envio** | Claude | Comandos no fim deste arquivo |
| R10 | Search Console sem ação manual / Navegação segura limpa | Sim | **FEITO** em 08/10; **reverificar no dia** (dono manda print) | Dono | Search Console > Ações manuais e Problemas de segurança; transparencyreport.google.com/safe-browsing/search |
| R11 | Texto final sem `[CONFIRMAR]`, só com fatos FEITO | Sim | **PENDENTE** (rascunho pronto) | Claude | `RASCUNHO-2a-contestacao.md` |
| R12 | Cartão CNPJ à mão (caso o Google peça) | Não | Dono tem o arquivo | Dono | — |
| R13 | Perfil de pagamentos sem pendência de verificação após a troca do pagador | Não (observar) | **A observar** | Dono | Notificações do Google Ads / Pagamentos |

## Pontos de honestidade (não afirmar no texto)
- Não dizer que o pop-up é "necessário para finalizar a venda": é opcional (cupom de boas-vindas + novidades + lembrete de carrinho, com consentimento).
- O encerramento do Merchant Center antigo foi **depois** da suspensão e da 1ª contestação (08/10 ~19h): não apresentar como limpeza anterior.
- As causas listadas no texto (página inacessível, domínio antigo com erro, divergência empresa/site/pagador) são **hipóteses**, não algo que o Google confirmou.
- Não dizer que o dinheiro cai na LTDA além do que é verdade (Asaas na LTDA: verdadeiro em 09/10; contador ainda não consultado sobre regime/NF).

## Pendências fora da contestação (anotadas para não perder)
- Contador: receber vendas em conta de terceiro (MEI antigo), regime da LTDA, quem emite NF, destino do saldo na conta Asaas antiga.
- Depois da conta reativada: desligar "expansão do URL final" no PMax, negativar fitness/academia/legging/treino/receita/grátis/usado, 2 títulos curtos,
  4 imagens, vídeo, sinais de público.

## Histórico
- 08/10/2026 03:27 — conta suspensa (phishing; página de destino não funcionando).
- 08/10/2026 — Claude verificou que `/atacado` respondia 200 aos robôs do Google (0,4–1 s); hipótese: falha momentânea/partida a frio; criada verificação a cada 5 min (cron `keep-warm-atacado`).
- 08/10/2026 — 1ª contestação enviada (6452280642) → recusada 11:57.
- 08/10/2026 — `alnacommerce.com` com 522 em http corrigido ("Always Use HTTPS" ligado no Cloudflare); identidade da empresa publicada no site.
- 08/10/2026 — achado: site paralelo antigo `alna.cc` (WordPress, Hostnet) com erro de certificado/403; dono abriu chamado na Hostnet.
- 08/10/2026 ~19h — dono encerrou o Merchant Center antigo 5722404568 (sem comprovante).
- 09/10/2026 — Asaas trocada para a LTDA e verificada; Hostnet aplicou 301 de `www.alna.cc` (apex ainda com problema); pagador do Ads trocado para a LTDA;
  pop-up/cupons/Pix publicados; rascunho da 2ª contestação criado.

## Comandos de reverificação (Claude pode rodar)
```bash
for u in https://alna.cc http://alna.cc https://www.alna.cc https://alnacommerce.com http://alnacommerce.com https://alna.sale \
  https://store.alna.sale/atacado https://store.alna.sale/sobre https://store.alna.sale/contato https://store.alna.sale/politica-de-privacidade; do
  curl -s -o /dev/null -m 25 -w "$u -> %{http_code} %{redirect_url} (%{time_total}s)\n" "$u"; done
curl -s -o /dev/null -m 25 -A "AdsBot-Google (+http://www.google.com/adsbot.html)" -w "AdsBot atacado -> %{http_code} (%{time_total}s)\n" https://store.alna.sale/atacado
curl -s -o /dev/null -m 25 -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" -w "Googlebot atacado -> %{http_code} (%{time_total}s)\n" https://store.alna.sale/atacado
echo | openssl s_client -connect alna.cc:443 -servername alna.cc 2>/dev/null | openssl x509 -noout -subject -dates
```
