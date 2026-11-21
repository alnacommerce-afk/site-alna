// Somente leitura: devolve as taxas vigentes da conta Asaas (sem chave, sem dados de cliente).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getAccountRates } from "../_shared/asaas-fees.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const asaasKey = await admin
    .rpc("get_integration_secret", { p_integration_id: "payment_gateway" })
    .then((r) => r.data as string | null);
  if (!asaasKey) {
    return new Response(JSON.stringify({ error: "gateway não configurado" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const rates = await getAccountRates(asaasKey);
  return new Response(JSON.stringify(rates), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
