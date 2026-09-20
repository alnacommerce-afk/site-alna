# Home da Alna Commerce (Cloudflare)

Página estática (HTML + CSS + um script de ~1 KB), sem React e sem chamadas a banco de dados.
Serve `alnacommerce.com`. Todo o resto do site (loja, carrinho, conta, sobre, contato) fica em
`store.alnacommerce.com`, no app do Lovable.

## Publicar no Cloudflare Pages (sem build)

1. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → repositório `site-alna`.
2. Framework preset: **None**. Build command: **(vazio)**. Build output directory: **`home-cloudflare`**.
3. Depois do deploy: Custom domains → adicione `alnacommerce.com` (e `www.alnacommerce.com`).
4. Aponte `store.alnacommerce.com` para o app do Lovable (Lovable → Settings → Domains) com o
   registro CNAME que ele pedir, no DNS do Cloudflare.
5. **Só depois** que `store.alnacommerce.com` estiver abrindo, troque o domínio raiz para o Pages.

## Estrutura

- `index.html` — a Home inteira (CSS e script embutidos, para a primeira pintura sem requisições extras).
- `assets/` — imagens (WebP) e logo.
- `_headers` — cache e cabeçalhos de segurança.
- `robots.txt`, `sitemap.xml` — do domínio raiz.

## Como os blocos aparecem

Cada bloco (`.blk`) começa invisível e entra em fila, na ordem da página: espera a imagem do bloco
carregar, faz fade + deslize, e só então libera o próximo. Sem JavaScript (ou com "reduzir
movimento" ativo) tudo aparece direto.
