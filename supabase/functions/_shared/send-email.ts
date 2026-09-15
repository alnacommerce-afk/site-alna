// Thin Resend wrapper shared by checkout-create and asaas-webhook. Never throws — a failed or
// unconfigured email must never break an order; it only logs.
const RESEND_API = "https://api.resend.com/emails";
const FROM_ADDRESS = "Alna Commerce <pedidos@alnacommerce.com>";

export async function sendEmail(
  resendKey: string | null,
  params: { to: string; subject: string; html: string },
): Promise<void> {
  if (!resendKey) {
    console.log("[send-email] Resend não configurado (Admin > Conexões) — pulando envio para", params.to);
    return;
  }
  try {
    const resp = await fetch(RESEND_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_ADDRESS, to: params.to, subject: params.subject, html: params.html }),
    });
    if (!resp.ok) {
      console.error("[send-email] Resend respondeu", resp.status, await resp.text());
    }
  } catch (error) {
    console.error("[send-email] falha ao enviar", error);
  }
}
