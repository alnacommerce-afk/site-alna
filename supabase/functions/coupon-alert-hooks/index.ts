// Called only by the orders trigger count_coupon_use_on_paid (via pg_net) — never by the browser.
// Tells the admin by e-mail when a limited coupon is running out:
//   - "low5": 5 or fewer uses left   - "low1": 1 or fewer left   - "over": already past the limit
//     (the customer's purchase is NOT blocked — the balance just goes negative: -1, -2...).
// The payload only names the coupon and the event; what is said in the e-mail is always re-read from
// the database, and nothing is sent if the real balance doesn't match the event.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { renderEmailTemplate } from "../_shared/render-template.ts";

const SITE_URL = "https://store.alna.sale";

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

type Event = "low5" | "low1" | "over";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { event, couponId } = (await req.json()) as { event?: Event; couponId?: string };
    if (!event || !couponId) return jsonResponse({ ok: true, ignored: "missing event/couponId" });

    const { data: coupon } = await admin
      .from("coupons")
      .select("code, max_uses, uses_count")
      .eq("id", couponId)
      .maybeSingle();
    if (!coupon || coupon.max_uses === null) return jsonResponse({ ok: true, ignored: "no limited coupon" });

    const remaining = coupon.max_uses - coupon.uses_count;
    const matches =
      (event === "over" && remaining < 0) ||
      (event === "low1" && remaining <= 1) ||
      (event === "low5" && remaining <= 5);
    if (!matches) return jsonResponse({ ok: true, ignored: "balance does not match event" });

    const { data: settings } = await admin
      .from("site_settings")
      .select("admin_notification_email")
      .eq("id", "default")
      .maybeSingle();
    if (!settings?.admin_notification_email) {
      return jsonResponse({ ok: true, skipped: "no admin_notification_email" });
    }

    const resumo = `Já foram usados ${coupon.uses_count} de ${coupon.max_uses}.`;
    let titulo: string;
    let mensagem: string;
    if (event === "over") {
      titulo = `esgotou (saldo ${remaining})`;
      mensagem = `O cupom <strong>${coupon.code}</strong> já tinha acabado e mais um pedido pago o usou: saldo <strong>${remaining}</strong>. ${resumo} A compra do cliente foi liberada normalmente. Aumente o limite para zerar o saldo negativo.`;
    } else if (event === "low1") {
      titulo = remaining <= 0 ? "acabou" : "resta apenas 1 uso";
      mensagem = `O cupom <strong>${coupon.code}</strong> está no fim: saldo <strong>${remaining}</strong>. ${resumo} Reponha agora para nunca zerar.`;
    } else {
      titulo = `restam ${remaining} usos`;
      mensagem = `O cupom <strong>${coupon.code}</strong> está acabando: restam <strong>${remaining}</strong> usos. ${resumo}`;
    }

    const resendKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "resend" })
      .then((r) => r.data as string | null);
    const rendered = await renderEmailTemplate(admin, "coupon_alert", {
      cupom: coupon.code,
      titulo,
      mensagem,
      link_cupons: `${SITE_URL}/admin/marketing/cupons`,
    });
    if (rendered) {
      await sendEmail(resendKey, {
        to: settings.admin_notification_email,
        subject: rendered.subject,
        html: rendered.html,
        template: rendered.templateId,
      });
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("[coupon-alert-hooks]", error);
    const message = error instanceof Error ? error.message : "Erro ao processar alerta de cupom.";
    return jsonResponse({ error: message }, 500);
  }
});
