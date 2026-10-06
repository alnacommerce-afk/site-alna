// Records the health of one piece of the payment flow in `payment_health_status` and e-mails the
// admin when it breaks. Never throws — monitoring must never break a checkout or a webhook.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "./send-email.ts";

const SITE_URL = "https://store.alna.sale";
// Same problem → at most one e-mail per window, so a broken key doesn't mean one e-mail per customer.
const ALERT_COOLDOWN_MS = 12 * 60 * 60 * 1000;

const CHECK_LABELS: Record<string, string> = {
  asaas_api_key: "Chave de API da Asaas",
  asaas_webhook_queue: "Fila de webhooks da Asaas",
  site_webhook_endpoint: "Endereço de webhook do site",
  checkout_asaas: "Checkout (erro real de um cliente)",
};

export async function reportPaymentOk(admin: SupabaseClient, checkName: string): Promise<void> {
  try {
    await admin
      .from("payment_health_status")
      .upsert(
        { check_name: checkName, ok: true, detail: null, checked_at: new Date().toISOString(), last_alert_at: null },
        { onConflict: "check_name" },
      );
  } catch (error) {
    console.error("[payment-alert] falha ao gravar status ok", checkName, error);
  }
}

export async function reportPaymentProblem(
  admin: SupabaseClient,
  checkName: string,
  detail: string,
): Promise<void> {
  try {
    const { data: previous } = await admin
      .from("payment_health_status")
      .select("last_alert_at")
      .eq("check_name", checkName)
      .maybeSingle();

    const lastAlert = previous?.last_alert_at ? new Date(previous.last_alert_at).getTime() : 0;
    const shouldAlert = Date.now() - lastAlert > ALERT_COOLDOWN_MS;

    await admin.from("payment_health_status").upsert(
      {
        check_name: checkName,
        ok: false,
        detail: detail.slice(0, 500),
        checked_at: new Date().toISOString(),
        last_alert_at: shouldAlert ? new Date().toISOString() : (previous?.last_alert_at ?? null),
      },
      { onConflict: "check_name" },
    );

    if (!shouldAlert) return;

    const { data: settings } = await admin
      .from("site_settings")
      .select("admin_notification_email")
      .eq("id", "default")
      .maybeSingle();
    if (!settings?.admin_notification_email) return;

    const resendKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "resend" })
      .then((r) => r.data as string | null);
    const label = CHECK_LABELS[checkName] ?? checkName;
    await sendEmail(resendKey, {
      to: settings.admin_notification_email,
      subject: `ALERTA: pagamentos podem estar fora do ar — ${label}`,
      html: `<p><strong>${label}</strong> está com problema e clientes podem não conseguir pagar ou ter o pagamento confirmado.</p>
<p><strong>Detalhe:</strong> ${detail.replace(/</g, "&lt;")}</p>
<p>Como resolver: <a href="${SITE_URL}/admin/conexoes">Admin &gt; Conexões de API</a> (chave e token) e, na Asaas, Integrações &gt; Chaves de API / Webhooks.</p>
<p>Este aviso é enviado no máximo a cada 12 horas enquanto o problema continuar.</p>`,
    });
  } catch (error) {
    console.error("[payment-alert] falha ao registrar problema", checkName, error);
  }
}
