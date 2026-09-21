// Admin-only (verify_jwt: true). Sends ONE test e-mail through the same path every store e-mail
// uses (Resend, noreply@alna.sale, wrapped in the branded layout, recorded in email_send_log) so
// the admin can confirm that sending works. The recipient is never taken from the request: it is
// the store's admin notification address, or the caller's own account e-mail.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { wrapBranded } from "../_shared/render-template.ts";

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

    const { data: settings } = await admin
      .from("site_settings")
      .select("admin_notification_email")
      .eq("id", "default")
      .maybeSingle();
    const to = settings?.admin_notification_email || userData.user.email;
    if (!to) return jsonResponse({ error: "Nenhum e-mail de destino disponível." }, 400);

    const resendKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "resend" })
      .then((r) => r.data as string | null);

    const sentAt = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const result = await sendEmail(resendKey, {
      to,
      subject: "Teste de envio — ALNA",
      html: wrapBranded(
        `<p>Este é um e-mail de teste enviado em ${sentAt}.</p>
         <p>Se você recebeu esta mensagem, o envio pelo endereço noreply@alna.sale está funcionando.</p>`,
      ),
      template: "teste",
    });

    return jsonResponse({ to, ...result }, result.status === "sent" ? 200 : 502);
  } catch (error) {
    console.error("[send-test-email]", error);
    const message = error instanceof Error ? error.message : "Erro ao enviar o teste.";
    return jsonResponse({ error: message }, 500);
  }
});
