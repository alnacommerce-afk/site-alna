# Painel de situação — 2ª contestação do Google Ads

**Última atualização:** 13/10/2026 (manhã)

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
| R5 | `alna.cc`: `https://alna.cc` com certificado válido e `http://alna.cc` sem 403, redirecionando para `https://alna.sale/` | Sim (até decisão do dono) | **FEITO (verificado pelo Claude em 13/10/2026 09:15; reverificar no dia do envio)** — `http`/`https://alna.cc` → 301 → `https://www.alna.cc` → 301 → `https://alna.sale/`; cert CN=alna.cc válido até 17/11/2026 | Hostnet / dono cobra | 09/10 ~13:40: `www.alna.cc` OK (301); `http://alna.cc` = 403; `https://alna.cc` = erro de certificado (SEC_E_WRONG_PRINCIPAL, cert `*.f1.k8.com.br`). Dono respondeu o chamado e aguarda. O dono diz que redireciona "corretamente" no navegador, mas `http://alna.cc` dá erro |
| R6 | Conta antiga e duplicada do Merchant Center (5722404568) tratada | Sim | **FEITO** — encerrada pelo dono por volta das 19h de 08/10/2026 (horário aproximado, sem comprovante) | Dono | Perfil do Chrome dessa conta: "sem acesso"; ativa é "Alna" 5856969666 (store.alna.sale) |
| R7 | Outras contas de Google Ads do dono (para responder o formulário com honestidade) | Não bloqueia SE as 4 respostas abaixo forem "não" | **Dono afirma (09/10 noite): para o negócio ALNA só vale a 635-244-4697 (informacoes.asm@gmail.com).** Existem também 172-390-8582 ("Cancelado", aleqs.santos@gmail.com) e 962-967-1605 (asm.express.logistica@gmail.com, status desconhecido). **RESPOSTAS DO DONO (09/10 noite): (1) nunca anunciaram os domínios da ALNA = NÃO; (2) a 962-967-1605 ativa/gastando = NÃO; (3) mesmo cartão/perfil de pagamentos = NÃO SABE; (4) violação/suspensão = NÃO SABE. Faltam (3) e (4): conferir pelo ID da "Conta do Google Payments" em Faturamento > Configurações de cada conta (comparar com 2160-7426-3129-2039 da 635) e pelo banner vermelho/Notificações no topo de cada conta.** Perguntas originais: (1) alguma das duas já anunciou alna.sale, store.alna.sale, alnacommerce.com ou alna.cc? (2) a 962-967-1605 está ativa/gastando e para qual negócio? (3) usam o mesmo perfil de pagamentos/cartão ou pagador da 635? (4) alguma teve violação de política ou foi suspensa (a 172 foi cancelada por quem e quando)? Se todas as respostas forem "não": R7 = FEITO, responder "Não" ao formulário sobre outras contas para o mesmo site e NÃO precisa citar as outras no texto. Se qualquer resposta for "sim": declarar e corrigir as respostas da 1ª contestação | Dono | Respostas de memória bastam; prints só se houver dúvida. NÃO pausar/cancelar/reativar nada, NÃO anunciar a ALNA por outra conta e NÃO usar "Criar nova conta do Google Ads" |
| R8 | Site publicado no Lovable no estado descrito no texto | Sim | **FEITO** em 09/10 (pop-up, cupons, Pix); **repetir** a cada nova mudança | Dono publica / Claude confere | "publiquei, confere se subiu" |
| R9 | Destino do anúncio `/atacado` responde 200 rápido, inclusive com AdsBot, sem formulário | Sim | **FEITO** em 09/10 (200, ~1,5 s); **reverificar no dia do envio** | Claude | Comandos no fim deste arquivo |
| R10 | Search Console sem ação manual / Navegação segura limpa | Sim | **FEITO** em 08/10; **reverificar no dia** (dono manda print) | Dono | Search Console > Ações manuais e Problemas de segurança; transparencyreport.google.com/safe-browsing/search |
| R11 | Texto final sem `[CONFIRMAR]`, só com fatos FEITO | Sim | **PENDENTE** (rascunho pronto) | Claude | `RASCUNHO-2a-contestacao.md` |
| R12 | Cartão CNPJ à mão (caso o Google peça) | Não | Dono tem o arquivo | Dono | — |
| R13 | Perfil de pagamentos sem pendência de verificação após a troca do pagador | Não (observar) | **A observar** | Dono | Notificações do Google Ads / Pagamentos |

## Pontos de honestidade (não afirmar no texto)
- **Outras contas de Google Ads:** existem a 172-390-8582 (cancelada, aleqs.santos@gmail.com) e a 962-967-1605 (asm.express.logistica@gmail.com, status ainda
  desconhecido). Na 1ª contestação a resposta foi "Não" para "várias contas do Google Ads para o mesmo site" e "contas pessoais SEM Google Ads". Na 2ª,
  declarar o que existir e corrigir as respostas, conforme o uso real de cada uma (mesmo negócio/site ou outro propósito). Se a 962-967-1605 estiver ATIVA,
  nunca usá-la para anunciar o site da ALNA enquanto a 635-244-4697 estiver suspensa (seria contornar a suspensão). Confirmar tudo com o dono antes (ver R7).
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
- 09/10/2026 (fim da tarde) — o dono mostrou a outra Conta do Google (aleqs.santos@gmail.com): tem a conta de Google Ads **172-390-8582, "Cancelado"**.
  Muda o item R7: ela precisa ser declarada no formulário/texto (a 1ª contestação respondeu "Não" para outras contas de Google Ads do mesmo site).
- 09/10/2026 (noite) — o dono mostrou mais duas contas: informacoes.asm@gmail.com ("Alna Store") tem só a 635-244-4697; asm.express.logistica@gmail.com ("Alna Commerce")
  tem a conta de Google Ads **962-967-1605** (status não visível). Total conhecido: 3 contas de Google Ads do dono.
- 09/10/2026 (noite) — dono: "para nós vale apenas a do e-mail informacoes.asm@gmail.com". Registrado; ficam 4 perguntas de confirmação no R7.
- 09/10/2026 (noite) — dono respondeu às 4 perguntas do R7: (1) não, (2) não, (3) não sabe, (4) não sabe. Itens 3 e 4 dependem de olhar Faturamento e o topo de cada conta.
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

## Atualização 12/10/2026 (manhã) — retomada
- Reverificado às 09:50: `/atacado` 200 (0,3–1,8 s, inclusive AdsBot); `alnacommerce.com` 301 ok; `www.alna.cc` 301 ok; **`http://alna.cc` = 403 e `https://alna.cc` = certificado errado (`*.f1.k8.com.br`) — SEM mudança**; sem resposta da Hostnet registrada.
- **Hoje (12/10) vence o prazo que combinamos para o R5:** a decisão é do dono — (a) cobrar a Hostnet de novo, ou (b) enviar sem a linha do alna.cc (remover do texto e registrar aqui).
- Continuam pendentes: R7 itens 3 e 4 (ID do perfil de pagamentos e faixa de violação das contas 172-390-8582 e 962-967-1605) e R11 (texto final). Nada novo informado pelo dono desde 09/10 (noite).
- Quando o dono responder, recontar: ainda falta = R5 (decisão), R7 (3 e 4), reverificação no dia, texto final.

## Atualização 13/10/2026 (manhã) — retomada
- **R5 resolvido:** `curl` sem `-k`: `http://alna.cc` 301 → `https://www.alna.cc/`; `https://alna.cc` 301 → `https://www.alna.cc/` (certificado válido, CN=alna.cc, 19/08–17/11/2026); `www.alna.cc` 301 → `https://alna.sale/`; `/wp-admin` redireciona. Ninguém avisou a data da correção (Hostnet): registrar com o dono, se ele souber. Não afirmar horário exato no texto.
- Verificado também: `alnacommerce.com` 301 → alna.sale; `/atacado` (loja) 200, AdsBot 200 em 0,45 s; `/loja` e `/sobre` 200.
- **Ainda falta para "pode abrir":** R7 itens 3 e 4 (ID do perfil de pagamentos e faixa de violação das contas 172-390-8582 e 962-967-1605 — resposta do dono), R11 (texto final, Claude fecha: tirar a linha do alna.cc como pendência e transformá-la em fato FEITO) e a reverificação no dia do envio (incluindo Search Console/Navegação segura, prints do dono).
- Novidades do Site para citar (todas publicadas): pop-up de boas-vindas, carrinho salvo, Pix/cartão pela Asaas da LTDA, frete grátis único em Configurações, Pix 4% só sobre produtos (irrelevante para o Google).

## Levantamento 13/10/2026 (pedido do dono: "faça o levantamento e me ajude a criar a contestação")
- Dono: "o link https://alna.cc já está funcionando" — confirmado por `curl` (R5 FEITO). Hostnet corrigiu; data não informada.
- Reverificado agora (13/10): domínios (alna.cc, www, alnacommerce.com, alna.sale) ok; `/atacado` 200 para AdsBot, AdsBot-Mobile e Googlebot (9/9, 0,4–1,0 s), sem `<form>`/senha; `/sobre`, `/loja` e `alna.sale` com razão social + CNPJ + endereço; privacidade, termos e troca/devolução 200 e no rodapé; cron `keep-warm-atacado` ativo (288 execuções/24 h).
- **Fonte oficial lida hoje** (support.google.com/google-ads/answer/9841640 e /15936970): o envio é pelo link "Fale conosco" do aviso de suspensão; 1 contestação por vez; recusada pode ser refeita; **"antes de contestar, garanta que todas as contas vinculadas (atuais ou antigas) e relacionadas cumprem as políticas"** — por isso R7 (3 e 4) deixa de ser "boa prática" e passa a ser o que falta de verdade.
- **Ainda falta (bloqueia o envio):** R7 (3) e (4), com o dono (2 conferências de ~5 min nas contas 172-390-8582 e 962-967-1605). **Depois:** reverificação no dia + prints do Search Console/Navegação segura (só verificado em 08/10).
- Texto final v2 em `RASCUNHO-2a-contestacao.md` (sem `[CONFIRMAR]`, só o bloco R7 a escolher).

## Atualização 13/10/2026 (prints do dono — R7)
- **R7 (3) perfil de pagamentos:** a 962-967-1605 usa o perfil **3738-1352-6056-2414**, **diferente** do da 635 (2160-7426-3129-2039). Mas o **pagador da 962 é ALEXANDER DOS SANTOS MACHADO (pessoa física)** — a mesma pessoa que era o pagador da 635 antes da troca para a LTDA. Não são o mesmo perfil, porém há identidade em comum (o Google pode relacioná-las).
- **R7 (4) violação:** a 962 mostra "Conta pausada — prazo de verificação passou; conclua a verificação do anunciante" (**não é suspensão por política**, é verificação do anunciante). O banner indica **1/3 avisos**: os outros 2 não foram vistos. A 172-390-8582 **ainda não foi conferida**.
- **A 635:** mesmo estado (suspensa, contestação de 8/10 recusada, pagador LTDA, nenhum aviso novo no banner; o sino tem aviso que não foi aberto).
- **Ainda falta:** (a) ver os outros 2 avisos da 962 (setas < > no banner ou o sino); (b) conferir a 172-390-8582 (ID do perfil de pagamentos + banner); (c) dono confirmar se a 962 **alguma vez veiculou anúncio** e para qual negócio ela existe; (d) abrir o sino da 635 e ver se há pedido de verificação do anunciante (o Google diz que alguns anunciantes precisam concluir a verificação antes de contestar). **Não mexer na 962** (não completar verificação, não pausar, não cancelar) sem decisão do dono.
