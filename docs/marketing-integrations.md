# Integrações de marketing/SEO (Google + Meta)

Registro do que já está configurado e de como o site alimenta cada ferramenta — feito em 29–30/09/2026
depois de auditar o estado real (várias coisas já existiam e não estavam documentadas em lugar nenhum).

## Contas já existentes

Não presuma que nenhuma dessas precisa ser criada — todas já existem e estão em uso:

- **Google Search Console** — duas propriedades, ambas "Propriedade de domínio" (verificação por DNS,
  mais forte que tag HTML): `alna.sale` e `store.alna.sale`. Sitemaps das duas já cadastrados.
- **Google Analytics 4** — Measurement ID `G-DP9VE6XSRF`, Property ID `554769095`
  (`site_settings.ga4_measurement_id` / `ga4_property_id`). Linker configurado entre `alna.sale` e
  `store.alna.sale` (evita contar uma visita que passa de um domínio pro outro como duas sessões).
  Falta a chave de conta de serviço (`google_analytics` no Vault) pro card "visitantes agora" do
  `/admin` funcionar — sem ela ele mostra "não configurado" (não afeta a coleta de dados em si).
- **Google Merchant Center** — conta "Alna", ID `5856969666`. Fonte de dados única ("PRODUCTS
  SOURCE 1"), tipo "Arquivo (URL)", busca automática diária às 00:00, listagens gratuitas ativas.

## O feed de produtos (Meta + Google, uma função só)

`supabase/functions/meta-catalog-feed/index.ts` (público, sem auth) serve os dois catálogos a partir
dos mesmos dados, via query param — a lógica de montagem das linhas fica em
`supabase/functions/_shared/meta-feed.ts` (`buildFeedCsv`, sem import de Deno/Supabase, testável com
Node puro):

- Meta / Instagram Commerce Manager: `.../functions/v1/meta-catalog-feed`
- Google Merchant Center (fonte de dados "PRODUCTS SOURCE 1"): `.../functions/v1/meta-catalog-feed?for=google`

Os dois formatos **não são iguais**, e por isso o código escolhe pelo parâmetro `target`:

| | Meta | Google |
|---|---|---|
| Delimitador | vírgula (CSV) | tabulação (TSV) — confirmado em support.google.com/merchants/answer/12631822 |
| `availability` | `in stock` / `out of stock` (com espaço) | `in_stock` / `out_of_stock` (com underline) — confirmado em .../answer/6324448 |
| Content-Type da resposta | `text/csv` | `text/tab-separated-values` |

Uma linha por **variação** (SKU), não por produto — por isso o Merchant Center mostra mais "produtos"
(30, em 30/09/2026) do que o catálogo tem de fato (18 produtos publicados).

## Formato das fotos e os avisos do Merchant Center

`src/lib/admin/optimize-image.ts` converte toda foto enviada pelo admin para **JPEG** antes de subir
pro Storage (de propósito — WebP não é universalmente aceito por Meta/WhatsApp/e-mail). Isso já
evita o problema mais comum de "tipo de imagem não aceito" no Google Shopping.

Ainda assim, `prepareProductImage` tem um caminho de fallback que devolve o **arquivo original sem
conversão** quando: é GIF animado ou SVG, o canvas falha, ou o JPEG recodificado não ficaria menor
que o original. Se o admin subir uma foto que já veio em WebP do celular/print de tela e cair nesse
fallback, ela sobe como WebP mesmo — provável causa real por trás de um aviso "Tipo de imagem não
aceito em [additional_image_link]" (visto pela primeira vez em 30/09/2026, no produto
`TOA_FOLHA_1`). Se isso se repetir em vários produtos, vale forçar a conversão pra JPEG sempre
(remover esse fallback), em vez de só confiar que o admin nunca vai enviar WebP.

**Dois avisos do Merchant Center que parecem parecidos mas são bem diferentes:**

- **"Imagem não processada" / "Impede a exibição no Brasil"** — normal, sem ação necessária. O
  Google ainda não rastreou a imagem; pode levar até 3 dias (raramente até 30). Resolve sozinho.
- **"Tipo de imagem não aceito em [additional_image_link]"** — esse sim é um problema de verdade
  (formato de arquivo que o Google não aceita). Ver o parágrafo acima sobre o fallback do WebP.

**Como forçar o Google a rastrear uma imagem de novo mais rápido** (se o processamento passar de
uma semana): trocar o nome do arquivo/URL da imagem no cadastro do produto — manter a mesma URL pode
levar até 3 semanas pro Google notar a mudança; um nome novo aciona um rastreamento em até 3 dias.
Como cada upload nosso já gera um nome de arquivo novo (UUID), isso já acontece automaticamente
sempre que uma foto é trocada.

## Sitemap

`scripts/generate-sitemap.mjs` regera `public/sitemap.xml` com todos os produtos publicados +
páginas estáticas da loja; roda automaticamente como `prebuild` (ver `package.json`). Antes de
30/09/2026 o sitemap só tinha as páginas institucionais — nenhum produto aparecia pro Google.
