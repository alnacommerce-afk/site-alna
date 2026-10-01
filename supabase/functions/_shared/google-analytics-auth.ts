// Shared Google service-account JWT-bearer OAuth flow + GA4 credential loading, used by every edge
// function that calls the Google Analytics Data API. The service account's JSON key is stored as a
// Vault secret (Admin > Conexões, id "google_analytics") and must be added as a Viewer on the GA4
// property — see the "GA4 realtime debug" memory for the bug history behind this setup.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

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

export async function getGoogleAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
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

export type Ga4Credentials = { propertyId: string; accessToken: string };

// Returns null when GA4 isn't configured yet (no property id or no service-account key saved) —
// callers should respond with { configured: false } in that case. Throws (caught by the caller's
// own try/catch) when a key is saved but malformed, or when the Google token exchange fails.
export async function loadGa4Credentials(admin: SupabaseClient): Promise<Ga4Credentials | null> {
  const { data: settings } = await admin
    .from("site_settings")
    .select("ga4_property_id")
    .eq("id", "default")
    .maybeSingle();
  const propertyId = settings?.ga4_property_id;

  const serviceAccountJson = await admin
    .rpc("get_integration_secret", { p_integration_id: "google_analytics" })
    .then((r) => r.data as string | null);

  if (!propertyId || !serviceAccountJson) return null;

  let serviceAccount: { client_email?: string; private_key?: string };
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error("A chave salva não é um JSON válido de conta de serviço.");
  }
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("JSON da conta de serviço incompleto (faltam client_email/private_key).");
  }

  const accessToken = await getGoogleAccessToken(serviceAccount.client_email, serviceAccount.private_key);
  return { propertyId, accessToken };
}
