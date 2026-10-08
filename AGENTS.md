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
