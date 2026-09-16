// Admin-only (verify_jwt: true). Reports how many people are on the site right now, via the
// Google Analytics Data API's realtime report. Auth is a Google service-account JWT-bearer flow
// (no user OAuth/redirect needed) — the service account's JSON key is stored as a Vault secret
// (Admin > Conexões, id "google_analytics") and must be added as a Viewer on the GA4 property.
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

function base64url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getGoogleAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const encoder = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${base64url(encoder.encode(JSON.stringify(header)))}.${base64url(encoder.encode(JSON.stringify(claims)))}`;

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(signingInput));
  const jwt = `${signingInput}.${base64url(new Uint8Array(signature))}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    throw new Error(`Google token exchange ${tokenResp.status}: ${errText.slice(0, 300)}`);
  }
  const tokenJson = await tokenResp.json();
  return tokenJson.access_token as string;
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

    const { data: settings } = await admin
      .from("site_settings")
      .select("ga4_property_id")
      .eq("id", "default")
      .maybeSingle();
    const propertyId = settings?.ga4_property_id;

    const serviceAccountJson = await admin
      .rpc("get_integration_secret", { p_integration_id: "google_analytics" })
      .then((r) => r.data as string | null);

    if (!propertyId || !serviceAccountJson) {
      return jsonResponse({ configured: false });
    }

    let serviceAccount: { client_email?: string; private_key?: string };
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch {
      return jsonResponse({ error: "A chave salva não é um JSON válido de conta de serviço." }, 500);
    }
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      return jsonResponse({ error: "JSON da conta de serviço incompleto (faltam client_email/private_key)." }, 500);
    }

    const accessToken = await getGoogleAccessToken(serviceAccount.client_email, serviceAccount.private_key);

    const reportResp = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ metrics: [{ name: "activeUsers" }] }),
      },
    );
    if (!reportResp.ok) {
      const errText = await reportResp.text();
      throw new Error(`Google Analytics Data API ${reportResp.status}: ${errText.slice(0, 300)}`);
    }
    const reportJson = await reportResp.json();
    const activeUsers = Number(reportJson.rows?.[0]?.metricValues?.[0]?.value ?? 0);

    return jsonResponse({ configured: true, activeUsers });
  } catch (error) {
    console.error("[ga4-realtime-visitors]", error);
    const message = error instanceof Error ? error.message : "Erro ao consultar o Google Analytics.";
    return jsonResponse({ error: message }, 500);
  }
});
