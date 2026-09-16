// Admin-only (verify_jwt: true). Read-only: reports the merchant's Melhor Envio wallet balance so
// the admin can see at a glance whether there's enough to keep buying shipping labels.
import { createClient } from "jsr:@supabase/supabase-js@2";

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

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return jsonResponse({ error: "Acesso restrito a administradores." }, 403);

    const meToken = await admin
      .rpc("get_integration_secret", { p_integration_id: "melhor_envio" })
      .then((r) => r.data as string | null);
    if (!meToken) return jsonResponse({ error: "Melhor Envio não configurado." }, 503);

    const balanceResp = await fetch("https://melhorenvio.com.br/api/v2/me/balance", {
      headers: {
        Authorization: `Bearer ${meToken}`,
        Accept: "application/json",
        "User-Agent": "Alna Commerce (contato@alna.cc)",
      },
    });
    if (!balanceResp.ok) {
      const errText = await balanceResp.text();
      throw new Error(`Melhor Envio balance ${balanceResp.status}: ${errText.slice(0, 300)}`);
    }
    const balanceJson = await balanceResp.json();

    return jsonResponse({
      balance: balanceJson.balance ?? null,
      reserved: balanceJson.reserved ?? null,
      debts: balanceJson.debts ?? null,
    });
  } catch (error) {
    console.error("[melhor-envio-balance]", error);
    const message = error instanceof Error ? error.message : "Erro ao consultar saldo.";
    return jsonResponse({ error: message }, 500);
  }
});
