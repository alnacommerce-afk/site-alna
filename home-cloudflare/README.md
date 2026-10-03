# Home da Alna Commerce (Cloudflare)

Página estática (HTML + CSS + um script de ~1 KB), sem React e sem chamadas a banco de dados.
Serve `alna.sale`. Todo o resto do site (loja, carrinho, conta, sobre, contato) fica em
`store.alna.sale`, no app do Lovable.

## Por que a ordem importa

O Lovable serve **um único domínio principal** por projeto: todo outro domínio conectado a ele
apenas redireciona para o principal. Por isso, para `alna.sale` mostrar esta Home e
`store.alna.sale` mostrar a loja, o principal do Lovable precisa ser `store.alna.sale` e
`alna.sale` precisa sair do Lovable e ir para o Cloudflare.

O Cloudflare Pages só assume um domínio raiz (`alna.sale`) se o **DNS** dele estiver no Cloudflare.
Hoje o DNS do `alna.sale` é gerenciado pelo Lovable (name.com).

## Passo a passo

1. **Confirme com o suporte do Lovable** se é possível trocar os nameservers do `alna.sale` (ou
   transferi-lo) para o Cloudflare. Sem isso, os passos abaixo não funcionam.
2. No Lovable → Domínios, marque `store.alna.sale` como **principal** (estrela). A partir daí
   `alna.sale`, `www.alna.sale` e `alnacommerce.com` passam a redirecionar para o store (mantendo o
   caminho), o que serve de ponte até a Home subir no Cloudflare.
3. No Cloudflare, adicione o site `alna.sale` (plano Free) e **recrie os registros** que hoje estão
   no DNS do Lovable:
   - `A store` → `185.158.133.1` (nuvem cinza, só DNS)
   - `TXT _lovable.store` → o valor `lovable_verify=…` que o Lovable mostra
   - os registros do Resend (DKIM, SPF, retorno) do domínio `alna.sale`
4. Troque os nameservers do `alna.sale` para os dois do Cloudflare e espere ficar **Active**.
   Confirme que `store.alna.sale` continua abrindo antes de seguir.
5. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → repositório `site-alna`.
   Framework preset **None**, build command **vazio**, output directory **`home-cloudflare`**.
6. Em Custom domains do projeto Pages, adicione `alna.sale` e `www.alna.sale`.
7. No Lovable, remova `alna.sale` e `www.alna.sale` (o `store.alna.sale` segue como principal).

## alnacommerce.com → alna.sale

`alnacommerce.com` é a marca antiga; hoje só existe para levar quem ainda o usa até `alna.sale`.
Concluído em 28/09/2026, como zona própria no Cloudflare (registro do domínio continua na Hostnet,
só o DNS mudou):

1. Domínio adicionado como um **site novo** no Cloudflare (plano Free) — zona própria, separada da
   de `alna.sale`, mas na mesma conta.
2. Nameservers do domínio trocados na Hostnet (Registro de domínios > Editar DNS) de
   `nsa1`–`nsa6.hostnet.com.br` para os dois que o Cloudflare atribuiu a essa zona
   (`julissa.ns.cloudflare.com` e `morgan.ns.cloudflare.com` — cada zona nova pode receber um par
   diferente; confira o painel antes de reusar estes).
3. Registros `A` de `alnacommerce.com` e `www` apontados para `192.0.2.1` (IP de exemplo — nunca
   respondido de verdade) com **Proxied** (nuvem laranja) ligado. O IP não importa: com o proxy
   ligado a requisição nunca sai do Cloudflare, então a regra do passo 4 responde antes de tentar
   alcançar uma origem. Os registros `TXT` de e-mail (`_dmarc`, `resend._domainkey`) e o `A ftp`
   (Hostnet) foram mantidos como estavam.
4. Rules > Redirect Rules > Create rule, wildcard pattern:
   - Request URL: `https://*alnacommerce.com/*`
   - Target URL: `https://alna.sale/${2}` (`${1}` seria o `www.`/vazio antes do domínio)
   - Status: 301, "Preserve query string" ligado
5. SSL/TLS > Edge Certificates > **Always Use HTTPS** ligado, para o acesso por `http://` (sem "s")
   também cair nessa regra em vez de dar timeout.

## Estrutura

- `index.html` — a Home inteira (CSS e script embutidos, para a primeira pintura sem requisições extras).
- `assets/` — imagens (WebP) e logo. O logo também é usado nos e-mails da loja.
- `_headers` — cache e cabeçalhos de segurança.
- `robots.txt`, `sitemap.xml` — do domínio raiz.

## Como os blocos aparecem

Cada bloco (`.blk`) começa invisível e entra em fila, na ordem da página: espera a imagem do bloco
carregar, faz fade + deslize, e só então libera o próximo. Sem JavaScript (ou com "reduzir
movimento" ativo) tudo aparece direto.

## Meta de velocidade (regra do dono — 03/10/2026)

**A Home deve abrir em no máximo 0,5 s, mesmo com sinal ruim.** Antes de qualquer ajuste aqui, avaliar o
impacto na meta (peso, nº de requisições, scripts, imagens na primeira tela) e avisar o dono antes de aplicar.

O que já protege a meta (não desfazer): HTML com CSS e JS embutidos (zero requisição bloqueante), só o logo e
a imagem principal carregam de cara, banners abaixo da dobra carregam depois, imagens em WebP com cache de
7 dias, e o GA4 só carrega depois do `load` + navegador ocioso (por isso a contagem de visitas muito rápidas
pode ficar um pouco abaixo do real — troca aceita de propósito para não pesar na abertura).

**Medição de referência (03/10/2026, computador do dono, conexão boa):** primeiro byte ~0,11 s, página pronta
~0,22 s, 5 requisições, ~65 KB (HTML ~23 KB + logo ~39 KB + imagem principal ~25 KB).

**Limite físico a ter em mente:** em sinal fraco de verdade (perfil "4G lento": ~150 ms de ida e volta e
~1,6 Mbps), só abrir a conexão com o servidor (DNS + TCP + TLS + pedido) já consome ~4 idas e voltas, ou seja,
~0,6 s numa **primeira visita**, antes de chegar qualquer byte. Em visitas seguintes (conexão e imagens já em
cache) a estimativa é ~0,3 s. Portanto, em sinal muito ruim a primeira visita tende a passar de 0,5 s por
causa da rede, não do site — o que controlamos é não piorar: manter o total de bytes e requisições da
primeira tela o menor possível. Estimativa feita por cálculo a partir de medições reais de conexão; ainda não
foi medida num celular de verdade.

**Como medir:** abrir a Home num celular real com 4G fraco (ou DevTools > Network > "Slow 4G", cache
desativado) e olhar o tempo até aparecer a imagem principal; comparar com os números acima antes e depois do
ajuste.
