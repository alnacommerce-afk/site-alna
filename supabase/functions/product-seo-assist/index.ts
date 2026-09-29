// Admin-only. Given a draft product (title/description/category/photo count), asks an LLM to
// produce SEO metadata: an improved title suggestion, focus keyword, meta title/description,
// related search-term variants and per-photo alt text — following the same checklist e-commerce
// SEO plugins (Rank Math/Yoast) use: focus keyword in title/meta/URL, natural keyword variants,
// descriptive per-image alt text. The Google AI Studio key is stored encrypted via Supabase Vault
// (Admin > Conexões de API, integration id "ai_seo") and only decrypted here, server-side.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody = {
  title: string;
  description: string;
  categoryName: string | null;
  imageCount: number;
};

type AiResult = {
  titleSuggestion: string;
  focusKeyword: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  imageAltTexts: string[];
};

// Gemini occasionally answers 503 "model overloaded" for a few seconds at a time — retrying the
// same model usually clears it, and falling back to a second model covers the rarer case where an
// entire model is down for longer. Each attempt has its own timeout so a hung request never leaves
// the admin staring at "Analisando..." indefinitely; worst case here is under a minute.
// Verified live against this account's key on 2026-09-29: gemini-3.6-flash was timing out (no
// response at all, not even a fast error) while the whole "flash" tier was 503 "high demand" —
// but the "-lite" tier answered 200 instantly. Lite models run on separate, less contended
// capacity, so they're the fallback rather than another full-size flash model.
const MODEL_PLAN: { model: string; attempts: number }[] = [
  { model: "gemini-3.6-flash", attempts: 1 },
  { model: "gemini-3.5-flash-lite", attempts: 2 },
  { model: "gemini-3.1-flash-lite", attempts: 1 },
];
const REQUEST_TIMEOUT_MS = 12_000;
const RETRY_DELAY_MS = 1_000;

class AiKeyError extends Error {}
class AiRateLimitError extends Error {}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  let lastError = "";

  for (const { model, attempts } of MODEL_PLAN) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      let response: Response;
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          },
        );
      } catch (error) {
        // Network failure or our own timeout — treat the same as an outage on this model.
        lastError = `${model}: ${error instanceof Error ? error.message : String(error)}`;
        continue;
      }

      if (response.status === 400 || response.status === 403) throw new AiKeyError();
      if (response.status === 429) throw new AiRateLimitError();

      if (response.status === 503) {
        lastError = `${model}: 503 (sobrecarregado)`;
        if (attempt < attempts) await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      if (!response.ok) {
        lastError = `${model}: ${response.status} ${(await response.text()).slice(0, 200)}`;
        continue;
      }

      const json = await response.json();
      const content: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (content) return content;
      lastError = `${model}: resposta vazia`;
    }
  }

  throw new Error(
    `A IA está indisponível no momento (tentamos ${MODEL_PLAN.map((m) => m.model).join(" e ")}). ` +
      `Tente novamente em alguns instantes. Detalhe: ${lastError}`,
  );
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/```\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("A IA não retornou um JSON válido.");
  return JSON.parse(raw.slice(start, end + 1));
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return jsonResponse({ error: "Não autenticado." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser(token);
    if (userError || !userData?.user) return jsonResponse({ error: "Não autenticado." }, 401);

    const { data: isAdmin, error: roleError } = await callerClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleError || !isAdmin) {
      return jsonResponse({ error: "Acesso restrito a administradores." }, 403);
    }

    const body = (await req.json()) as RequestBody;
    const title = (body.title ?? "").trim();
    const imageCount = Math.max(0, Math.min(20, body.imageCount ?? 0));

    if (!title) {
      return jsonResponse({ error: "Informe ao menos um título antes de usar a IA." }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: apiKey, error: secretError } = await adminClient.rpc("get_integration_secret", {
      p_integration_id: "ai_seo",
    });

    if (secretError || !apiKey) {
      return jsonResponse(
        {
          error:
            "Nenhuma chave de IA configurada. Cole uma chave do Google AI Studio em Admin > Conexões de API.",
        },
        503,
      );
    }

    const prompt = `Você é um especialista em SEO para e-commerce brasileiro (padrão Rank Math/Yoast).
Produto (rascunho, ainda não otimizado):
- Título atual: "${title}"
- Categoria: "${body.categoryName ?? "não informada"}"
- Descrição atual: "${(body.description ?? "").trim() || "(vazia)"}"
- Quantidade de fotos do produto: ${imageCount}

Tarefas:
1. Defina UMA palavra-chave de foco (a forma como o cliente brasileiro busca esse produto no Google).
2. Sugira um título de produto melhorado (até 60 caracteres), com a palavra-chave de foco perto do início.
3. Escreva um "SEO title" (meta title, até 60 caracteres) contendo a palavra-chave de foco.
4. Escreva uma "SEO description" (meta description, 140 a 160 caracteres) contendo a palavra-chave de foco, persuasiva.
5. Liste de 5 a 8 termos/variações de busca relacionados (sinônimos, buscas alternativas, cauda longa) que esse anúncio deveria conseguir indexar no Google.
6. Gere um texto alternativo (alt text) descritivo e único para cada uma das ${imageCount} fotos do produto, incorporando a palavra-chave de foco de forma natural (sem repetir o mesmo texto em todas).

Responda APENAS com um JSON no formato exato:
{"titleSuggestion":"...","focusKeyword":"...","seoTitle":"...","seoDescription":"...","seoKeywords":["...","..."],"imageAltTexts":["...","..."]}
O array "imageAltTexts" deve ter exatamente ${imageCount} itens.`;

    let content: string;
    try {
      content = await callGemini(apiKey, prompt);
    } catch (error) {
      if (error instanceof AiKeyError) {
        return jsonResponse(
          { error: "A chave de IA configurada foi rejeitada pelo Google. Verifique em Conexões de API." },
          502,
        );
      }
      if (error instanceof AiRateLimitError) {
        return jsonResponse({ error: "Limite de uso da IA atingido. Tente novamente em instantes." }, 429);
      }
      throw error;
    }
    const parsed = extractJson(content) as Partial<AiResult>;

    const result: AiResult = {
      titleSuggestion: parsed.titleSuggestion?.toString().slice(0, 60) ?? title,
      focusKeyword: parsed.focusKeyword?.toString() ?? "",
      seoTitle: parsed.seoTitle?.toString().slice(0, 60) ?? "",
      seoDescription: parsed.seoDescription?.toString().slice(0, 160) ?? "",
      seoKeywords: Array.isArray(parsed.seoKeywords) ? parsed.seoKeywords.map(String) : [],
      imageAltTexts: Array.isArray(parsed.imageAltTexts)
        ? parsed.imageAltTexts.map(String).slice(0, imageCount)
        : [],
    };

    while (result.imageAltTexts.length < imageCount) {
      result.imageAltTexts.push(result.focusKeyword || title);
    }

    return jsonResponse(result);
  } catch (error) {
    console.error("[product-seo-assist]", error);
    const message = error instanceof Error ? error.message : "Erro inesperado ao consultar a IA.";
    return jsonResponse({ error: message }, 500);
  }
});
