// Admin-only (verify_jwt: true). For the "Visualizações nos últimos 30 dias" column in
// Admin > Marketing > Campanhas: given a list of utm_campaign slugs, returns how many page views
// the Google Analytics Data API attributes to each one in the last 30 days. Same service-account
// auth as ga4-realtime-visitors (see _shared/google-analytics-auth.ts).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { loadGa4Credentials } from "../_shared/google-analytics-auth.ts";

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

    const body = await req.json().catch(() => ({}));
    const campaigns = Array.isArray(body.campaigns)
      ? (body.campaigns.filter((c: unknown): c is string => typeof c === "string" && c.length > 0) as string[])
      : [];
    if (campaigns.length === 0) return jsonResponse({ configured: true, views: {} });

    const credentials = await loadGa4Credentials(admin);
    if (!credentials) return jsonResponse({ configured: false });

    const reportResp = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${credentials.propertyId}:runReport`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${credentials.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "sessionCampaignName" }],
          metrics: [{ name: "screenPageViews" }],
          dimensionFilter: {
            filter: { fieldName: "sessionCampaignName", inListFilter: { values: campaigns } },
          },
          limit: campaigns.length,
        }),
      },
    );
    if (!reportResp.ok) {
      const errText = await reportResp.text();
      throw new Error(`Google Analytics Data API ${reportResp.status}: ${errText.slice(0, 300)}`);
    }
    const reportJson = await reportResp.json();

    const views: Record<string, number> = Object.fromEntries(campaigns.map((c) => [c, 0]));
    for (const row of reportJson.rows ?? []) {
      const name = row.dimensionValues?.[0]?.value;
      const count = Number(row.metricValues?.[0]?.value ?? 0);
      if (name && name in views) views[name] = count;
    }

    return jsonResponse({ configured: true, views });
  } catch (error) {
    console.error("[ga4-campaign-views]", error);
    const message = error instanceof Error ? error.message : "Erro ao consultar o Google Analytics.";
    return jsonResponse({ error: message }, 500);
  }
});
