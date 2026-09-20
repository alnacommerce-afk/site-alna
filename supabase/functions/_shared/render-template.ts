// Renders an admin-editable row from the `email_templates` table by substituting `{{token}}`
// placeholders, then wraps it in the same branded shell for every e-mail the store sends — the
// admin only ever edits the inner message, never the header/footer/colors, so every e-mail keeps
// a consistent, recognizable look without anyone writing HTML boilerplate.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

// The only image in any e-mail. Served by the static Home (see /home-cloudflare/assets).
const LOGO_URL = "https://alna.sale/assets/logo-alna.png";

export function wrapBranded(innerHtml: string, options?: { unsubscribeLink?: string }): string {
  const unsubscribeBlock = options?.unsubscribeLink
    ? `<p style="margin-top:16px;font-size:12px;">
         <a href="${options.unsubscribeLink}" style="color:#9ca3af;">Não quero mais receber esses avisos</a>
       </p>`
    : "";

  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; background:#ffffff;">
    <div style="background:#12294f; padding:20px 24px; text-align:center;">
      <img src="${LOGO_URL}" alt="Alna Commerce" width="140" style="display:inline-block; height:auto; border:0;">
    </div>
    <div style="padding:28px 24px; color:#12294f; font-size:15px; line-height:1.55;">
      ${innerHtml}
    </div>
    <div style="background:#f9fafb; padding:20px 24px; text-align:center; font-size:12px; color:#6b7280;">
      <p style="margin:0;">Alna Commerce — CNPJ 57.135.009/0001-27</p>
      <p style="margin:4px 0 0;">Brusque, SC — Dúvidas? Fale com a gente pelo WhatsApp.</p>
      ${unsubscribeBlock}
    </div>
  </div>`;
}

// Looks up the coupon configured on a template (via Admin > Marketing > Fluxo de E-mail) and
// checks it's still active and within its validity window. Always resolved fresh at send time —
// if the coupon was deleted, `coupon_id` already went back to null via `on delete set null`.
export async function resolveTemplateCoupon(
  admin: SupabaseClient,
  templateId: string,
): Promise<{ code: string; discountPercent: number } | null> {
  const { data: template } = await admin
    .from("email_templates")
    .select("coupon_id")
    .eq("id", templateId)
    .maybeSingle();
  if (!template?.coupon_id) return null;

  const { data: coupon } = await admin
    .from("coupons")
    .select("code, discount_percent, valid_from, valid_until, active")
    .eq("id", template.coupon_id)
    .maybeSingle();
  if (!coupon) return null;

  const now = new Date();
  const validNow =
    coupon.active &&
    (!coupon.valid_from || new Date(coupon.valid_from) <= now) &&
    (!coupon.valid_until || new Date(coupon.valid_until) >= now);
  if (!validNow) return null;

  return { code: coupon.code, discountPercent: Number(coupon.discount_percent) };
}

export async function renderEmailTemplate(
  admin: SupabaseClient,
  templateId: string,
  tokens: Record<string, string>,
  options?: { unsubscribeLink?: string },
): Promise<{ subject: string; html: string; templateId: string } | null> {
  const { data, error } = await admin
    .from("email_templates")
    .select("subject, html_body")
    .eq("id", templateId)
    .maybeSingle();
  if (error || !data) {
    console.error("[render-template] template não encontrado:", templateId, error);
    return null;
  }

  const fill = (text: string) =>
    text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => tokens[key] ?? "");

  return {
    subject: fill(data.subject),
    html: wrapBranded(fill(data.html_body), options),
    templateId,
  };
}
