// Admin-only (verify_jwt: true). Generates 3 Instagram post concepts (image + caption) for one or
// more selected products, reusing the same Google AI Studio key already configured for SEO text
// (Vault, integration id "ai_seo") — no new credential, no new Admin > Conexões screen.
//
// Image generation on Gemini has ZERO free-tier quota (verified live on 2026-09-29: the same key
// that generates SEO text fine returns 429 "generate_content_free_tier_requests, limit: 0" against
// an image model) — it only works once billing is enabled on that Google Cloud project. That 429 is
// surfaced here as code "NO_QUOTA" with an explicit message, never retried in a loop (real money).
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// The ALNA brand's actual palette — hardcoded because these are the literal hex values used
// consistently across the whole storefront and every e-mail (190+ occurrences project-wide), not a
// themeable design-token set. One place to change for a future rebrand.
const BRAND = {
  primary: "#12294f", // navy — main brand color
  accent: "#16a34a", // green — CTAs, discounts, highlights
  background: "#fcfbf8", // warm off-white backdrop used across the storefront
  name: "ALNA",
};

// Non-preview (stable) model names only — a preview model can be pulled with no notice.
const IMAGE_MODEL = "gemini-3.1-flash-image";
const TEXT_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite"];

type Concept = "produto" | "lifestyle" | "beneficio";
const ALL_CONCEPTS: Concept[] = ["produto", "lifestyle", "beneficio"];

const CONCEPT_LABEL: Record<Concept, string> = {
  produto: "Produto em destaque",
  lifestyle: "Lifestyle",
  beneficio: "Benefício",
};

const CONCEPT_IMAGE_BRIEF: Record<Concept, string> = {
  produto:
    `Composição comercial e profissional, foco total no produto. Fundo limpo, em tons neutros ou ` +
    `levemente ${BRAND.background}. Aplique a cor da marca (${BRAND.primary}, azul-marinho) de forma ` +
    `evidente em algum elemento de apoio (fundo, faixa, sombra colorida) sem cobrir o produto. ` +
    `Iluminação de estúdio, nítida, comercial.`,
  lifestyle:
    `O produto inserido num cenário real de uso, de forma natural e aspiracional. A identidade da ` +
    `marca aparece de forma sutil (um leve toque das cores ${BRAND.primary} ou ${BRAND.accent} em ` +
    `algum elemento do ambiente, nunca artificial). Luz natural, composição fotográfica realista.`,
  beneficio:
    `Visual mais impactante, com a cor de destaque da marca (${BRAND.accent}, verde) usada para ` +
    `chamar atenção — por exemplo num elemento gráfico, forma ou realce ao redor do produto. ` +
    `Comunique visualmente um benefício ou diferencial do produto, sem inventar texto técnico.`,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

class QuotaError extends Error {}
class KeyError extends Error {}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const mimeType = resp.headers.get("content-type") ?? "image/jpeg";
    const bytes = new Uint8Array(await resp.arrayBuffer());
    return { base64: base64FromBytes(bytes), mimeType };
  } catch {
    return null;
  }
}

async function callGemini(apiKey: string, model: string, parts: unknown[], timeoutMs: number) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] }),
      signal: AbortSignal.timeout(timeoutMs),
    },
  );
  if (resp.status === 429) throw new QuotaError((await resp.text()).slice(0, 400));
  if (resp.status === 400 || resp.status === 403) throw new KeyError((await resp.text()).slice(0, 400));
  if (!resp.ok) throw new Error(`Gemini ${model} ${resp.status}: ${(await resp.text()).slice(0, 400)}`);
  return resp.json();
}

async function generateImage(
  apiKey: string,
  prompt: string,
  referenceImages: { base64: string; mimeType: string }[],
): Promise<{ base64: string; mimeType: string }> {
  const parts: unknown[] = [{ text: prompt }];
  for (const img of referenceImages) parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });

  const json = await callGemini(apiKey, IMAGE_MODEL, parts, 45_000);
  const responseParts = (json.candidates?.[0]?.content?.parts ?? []) as Array<{
    inlineData?: { data: string; mimeType?: string };
  }>;
  const imagePart = responseParts.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData) throw new Error("A IA não retornou uma imagem.");
  return { base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType ?? "image/png" };
}

type Caption = { title: string; caption: string; cta: string; hashtags: string[] };

async function generateCaption(apiKey: string, prompt: string): Promise<Caption> {
  let lastError: unknown;
  for (const model of TEXT_MODELS) {
    try {
      const json = await callGemini(apiKey, model, [{ text: prompt }], 15_000);
      const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("A IA não retornou um JSON válido.");
      const parsed = JSON.parse(text.slice(start, end + 1));
      return {
        title: String(parsed.title ?? "").slice(0, 100),
        caption: String(parsed.caption ?? ""),
        cta: String(parsed.cta ?? ""),
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String) : [],
      };
    } catch (error) {
      if (error instanceof QuotaError || error instanceof KeyError) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Não foi possível gerar o texto do post.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) return jsonResponse({ error: "Não autenticado." }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return jsonResponse({ error: "Acesso restrito a administradores." }, 403);

    const body = (await req.json()) as { productIds?: string[]; concepts?: Concept[] };
    const productIds = Array.isArray(body.productIds) ? body.productIds.filter(Boolean) : [];
    if (productIds.length === 0) {
      return jsonResponse({ error: "Selecione pelo menos um produto para criar as ideias." }, 400);
    }
    const concepts =
      Array.isArray(body.concepts) && body.concepts.length > 0
        ? body.concepts.filter((c): c is Concept => ALL_CONCEPTS.includes(c))
        : ALL_CONCEPTS;
    if (concepts.length === 0) return jsonResponse({ error: "Nenhum conceito válido informado." }, 400);

    const apiKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "ai_seo" })
      .then((r) => r.data as string | null);
    if (!apiKey) {
      return jsonResponse(
        { error: "Nenhuma chave de IA configurada. Cole uma chave do Google AI Studio em Admin > Conexões de API." },
        503,
      );
    }

    const { data: products, error: productsError } = await admin
      .from("products")
      .select(
        "id, title, description, categories(name), product_variants(price_cents), product_images(storage_path, position)",
      )
      .in("id", productIds);
    if (productsError) throw productsError;
    if (!products || products.length === 0) return jsonResponse({ error: "Produto não encontrado." }, 404);

    // Only real cadastro data goes into the prompt — never invented price, material or spec.
    const productSummaries = products
      .map((p) => {
        const prices = (p.product_variants as { price_cents: number }[] | null)?.map((v) => v.price_cents) ?? [];
        const priceLine = prices.length
          ? `Preço: R$ ${(Math.min(...prices) / 100).toFixed(2)} a R$ ${(Math.max(...prices) / 100).toFixed(2)}`
          : "";
        const categoryName = (p.categories as { name: string } | null)?.name ?? "não informada";
        return `- ${p.title} (categoria: ${categoryName}). ${priceLine}\nDescrição cadastrada: ${
          (p.description ?? "").trim() || "(sem descrição)"
        }`;
      })
      .join("\n\n");

    // Real product photos as visual reference — one per selected product, so the image model has
    // something real to preserve instead of inventing a product from the text description alone.
    const referenceImages: { base64: string; mimeType: string }[] = [];
    for (const p of products) {
      const images = ((p.product_images as { storage_path: string; position: number }[] | null) ?? []).sort(
        (a, b) => a.position - b.position,
      );
      const first = images[0];
      if (!first) continue;
      const publicUrl = admin.storage.from("product-media").getPublicUrl(first.storage_path).data.publicUrl;
      const fetched = await fetchImageAsBase64(publicUrl);
      if (fetched) referenceImages.push(fetched);
    }

    const results = await Promise.allSettled(
      concepts.map(async (concept) => {
        const imagePrompt = `Crie uma peça publicitária profissional para Instagram (formato quadrado 1:1, ideal para feed) para a marca ${BRAND.name}, com o(s) produto(s) abaixo.

Use OBRIGATORIAMENTE a(s) foto(s) de referência anexada(s) como o produto real — preserve fielmente forma, cor e detalhes do produto, sem inventar características novas, sem adicionar acessórios inexistentes e sem alterar o formato. Pode mudar cenário, iluminação e composição ao redor do produto.

Produto(s):
${productSummaries}

Conceito desta imagem: ${CONCEPT_LABEL[concept]}.
${CONCEPT_IMAGE_BRIEF[concept]}

Evite texto dentro da imagem. Evite elementos sem relação com o produto. O produto deve ser sempre o elemento principal da composição.`;

        const captionPrompt = `Você é o social media da marca brasileira ${BRAND.name} (loja de utensílios de madeira para cozinha e itens de cama, mesa e banho). Escreva um post de Instagram para o(s) produto(s) abaixo, com o conceito "${CONCEPT_LABEL[concept]}".

Produto(s):
${productSummaries}

Regras: use SOMENTE as informações acima. NUNCA invente preço, desconto, medida, material, certificação ou condição comercial que não esteja no texto acima. Seja específico ao produto, nunca genérico.

Responda APENAS com um JSON no formato exato:
{"title":"...","caption":"...","cta":"...","hashtags":["...","..."]}
"title" é um gancho curto (até 60 caracteres). "caption" é a legenda completa, pronta pra publicar. "cta" é uma chamada para ação curta. "hashtags" são de 8 a 12 hashtags relevantes (cada uma já com #).`;

        const [imageResult, captionResult] = await Promise.all([
          generateImage(apiKey, imagePrompt, referenceImages),
          generateCaption(apiKey, captionPrompt),
        ]);

        const imageBytes = Uint8Array.from(atob(imageResult.base64), (c) => c.charCodeAt(0));
        const ext = imageResult.mimeType.includes("png") ? "png" : "jpg";
        const path = `${productIds.join("-")}/${Date.now()}-${concept}.${ext}`;
        const { error: uploadError } = await admin.storage.from("post-ideas").upload(path, imageBytes, {
          contentType: imageResult.mimeType,
          cacheControl: "3600",
        });
        if (uploadError) throw uploadError;
        const imageUrl = admin.storage.from("post-ideas").getPublicUrl(path).data.publicUrl;

        return { concept, imageUrl, ...captionResult };
      }),
    );

    const ideas = results.map((result, index) => {
      if (result.status === "fulfilled") return { ok: true as const, ...result.value };

      const error = result.reason;
      let code = "ERROR";
      let message = error instanceof Error ? error.message : "Erro ao gerar esta ideia.";
      if (error instanceof QuotaError) {
        code = "NO_QUOTA";
        message =
          "A geração de imagens exige faturamento (billing) ativado no projeto do Google AI Studio usado pela chave de IA. Ative em aistudio.google.com e tente novamente.";
      } else if (error instanceof KeyError) {
        code = "KEY_REJECTED";
        message = "A chave de IA foi rejeitada pelo Google. Verifique em Admin > Conexões de API.";
      }
      return { ok: false as const, concept: concepts[index]!, code, error: message };
    });

    return jsonResponse({ ideas });
  } catch (error) {
    console.error("[generate-post-ideas]", error);
    const message = error instanceof Error ? error.message : "Erro ao gerar ideias de post.";
    return jsonResponse({ error: message }, 500);
  }
});
