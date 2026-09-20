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

## Estrutura

- `index.html` — a Home inteira (CSS e script embutidos, para a primeira pintura sem requisições extras).
- `assets/` — imagens (WebP) e logo. O logo também é usado nos e-mails da loja.
- `_headers` — cache e cabeçalhos de segurança.
- `robots.txt`, `sitemap.xml` — do domínio raiz.

## Como os blocos aparecem

Cada bloco (`.blk`) começa invisível e entra em fila, na ordem da página: espera a imagem do bloco
carregar, faz fade + deslize, e só então libera o próximo. Sem JavaScript (ou com "reduzir
movimento" ativo) tudo aparece direto.
