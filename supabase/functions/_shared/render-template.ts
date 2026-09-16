// Renders an admin-editable row from the `email_templates` table by substituting `{{token}}`
// placeholders. Templates are edited from Admin > Marketing > Fluxo de E-mail without a code
// deploy — this is the only place that knows how to turn a template + data into an actual e-mail.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export async function renderEmailTemplate(
  admin: SupabaseClient,
  templateId: string,
  tokens: Record<string, string>,
): Promise<{ subject: string; html: string } | null> {
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

  return { subject: fill(data.subject), html: fill(data.html_body) };
}
