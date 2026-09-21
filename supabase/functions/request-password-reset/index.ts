// Public. "Esqueci minha senha": builds a Supabase recovery link and e-mails it as ALNA through
// Resend (so it is branded and shows up in Admin > E-mails). Always answers the same way, whether
// or not the address has an account, so it can't be used to discover who is a customer.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { wrapBranded } from "../_shared/render-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const REDIRECT_TO = "https://store.alna.sale/conta/redefinir-senha";
const COOLDOWN_SECONDS = 60;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return jsonResponse({ error: "Informe um e-mail válido." }, 400);
  }

  // Same answer in every case below.
  const ok = () => jsonResponse({ ok: true });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // One reset e-mail per address per minute.
    const since = new Date(Date.now() - COOLDOWN_SECONDS * 1000).toISOString();
    const { count } = await admin
      .from("email_send_log")
      .select("id", { count: "exact", head: true })
      .eq("to_email", email)
      .eq("template", "password_reset")
      .gte("created_at", since);
    if ((count ?? 0) > 0) return ok();

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: REDIRECT_TO },
    });
    const link = data?.properties?.action_link;
    if (error || !link) return ok(); // no account for this address

    const resendKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "resend" })
      .then((r) => r.data as string | null);

    const html = wrapBranded(`
      <p style="margin:0 0 12px;">Olá!</p>
      <p style="margin:0 0 12px;">Recebemos um pedido para criar uma nova senha na sua conta ALNA.</p>
      <p style="margin:20px 0;text-align:center;">
        <a href="${link}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:6px;">Criar nova senha</a>
      </p>
      <p style="margin:0 0 8px;font-size:12px;color:#6b7280;">O link vale por tempo limitado e só pode ser usado uma vez. Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>`);

    await sendEmail(resendKey, {
      to: email,
      subject: "Crie uma nova senha — ALNA",
      html,
      template: "password_reset",
    });
  } catch (err) {
    console.error("[request-password-reset]", err);
  }
  return ok();
});
