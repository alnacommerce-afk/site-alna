# Varredura completa do site (13/10/2026)

Pedido do dono, depois de perceber que `alna.sale/atacado` dava 404 antes da 3ª contestação do Google Ads. Método: rastreador próprio (Python) + `curl`, a partir de ~60 endereços-semente (todas as páginas públicas, o sitemap das duas casas, variações http/https/www dos 4 domínios, páginas inexistentes de propósito), seguindo links internos (2 níveis) e verificando imagens, scripts e estilos: **260 endereços testados**; além disso as **28 páginas do sitemap da loja** foram abertas uma a uma, procurando "erro silencioso" (página que responde 200 mas mostra "não encontrado"/erro) e conferindo as imagens de produto no Supabase.

## Resultado
- **Quebrados de verdade: nenhum** em páginas públicas, imagens, scripts, favicons, robots e sitemaps das duas casas (alna.sale e store.alna.sale), nem nos redirecionamentos dos domínios antigos (alna.cc, www.alna.cc, alnacommerce.com e www — todos terminam em 200).
- **404 de propósito (corretos):** `alna.sale/404-teste-inexistente` e `store.alna.sale/pagina-inexistente-teste` mostram a página 404 da própria loja.
- **`alna.cc/wp-admin`:** termina em 403 após redirecionar para `www.alna.cc/wp-login.php` (WordPress antigo, hospedado na Hostnet). Não é página pública da loja; apenas anotado.
- **Já corrigido nesta sessão:** `alna.sale/atacado` dava **404** (corrigido: página própria, ver `DECISOES.md`), e antes de ficar no ar chegou a responder **308** para `/atacado/` (corrigido servindo `atacado.html`; agora responde 200 direto, 13,8 KB, ~0,35 s).
- Outros pontos conferidos: `store.alna.sale/` redireciona (302) para `/loja`; `www.alna.sale` abre normalmente (canônico é `alna.sale`); feed de produtos (`meta-catalog-feed`) 200 (73 KB, ~2 s — é o feed, não página).

## Armadilha encontrada (não é defeito do site)
O rastreador em Python mostrou tempos de **24 s a 97 s** em quase tudo que é Cloudflare (alna.sale, alna.cc, alnacommerce.com). Causa: **o computador do dono não alcança o IPv6 da Cloudflare** (`curl -6` dá timeout; `curl -4` responde em 0,1–0,3 s) e o Python tenta IPv6 primeiro. Com `curl` normal e com os user agents do Google (AdsBot, Googlebot) as mesmas páginas respondem em **0,3–0,5 s**. `store.alna.sale` não tem IPv6 (só IPv4). **Não tratar esses tempos como lentidão do site.**

## O que falhou no processo (lição)
O erro `alna.sale/atacado` 404 já estava registrado desde 12/10 (PENDENCIAS, "aguardando o ok"), mas foi tratado como ajuste opcional "se algum anúncio usar esse endereço" e **não** como bloqueio antes da 3ª contestação; e não foi feita uma varredura completa antes de enviar. Regra daqui para frente: **antes de qualquer contestação ao Google, rodar esta varredura** (comandos acima) e só então enviar. Observação: o endereço que o Google cita no erro é o destino do anúncio (`store.alna.sale/atacado`), que sempre respondeu 200; não há prova de que o Google tenha visto o 404 de `alna.sale/atacado`, mas ele é alcançável pela Home e por expansão de URL final do PMax.
