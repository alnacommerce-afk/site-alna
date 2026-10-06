// Public, only ever called by pg_cron (every 6 hours) — takes no input and returns no secrets.
// Checks, WITHOUT creating any charge or customer, that the payment flow would work right now:
//   1. asaas_api_key         — GET /customers?limit=1, the very first call checkout-create makes.
//      Calling it regularly also keeps the key "in use" (Asaas disables an unused key after 3 months
//      and expires it for good after 6 — docs.asaas.com/docs/chaves-de-api).
//   2. asaas_webhook_queue   — GET /webhooks: a webhook pointing at this site must be enabled and its
//      queue must not be interrupted (Asaas pauses it after 15 consecutive failures and drops events
//      older than 14 days).
//   3. site_webhook_endpoint — our own asaas-webhook answers 200 for the configured token.
// Problems are recorded in payment_health_status and e-mailed to the admin (see _shared/payment-alert.ts).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { reportPaymentOk, reportPaymentProblem } from "../_shared/payment-alert.ts";

const ASAAS_API = "https://api.asaas.com/v3";
// Public cron endpoint: don't let anyone who finds the URL hammer Asaas.
const MIN_INTERVAL_MS = 5 * 60 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// What Asaas says about a 401, per docs.asaas.com/docs/authentication-2.
const ASAAS_KEY_ERRORS: Record<string, string> = {
  invalid_access_token: "chave inválida, desabilitada, expirada ou apagada na Asaas",
  invalid_environment: "chave de sandbox sendo usada em produção (ou o contrário)",
  invalid_access_token_format: "chave com espaço ou caractere extra colado",
  access_token_not_found: "chave não enviada",
};

type CheckResult = { check: string; ok: boolean; detail?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: last } = await admin
      .from("payment_health_status")
      .select("checked_at")
      .eq("check_name", "asaas_api_key")
      .maybeSingle();
    if (last && Date.now() - new Date(last.checked_at).getTime() < MIN_INTERVAL_MS) {
      return jsonResponse({ ok: true, skipped: "verificado há menos de 5 minutos" });
    }

    const results: CheckResult[] = [];
    async function record(check: string, ok: boolean, detail?: string) {
      results.push({ check, ok, detail });
      if (ok) await reportPaymentOk(admin, check);
      else await reportPaymentProblem(admin, check, detail ?? "falha sem detalhe");
    }

    // 1. API key
    const asaasKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "payment_gateway" })
      .then((r) => r.data as string | null);
    const asaasHeaders = {
      access_token: asaasKey ?? "",
      "Content-Type": "application/json",
      "User-Agent": "ALNA (noreply@alna.sale)",
    };

    if (!asaasKey) {
      await record("asaas_api_key", false, "Nenhuma chave salva em Admin > Conexões de API > Asaas (pagamentos).");
    } else {
      try {
        const resp = await fetch(`${ASAAS_API}/customers?limit=1`, {
          headers: asaasHeaders,
          signal: AbortSignal.timeout(15000),
        });
        if (resp.ok) {
          await record("asaas_api_key", true);
          // The credential works again, so a past "customer hit a 401" alert no longer applies.
          await reportPaymentOk(admin, "checkout_asaas");
        } else {
          const body = await resp.json().catch(() => null);
          const code = body?.errors?.[0]?.code as string | undefined;
          const meaning = code ? (ASAAS_KEY_ERRORS[code] ?? code) : "sem código de erro";
          await record("asaas_api_key", false, `A Asaas respondeu ${resp.status} (${meaning}).`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await record("asaas_api_key", false, `Não foi possível falar com a Asaas: ${message}`);
      }
    }

    // 2. Webhook queue (only meaningful if the key works)
    const keyOk = results.find((r) => r.check === "asaas_api_key")?.ok === true;
    if (keyOk) {
      try {
        const resp = await fetch(`${ASAAS_API}/webhooks?limit=100`, {
          headers: asaasHeaders,
          signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) {
          await record("asaas_webhook_queue", false, `Não consegui listar os webhooks (Asaas ${resp.status}).`);
        } else {
          const body = (await resp.json()) as {
            data?: { name?: string; url?: string; enabled?: boolean; interrupted?: boolean }[];
          };
          const ours = (body.data ?? []).filter((w) => (w.url ?? "").includes("/functions/v1/asaas-webhook"));
          if (ours.length === 0) {
            await record(
              "asaas_webhook_queue",
              false,
              "Nenhum webhook cadastrado na Asaas aponta para o site — pagamentos não serão confirmados.",
            );
          } else {
            const broken = ours.filter((w) => w.enabled === false || w.interrupted === true);
            if (broken.length > 0) {
              await record(
                "asaas_webhook_queue",
                false,
                `Webhook "${broken[0]?.name ?? "sem nome"}" ${broken[0]?.interrupted ? "com a fila PAUSADA" : "desativado"} na Asaas — reative em Integrações > Webhooks.`,
              );
            } else {
              await record("asaas_webhook_queue", true);
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await record("asaas_webhook_queue", false, `Não foi possível consultar os webhooks: ${message}`);
      }
    }

    // 3. Our own endpoint, end to end, with an event that carries no payment (so it changes nothing).
    const webhookToken = await admin
      .rpc("get_integration_secret", { p_integration_id: "asaas_webhook" })
      .then((r) => r.data as string | null);
    if (!webhookToken) {
      await record(
        "site_webhook_endpoint",
        false,
        "Nenhum token salvo em Admin > Conexões de API > Asaas — Token de Webhook (o site recusa todo evento).",
      );
    } else {
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/asaas-webhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "asaas-access-token": webhookToken },
          body: JSON.stringify({ event: "HEALTH_CHECK" }),
          signal: AbortSignal.timeout(15000),
        });
        if (resp.status === 200) await record("site_webhook_endpoint", true);
        else await record("site_webhook_endpoint", false, `Nosso webhook respondeu ${resp.status} ao teste interno.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await record("site_webhook_endpoint", false, `Teste interno do webhook falhou: ${message}`);
      }
    }

    return jsonResponse({ ok: results.every((r) => r.ok), results });
  } catch (error) {
    console.error("[payment-health-check]", error);
    const message = error instanceof Error ? error.message : "Erro ao verificar pagamentos.";
    return jsonResponse({ error: message }, 500);
  }
});
