# Pendências e ponto de retomada — loja ALNA

**Última atualização: 09/10/2026 (fim da tarde).** Este arquivo existe para qualquer sessão (em qualquer máquina) retomar exatamente de onde parou.
Ao começar uma conversa: ler este arquivo, `AGENTS.md`, a memória (`MEMORY.md`) e, se o assunto for Google Ads, `docs/google-ads-contestacao/STATUS.md`.
Ao terminar algo ou receber novidade do dono: atualizar aqui (e no STATUS.md do Google Ads), commit + push + espelho no Drive.

O dono pediu (09/10/2026) que o Claude atue como **sócio**: o que mais pesa agora é **reativar o Google Ads** (tráfego comprando) e **deixar o site rápido e
convertendo**. Prioridade 1 e 2 abaixo.

---

## PRIORIDADE 1 — Google Ads suspenso (campanha de atacado parada)
Painel completo: `docs/google-ads-contestacao/STATUS.md` (protocolo no `README.md`, texto em `RASCUNHO-2a-contestacao.md`, fatos em `EVIDENCIAS.md`).
Conta **635-244-4697** (informacoes.asm@gmail.com) suspensa por "phishing"; 1ª contestação recusada em 08/10; **2ª AINDA NÃO ENVIADA**.

**Para poder abrir a 2ª contestação falta:**
1. **R5 — Hostnet / `alna.cc`:** `www.alna.cc` OK, mas `http://alna.cc` dá 403 e `https://alna.cc` erro de certificado. Chamado respondido pelo dono, aguardando.
   Depois de **12/10/2026** a decisão passa a ser do dono (enviar sem essa linha, aceitando o ponto frágil).
2. **R7 — outras contas de Google Ads:** além da 635 existem **172-390-8582** ("Cancelado", aleqs.santos@gmail.com) e **962-967-1605**
   (asm.express.logistica@gmail.com, não ativa/sem gasto segundo o dono). Dono: nunca anunciaram os domínios da ALNA. **Faltam:** (3) conferir se usam o mesmo
   perfil de pagamentos (ID "Conta do Google Payments" em Faturamento > Configurações vs **2160-7426-3129-2039** da 635) e (4) se há faixa vermelha/violação em cada uma.
3. **R11 — texto final** sem `[CONFIRMAR]` (Claude fecha quando 1 e 2 estiverem resolvidos).
4. **Reverificar no dia do envio:** `/atacado` com AdsBot, Search Console (ações manuais/segurança), Navegação segura, comandos no fim do STATUS.md.
5. Perfil de pagamentos do Ads (pagador agora ALNA COMMERCE LTDA): observar se o Google pede verificação.
**Já feito:** identidade da empresa no site; pagador do Ads = LTDA; Asaas = CNPJ da LTDA (verificado por API); `alnacommerce.com` corrigido; Merchant Center antigo
5722404568 **encerrado** (08/10 ~19h, sem comprovante); site publicado no estado descrito.
**Só uma contestação** e honesta; nunca criar conta nova de Google Ads; nunca anunciar a ALNA por outra conta enquanto a 635 estiver suspensa.

**Depois que a conta voltar** (já planejado, não aplicar antes):
- Desligar "expansão do URL final" no Performance Max (para o anúncio não levar a páginas fora do `/atacado`).
- Negativar, uma a uma: fitness, academia, legging, treino, receita, grátis, usado.
- 2 títulos curtos (até 15 caracteres), 4 imagens, vídeo, sinais de público.
- Medir resultado: pedidos pagos por `utm_campaign = google-ads-atacado` (Supabase), custo de cupom e frete; pedir prints (Visão geral, termos de pesquisa, páginas de destino).
- Anúncios: nunca palavra TODA em maiúsculas (ALNA, OFF) — memória `feedback_google_ads_editorial_policy`.

**Lembretes agendados (se o app estiver aberto):** 10/10 09:00 e 13/10 09:00 — ambos já apontam para este painel.

---

## PRIORIDADE 2 — Velocidade e conversão (site rápido = mais compra)
Regra do dono: **toda mudança** traz antes "Espaço no back end" + "Efeito no carregamento"; Home ≤ 0,5 s. Notas PageSpeed celular de 08/10/2026: Home 99, Atacado 97,
Checkout 96, Produto 94, Carrinho 91, **Loja 70–81**.

1. **Imagens da `/loja` — APLICADO em 09/10/2026 (commit desta etapa); falta publicar no Lovable, conferir ao vivo e MEDIR o PageSpeed (3 vezes).** Proposta original: Medido ao vivo: 21 fotos de capa de 1200×1200 px, 46–316 KB cada (≈3 MB no total; as 2 primeiras 294 + 272 KB),
   exibidas com ~250 px. Proposta: servir a foto dos cartões em **400 px WebP** pela transformação da Supabase (`/storage/v1/render/image/public/...?width=400&quality=60`;
   testado: 301 KB → ~64 KB), `fetchpriority="high"` na primeira linha e **fallback para a foto original** se falhar. Espaço no back end: 0. Custo da função: US$ 5/1.000 imagens
   diferentes (100 incluídas no Pro; temos 21 produtos); **o plano Pro não foi confirmado** (funcionou nos testes). Banner do topo (`hero-ambassador-cutout`, 576 KB PNG): **dono pediu para NÃO converter**.
2. **Medir PageSpeed** (celular, 3 vezes) da `/loja` e do carrinho/checkout depois das últimas mudanças (pop-up central, caixa do carrinho, CEP do checkout). O dono envia os prints.
3. A função `useSiteSettings` falha **toda** se uma coluna não tiver permissão (aconteceu em 09/10). Ideia de robustez (não aplicada): consulta resiliente com valores padrão.

---

## AGUARDANDO O DONO (decisões e ações)
- [x] Ok para as imagens da loja (dado em 09/10; aplicar/publicar/medir acima).
- [ ] **Pedido de teste 8433b1a9** (Pix de 15/09, conta Asaas antiga, sem CPF gravado): cancelar? (`regenerate-pix` recusa por falta de CPF.)
- [ ] **Pix de teste sem pagar** (para provar o `regenerate-pix` ponta a ponta: QR existente → simular cobrança ausente → cobrança nova; limite 3, 30 dias).
- [ ] Respostas R7 (3) e (4), e acompanhar a Hostnet (R5).
- [ ] Daqui a 7–10 dias (por volta de 16–19/10): ver em Admin > Carrinhos abandonados quantos carrinhos foram salvos pela caixa vs sozinhos e decidir se a caixa "Salve seu carrinho" sai.
- [ ] Cupom de boas-vindas **2%**: se a adesão for baixa, subir em Admin > Cupons (BOAS_VINDAS) — a % aparece sozinha no pop-up.
- [ ] Contador: receber vendas em conta MEI de terceiro (antiga), regime tributário da LTDA, quem emite NF, destino do saldo da conta Asaas antiga (**manter a conta antiga até o saldo/pedidos liquidarem**).
- [ ] INPI: oposição à marca ALNA até 10/10/2026; checar a RPI depois (homônimo Alna Fitness).
- [ ] Como entregar "5% por responder a pesquisa" (o e-mail da pesquisa hoje não promete desconto).
- [ ] Opcional: MP4 de vídeo de produto (≈3 MB via ffmpeg local) + capa; miniaturas menores (coberto pelo item de imagens).
- [ ] Contato do WhatsApp para pedidos pendentes: o botão marca "enviado" só nos **carrinhos salvos**; pedidos pendentes ainda não têm marca (melhoria opcional).

## CLAUDE — verificações e acompanhamento
- [ ] Depois de cada publicação: "publiquei, confere se subiu" → conferir ao vivo (funções, páginas, pop-up). Antes de pedir publicação de coluna nova de `site_settings`: **GRANT SELECT por coluna e testar com a chave anônima** (memória `feedback_grant_colunas_site_settings`).
- [ ] Conferir as telas de admin que o Claude não consegue abrir (precisam de login): **Cupons** (4 caixas em "Cupons aleatórios": CARRINHO_ABANDONADO 5%, RECOMPENSA_INDICACAO 5%, CUPOM_EMAIL_MKT, BOAS_VINDAS 2%), **Carrinhos abandonados**, **Fluxo de E-mail** (fluxos 9 e 10), **E-mail marketing** — pedir print ao dono.
- [ ] Primeiras execuções reais: cron `process-abandoned-carts` (job 8, a cada 5 min; sem envio 22h–8h Brasília; apaga carrinhos com 90 dias parados); campanha de marketing de **27/10/2026** (primeira com cupom `NOVIDADE-xxxxxx` por pessoa); primeira indicação paga (cupom `INDIQUE-xxxxxx`, % espelhada).
- [ ] Horário de postagem da Melhor Envio: a correção de fuso foi **revertida** (o valor vem em UTC). Horário de **entrega** ainda não verificado — conferir no primeiro pedido entregue.
- [ ] Monitorar se o pop-up central da `/loja` reduz visitas orgânicas pelo Google (risco apontado; ele só aparece após interação humana). Se cair, reduzir para cartão no canto.
- [ ] Pedidos Pix pendentes antigos: `regenerate-pix` não refaz pedido sem CPF, com +30 dias, de cartão ou já pago.
- [ ] Hostnet: quando responderem, testar `http://alna.cc`, `https://alna.cc`, `www.alna.cc`, `/wp-admin` e MX/SPF.

---

## ESTADO DO SISTEMA (resumo do que existe, para não redescobrir)
**Cron (pg_cron, UTC):** `process-cart-reminders` */5 (pedido pendente: 10 min e 24 h) · `sync-delivery-status` */10 · `process-post-purchase-nps` hora cheia · `send-weekly-marketing` diário 10:00 (campanha a cada 20 dias; próxima 27/10) ·
`sync-skus-daily` · `payment-health-check` a cada 6 h · `keep-warm-atacado` */5 · **`process-abandoned-carts` */5 (job 8)**.

**Cupons (tabela `coupons`):** até 3 por pedido, percentuais somam (sem teto além de 100%). Cupons-**modelo** (`is_model`; o cliente não digita; geram um código por pessoa, uso único, ligado ao e-mail, contados por `source_coupon_id`):
`CARRINHO_ABANDONADO` (5%; e-mails de 24 h do carrinho salvo e do pedido pendente; código `VOLTA-…`, 7 dias, 1 a cada 30 dias por e-mail) · `RECOMPENSA_INDICACAO` (5%; `INDIQUE-…`, 30 dias, um por indicação paga; % espelhada em `site_settings.referral_reward_percent`) ·
`CUPOM_EMAIL_MKT` (`NOVIDADE-…`, 20 dias, por campanha) · `BOAS_VINDAS` (2%; `BEMVINDO-…`, 30 dias; só quem nunca comprou; % em `site_settings.welcome_coupon_percent`, `null` desliga o pop-up).
Cupons normais: ALNA10%OFF, ALNA5%OFF (atacado), NOVIDADE5%OFF.

**Carrinho abandonado:** tabela `abandoned_carts` (1 linha por e-mail); funções `save-cart`, `get-saved-cart`, `process-abandoned-carts`; caixa "Salve seu carrinho" só para quem ainda não deixou e-mail; salvamento automático para quem já deixou e-mail e aceitou lembretes (pop-up, caixa, checkout); lembrete 1 h (sem cupom) e 24 h (cupom); link `/carrinho?c=<token>[&cupom=...]` reabre o carrinho; Admin > Marketing > Carrinhos abandonados (botão WhatsApp via `wa.me`, uma mensagem por carrinho, contadores).
**Pop-up de boas-vindas:** só em `/loja`; após carga + 8 s + interação; centralizado, fecha só no X; função `welcome-coupon`; e-mail `welcome_coupon`; lista de marketing com origem `popup_loja`.
**Pix:** função `regenerate-pix` + `OrderStatusPanel` ("Gerando o seu Pix..."): reaproveita QR existente; senão cria cobrança nova na Asaas atual (cancela a antiga se viva); máx. 3 por pedido.
**Pagamentos:** Asaas da LTDA (chave em Admin > Conexões `payment_gateway`; webhook `asaas_webhook`); `payment-health-check` monitora chave/webhook. Conta Asaas antiga (MEI) ainda existe — não encerrar até liquidar.
**Checkout:** frete calculado ao digitar o CEP (8 números); e-mail pré-preenchido; "Confirme o e-mail" vazio de propósito.
**Alterações no banco feitas pelo Claude** ficam em `docs/db-changes-applied-by-claude.md` (não estão em `supabase/migrations/`).

**Commits desta etapa (09/10/2026):** ecfea6a (CEP do checkout) · c40c785 (carrinho abandonado) · f1b6c15 (reversão do horário Melhor Envio) · 21efff5/2265834/2812bd5 (cupons aleatórios, indicação, marketing) ·
15eee79 · c1ba1f1 · f10c360 · 173584b (caixa do carrinho, pop-up, salvamento automático, pop-up central) · 44647ed (GRANT em `site_settings`) · 311e835 e seguintes (pasta do Google Ads).

## Regras permanentes do dono (resumo; detalhes no AGENTS.md e na memória)
Sócio: antes de aplicar, trazer benefícios/riscos em linguagem simples; nunca aplicar sem "ok, aplique"; olhar de cliente novo; nunca adivinhar (confirmar na documentação oficial,
dizer o que é confirmado e o que é inferência); toda mudança com "Espaço no back end" + "Efeito no carregamento"; sincronizar status/textos em todas as telas; após cada commit: push + espelho no Drive;
dono publica no Lovable e pede "publiquei, confere se subiu"; nunca pedir/aceitar chaves ou tokens no chat; não reescrever histórico do git (usar reversão).
