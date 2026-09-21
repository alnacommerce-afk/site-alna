// Thin Resend wrapper shared by every function that e-mails someone. Never throws — a failed or
// unconfigured e-mail must never break an order. Every attempt (sent, failed or skipped) is also
// recorded in `email_send_log`, which Admin > E-mails reads.
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API = "https://api.resend.com/emails";
export const FROM_ADDRESS = "ALNA <noreply@alna.sale>";
export const REPLY_TO_ADDRESS = "contato@alna.sale";

type SendParams = {
  to: string;
  subject: string;
  html: string;
  /** `email_templates.id` this message was rendered from, when there is one. */
  template?: string;
};

type LogEntry = {
  status: "sent" | "failed" | "skipped";
  providerId?: string | null;
  error?: string | null;
};

async function logEmail(params: SendParams, entry: LogEntry): Promise<void> {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { error } = await admin.from("email_send_log").insert({
      from_email: FROM_ADDRESS,
      to_email: params.to,
      subject: params.subject,
      template: params.template ?? null,
      html: params.html,
      status: entry.status,
      provider_id: entry.providerId ?? null,
      error: entry.error ? entry.error.slice(0, 500) : null,
    });
    if (error) console.error("[send-email] falha ao registrar o envio", error);
  } catch (error) {
    console.error("[send-email] falha ao registrar o envio", error);
  }
}

export type SendResult = { status: "sent" | "failed" | "skipped"; error?: string };

export async function sendEmail(resendKey: string | null, params: SendParams): Promise<SendResult> {
  if (!resendKey) {
    console.log("[send-email] Resend não configurado (Admin > Conexões) — pulando envio para", params.to);
    await logEmail(params, { status: "skipped", error: "Resend não configurado." });
    return { status: "skipped", error: "Resend não configurado." };
  }
  try {
    const resp = await fetch(RESEND_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        // noreply@ has no inbox; replies go to the support address (forwarded by Cloudflare Email Routing).
        reply_to: REPLY_TO_ADDRESS,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[send-email] Resend respondeu", resp.status, errText);
      await logEmail(params, { status: "failed", error: `Resend ${resp.status}: ${errText}` });
      return { status: "failed", error: `Resend ${resp.status}: ${errText.slice(0, 300)}` };
    }
    const body = await resp.json().catch(() => null);
    await logEmail(params, { status: "sent", providerId: body?.id ?? null });
    return { status: "sent" };
  } catch (error) {
    console.error("[send-email] falha ao enviar", error);
    const message = error instanceof Error ? error.message : String(error);
    await logEmail(params, { status: "failed", error: message });
    return { status: "failed", error: message };
  }
}
