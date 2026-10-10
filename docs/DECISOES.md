# Livro de decisões — por que as coisas são como são

Para responder "por que fizemos assim?" ou "o que combinamos sobre X?" sem depender de memória de conversa. **Regra:** toda decisão do dono (ou fato que ele pode
perguntar depois) é registrada aqui **no mesmo commit** em que for aplicada. Formato: data — decisão — motivo/palavras do dono — onde está no código/arquivos.
Quando algo for desfeito, **não apagar**: marcar como "DESFEITO em <data>" e dizer por quê (evita reaplicar sem querer).

## Como o dono quer que eu trabalhe
- **08/10** — Antes de qualquer mudança: "Espaço no back end" (Supabase grátis: 1 GB de armazenamento e 5 GB/mês de saída; ~25 MB usados em 08/10) + "Efeito no carregamento". Só aplicar se o carregamento não piorar. Home ≤ 0,5 s. → `AGENTS.md`.
- **Sempre** — Sócio: trazer benefícios/riscos em linguagem simples, nunca aplicar sem "ok, aplique", olhar de cliente novo, nunca adivinhar (confirmar em documentação oficial e dizer o que é confirmado/inferido).
- **Sempre** — Sincronizar status/etapas/textos do pedido em /conta, /pedido, admin, e-mails e mapa de fluxos.
- **Sempre** — Dono é aprendiz: tentar resolver sozinho primeiro; se precisar dele, passo a passo curto (PowerShell 5.1, sem `&&`) e pedir print. Nunca pedir/aceitar chave ou token no chat.
- **Sempre** — Depois de cada commit: push + espelho no Drive. O dono publica no Lovable e diz "publiquei, confere se subiu". Não reescrever histórico do git (usar reversão).
- **09/10** — Tudo pendente fica em `docs/PENDENCIAS.md`; Google Ads em `docs/google-ads-contestacao/`. Dono: "como meu sócio isso é de extrema importância" (Google Ads rodando + site com boa performance e tráfego comprando).

## Pedidos, e-mails e textos
- **07/10** — E-mails: "pedido preparado" (ao gerar etiqueta) e "deixado no ponto de coleta + rastreio"; cancelado e estorno; pesquisa de satisfação com resultado na própria página e botão grande "Voltar para a loja". Usar "ponto de coleta" (não "agência"). Cliente **não** recebe link da etiqueta.
- **07/10** — Selo do pedido "Preparado para envio" até o ponto de coleta bipar. Conferência de rastreio a cada 10 min.
- **07/10** — Agradecimento pós-pesquisa descontinuado; marketing a cada 20 dias para quem deu nota 4–10; nota ≥5 mostra link de indicação.
- **09/10** — Horário de postagem da Melhor Envio vem em **UTC**. Um "ajuste para Brasília" foi aplicado e **DESFEITO** (provado pela ordem dos fatos). O atraso do aviso "postado" (horas) é da própria Melhor Envio. Horário de entrega ainda não verificado.
- **09/10** — CEP do checkout: frete calculado ao digitar 8 números (com/sem hífen), em paralelo com a busca do endereço, com "Tentar de novo".

## Cupons
- **08/10** — Até **3 cupons por pedido, percentuais somam, sem teto** além de 100%. Marketing a cada 20 dias.
- **09/10** — **Cupons aleatórios = modelo + um código por pessoa** (uso único, ligado ao e-mail, contado por modelo). Modelos e nomes (escolhidos pelo dono): `CARRINHO_ABANDONADO` (5%; os DOIS e-mails de 24 h: carrinho salvo e pedido pendente; `VOLTA-…`, 7 dias, um a cada **30 dias** por e-mail),
  `RECOMPENSA_INDICACAO` (5%; `INDIQUE-…`, 30 dias, um por indicação paga; % espelhada em Minha Conta e na pesquisa), `CUPOM_EMAIL_MKT` (`NOVIDADE-…`, 20 dias, por campanha), `BOAS_VINDAS` (2%; `BEMVINDO-…`, 30 dias; só quem nunca comprou).
  Nomes sem acento (código de cupom). O cliente nunca digita o modelo. Mudar a % vale só para os novos. Cupons normais (mesmo código para todos): ALNA10%OFF, ALNA5%OFF (atacado), NOVIDADE5%OFF.
- **09/10** — Abandono: o 1º lembrete **sem cupom**, o 2º **com cupom** (evita ensinar o cliente a abandonar para ganhar desconto).

## Carrinho abandonado e captação de e-mail
- **09/10** — E-mail obrigatório + WhatsApp opcional no carrinho; lembrete 1 h (sem cupom) e 24 h (com cupom); nada entre 22h e 8h (padrão que propus, dono não vetou); máx. 2 lembretes por ciclo, novo ciclo só após 7 dias.
- **09/10** — **WhatsApp: só manual**, uma mensagem por carrinho (botão no admin marca "enviado"); WhatsApp **não** é pedido no pop-up (só no checkout). Motivo: API automática exige provedor pago e arrisca bloqueio do número.
- **09/10** — Checkout abre com e-mail pré-preenchido; o campo "Confirme o e-mail" fica **vazio de propósito**.
- **09/10** — Caixa "Salve seu carrinho" só para quem ainda não deixou e-mail; quem já deixou e aceitou lembretes tem o carrinho salvo sozinho. **Reavaliar em 7–10 dias** se a caixa sai.
- **09/10** — Pop-up de boas-vindas **só na `/loja`** (não na Home, não na `/atacado`); centralizado; **fecha só no X**; só aparece após página carregada + 8 s + interação humana (assim robôs do Google não o veem; **não** identificar robô por nome = evitar cloaking); texto "Seja bem-vindo ao nosso site! 💚 Preparamos um mimo para você que vem pela 1ª vez…". Dono: pop-up é para estimular vendas; na contestação do Google Ads descrever com honestidade.

## Pix e pagamentos
- **08–09/10** — Asaas trocada para a conta da **ALNA COMMERCE LTDA** (antes MEI de terceiro). Manter a conta antiga até liquidar saldos/pedidos. Contador ainda não consultado.
- **09/10** — Pedido Pix pendente sem cobrança pagável ganha **novo Pix automático** na conta atual (máx. 3, até 30 dias, nunca para cartão). Pedido de teste 8433b1a9 (sem CPF) não pode ser refeito: decidir cancelar.

## Imagens e vídeo
- **08/10** — **Não converter o banner do topo da /loja para WebP**; atacado sem efeito de "fade" (dono: "se não impacta a velocidade pode deixar sem degradê"). Foto principal do produto com prioridade.
- **08/10** — Vídeo de produto: MP4 próprio (≤ 8 MB, ~3 MB ideal) carregado só no clique, com capa escolhida no admin; sem campo de link do YouTube.
- **09/10** — Redimensionar as fotos dos cartões da /loja foi aplicado e **DESFEITO** ("não gostei"). **Não reaplicar.** Fotos dos cartões ficam como estavam.
- **09/10** — Banner do topo (`hero-ambassador-cutout.png`) **compactado sem perda** (590 → 231 KB, mesmo PNG, 1344×752, pixels idênticos). Ver `docs/ATIVOS-VISUAIS.md` (origem da imagem e rótulo de IA mantido).
- **08/10** — Verde da loja pública `#15803d` (contraste). Home e e-mails não mudam de cor.

## Empresa, domínios e Google
- **08/10** — Identidade no site: **ALNA COMMERCE LTDA, CNPJ 57.135.009/0001-27, R. Luiz Rafael Flor, 450, Nova Brasília, Brusque/SC, CEP 88.352-553**; o complemento (apto) **não** é publicado (opção A do dono). → `src/lib/company.ts`.
- **08–09/10** — Domínios antigos: `alnacommerce.com` redireciona para alna.sale; `alna.cc` (WordPress da Hostnet, projeto paralelo) será redirecionado a `https://alna.sale/` (e-mail contato@alna.cc, MX/SPF e /wp-admin **não** podem ser mexidos).
- **08–09/10** — Google Ads: **uma** contestação honesta por vez, nunca criar conta nova, nunca anunciar por outra conta; pagador do Ads trocado para a LTDA; Merchant Center antigo 5722404568 **encerrado** (08/10 ~19h); para o negócio só vale a conta 635-244-4697 (informacoes.asm@gmail.com); outras contas (172-390-8582 cancelada, 962-967-1605) segundo o dono não têm relação. → `docs/google-ads-contestacao/`.
- **08/10** — Anúncios: nunca palavra TODA em maiúsculas (ALNA, OFF).

## Regras técnicas aprendidas
- **09/10** — Coluna nova de `site_settings` lida pela loja precisa de `GRANT SELECT` por coluna a `anon, authenticated` na mesma migração + teste com a chave anônima (a falta derrubou as configurações da loja por ~1,5 h).
- **09/10** — Mudanças de banco feitas pelo Claude ficam em `docs/db-changes-applied-by-claude.md` (não em `supabase/migrations/`). Funções de servidor só valem depois do dono publicar no Lovable.

## Ferramentas internas
- **10/10** — Organizador de Etiquetas PDF **não pertence ao site-alna** (dono: "é um projeto totalmente novo à parte"). Chegou a ser publicado aqui (505cb99) e foi **DESFEITO** em seguida (reversão). Vive em github.com/alnacommerce-afk/etiqueta100x150. Não recolocar neste repositório.
