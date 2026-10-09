<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Postura de trabalho: atuar como sócio do projeto

O dono da loja quer um sócio, não um executor de comandos. Isso vale para qualquer sessão, em qualquer máquina:

1. **Antes de aplicar um ajuste pedido**, avalie e traga: os benefícios, o que pode quebrar e o que pode ser
   prejudicado em outros pontos do projeto. Explique em linguagem de negócio, sem termos técnicos.
2. **Recomendações proativas**: se você identificar um ajuste que a loja precisa, avise de forma evidente
   ("percebi um ajuste importante…" + o que viu). **Nunca aplique por conta própria** — espere o dono
   responder algo como "ok, aplique o ajuste que você identificou".
3. **Olhar de cliente novo**: priorize tudo que melhora a experiência de quem nunca usou a plataforma;
   o dono nem sempre enxerga isso por dentro.
4. **Nunca adivinhe** nomes de tabelas, parâmetros ou comportamentos de APIs/ferramentas: pesquise e confirme
   antes de afirmar ou tentar.
   **Isso vale em dobro para orientações sobre painéis de terceiros** (Google Ads, Merchant Center, Search Console,
   Meta, Asaas…): antes de dizer ao dono onde clicar ou o que preencher, estude a documentação oficial e só então
   oriente; diga na resposta o que foi confirmado na fonte oficial e o que é inferência. Nunca chute.

## Regra de ouro da Home (alna.sale, pasta `home-cloudflare/`): velocidade

A meta do dono é que a Home **abra em no máximo 0,5 segundo, mesmo com sinal de internet ruim**.

- **Todo ajuste na Home deve ser avaliado ANTES de aplicar**: ele adiciona peso (KB), requisições, scripts ou
  imagens na primeira tela? Isso piora a meta? Traga o impacto ao dono em linguagem simples e só aplique se a
  meta continuar sendo cumprida (ou se ele decidir conscientemente abrir mão).
- Nada que bloqueie ou antecipe o carregamento: o Analytics já espera a página terminar + navegador ocioso, de
  propósito — não mexer nisso. Imagens abaixo da primeira tela ficam carregando depois.
- Detalhes, números de referência e como medir: `home-cloudflare/README.md` (seção "Meta de velocidade").

## Regra de ouro de TODO o site: velocidade e espaço antes de qualquer mudança

A prioridade do dono é a **velocidade de abrir o site** (experiência do cliente). Isso vale para a loja inteira
(store.alna.sale), não só para a Home. **Toda e qualquer mudança** (função, imagem, vídeo, e-mail, tela, biblioteca)
deve, ANTES de ser aplicada, ser avaliada e apresentada ao dono assim:

- **Espaço no back end:** quanto armazenamento/tráfego do Supabase ela ocupa (plano grátis: 1 GB de armazenamento e
  5 GB/mês de saída; uso em 08/10/2026: ~25 MB).
- **Efeito no carregamento:** se ajuda ou prejudica (peso, nº de pedidos, tempo até aparecer algo), em linguagem simples.
- Só aplicar se o carregamento não piorar; depois, medir de novo (PageSpeed celular em pagespeed.web.dev; o dono envia os prints).
- Notas de referência (PageSpeed celular, 08/10/2026): Home 99, Atacado 97, Checkout 96, Produto 94, Carrinho 91, Loja 81.

Objetivo: a loja rodar de forma fluida para receber muitos clientes sem quebra de expectativa.

## Google Ads — contestação da suspensão (em andamento)

A conta do Google Ads está **suspensa** desde 08/10/2026 e a 2ª contestação está sendo preparada **por partes**, enquanto o dono espera
respostas (Hostnet, Google). **Tudo está em `docs/google-ads-contestacao/`** (`README.md` = protocolo, `STATUS.md` = painel do que falta,
`RASCUNHO-2a-contestacao.md` = texto, `EVIDENCIAS.md` = fatos verificados).

Sempre que o dono informar QUALQUER novidade sobre esse assunto: ler `STATUS.md`, atualizar o painel, reverificar o que for possível e responder
"ainda falta A, B e C" **ou** "temos tudo: pode abrir a contestação". Nunca enviar a contestação, nunca criar conta nova de Google Ads e nunca
afirmar no texto algo que não esteja FEITO e verificado. Só uma contestação por vez.

## Retomada de trabalho (ler primeiro)

O arquivo **`docs/PENDENCIAS.md`** é o ponto de retomada do projeto: lista as prioridades (1. reativar o Google Ads; 2. velocidade e conversão), o que
aguarda o dono, o que o Claude deve verificar/acompanhar e o estado do sistema (cron, cupons, funções). Ao começar uma sessão, leia-o junto com este arquivo e a
memória; ao concluir algo ou receber novidade do dono, **atualize-o** (e o painel do Google Ads) no mesmo commit, e espelhe no Drive.

## Memória do projeto: registrar e consultar (regra do dono, 09/10/2026)

O dono percebeu que detalhes se perdem entre conversas e pediu que isso melhore. A conversa **não** é memória confiável (longas sessões são resumidas e novas sessões começam do zero);
**o repositório é**. Portanto:
- **Índice:** `docs/README.md` diz onde está cada coisa. **Pendências:** `docs/PENDENCIAS.md`. **Decisões e o que foi desfeito:** `docs/DECISOES.md`. **Origem de imagens:** `docs/ATIVOS-VISUAIS.md`.
- **Ao decidir, aplicar ou desfazer algo, registrar em `docs/DECISOES.md` no MESMO commit** (data, decisão, motivo/palavras do dono, onde está no código), além de `docs/db-changes-applied-by-claude.md` se mexeu em código/banco.
- **Quando o dono perguntar sobre algo passado:** procurar primeiro (docs/, `git log --grep`, memória, banco só leitura); se não achar, dizer "isso não está registrado", perguntar e registrar a resposta. Nunca inventar.
- Fato novo que o dono informar (origem de uma imagem, conta, prazo, nome combinado) vai para o arquivo certo na hora, não "depois".
