// Public — only ever called by the pg_cron job, every 5 minutes. Sends the abandoned-cart reminders of the carts
// the shoppers chose to save (see save-cart):
//   1) 1 hour without activity and no purchase  -> e-mail "abandoned_cart_1h"  (no coupon);
//   2) 24 hours without activity, still no purchase -> e-mail "abandoned_cart_24h" (personal single-use coupon).
// Never charges anything and only reads/updates abandoned_carts, so being public is safe: each reminder is
// claimed with an UPDATE ... WHERE reminder_X_sent_at IS NULL before sending, which makes every run idempotent.
// Nothing is sent between 22h and 8h (Brasília time): the reminder waits for the morning.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { renderEmailTemplate, resolveTemplateCoupon } from "../_shared/render-template.ts";
import { getPersonalCoupon } from "../_shared/personal-coupon.ts";
import {
  cartSubtotalCents,
  loadLiveCartLines,
  sanitizeCartLines,
  type LiveCartLine,
} from "../_shared/cart-items.ts";

const SITE_URL = "https://store.alna.sale";
const HOUR_MS = 60 * 60 * 1000;
const QUIET_FROM_HOUR = 22;
const QUIET_UNTIL_HOUR = 8;
const BATCH = 40;

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

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function saoPauloHour(date: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hourCycle: "h23" }).format(date),
  );
  return hour % 24;
}

function buildItemsHtml(lines: LiveCartLine[]) {
  const rows = lines
    .map((line) => {
      const link = `${SITE_URL}/produto/${line.productSlug}`;
      const variant =
        line.variantName && line.variantName.trim().toLowerCase() !== "padrão"
          ? `<br /><span style="color:#6b7280;font-size:12px;">${escapeHtml(line.variantName)}</span>`
          : "";
      const image = line.thumbnailUrl
        ? `<a href="${link}" style="text-decoration:none;"><img src="${line.thumbnailUrl}" alt="${escapeHtml(line.productTitle)}" width="72" style="display:block;width:72px;height:auto;border:0;border-radius:8px;" /></a>`
        : "";
      return `<tr>
        <td width="80" valign="middle" style="padding:8px 0;">${image}</td>
        <td valign="middle" style="padding:8px 12px;font-size:14px;line-height:1.35;color:#12294f;"><a href="${link}" style="color:#12294f;text-decoration:none;"><strong>${escapeHtml(line.productTitle)}</strong></a>${variant}</td>
        <td valign="middle" align="right" style="padding:8px 0;font-size:14px;white-space:nowrap;color:#12294f;">${line.quantity} × ${formatBRL(line.priceCents)}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">${rows}</table>`;
}

function buildCartButton(link: string) {
  return `<p style="margin:20px 0;text-align:center;"><a href="${link}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:14px 28px;border-radius:8px;font-size:16px;font-weight:bold;text-decoration:none;">Voltar ao meu carrinho</a></p>`;
}

type CartRow = {
  id: string;
  token: string;
  email: string;
  items: unknown;
  last_activity_at: string;
  reminder_1_sent_at: string | null;
  reminder_2_sent_at: string | null;
};

const CART_COLUMNS = "id, token, email, items, last_activity_at, reminder_1_sent_at, reminder_2_sent_at";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const hour = saoPauloHour(new Date());
    if (hour >= QUIET_FROM_HOUR || hour < QUIET_UNTIL_HOUR) {
      return jsonResponse({ ok: true, quietHours: true, sent1h: 0, sent24h: 0 });
    }

    const resendKey = await admin
      .rpc("get_integration_secret", { p_integration_id: "resend" })
      .then((r) => r.data as string | null);
    const { data: suppressions } = await admin.from("email_suppressions").select("email");
    const suppressed = new Set((suppressions ?? []).map((s) => s.email.toLowerCase()));

    const now = Date.now();
    const oneHourAgo = new Date(now - HOUR_MS).toISOString();
    const oneDayAgo = new Date(now - 24 * HOUR_MS).toISOString();
    // The 2nd reminder never goes out in the same run (or the same morning) as the 1st.
    const sixHoursAgo = new Date(now - 6 * HOUR_MS).toISOString();

    // Which stage a cart is at is decided by the dates below; `stage` only picks the template.
    async function remind(cart: CartRow, stage: 1 | 2): Promise<boolean> {
      const column = stage === 1 ? "reminder_1_sent_at" : "reminder_2_sent_at";

      // Already bought (or started buying) since the cart was last touched? Then the order flow takes over.
      const since = new Date(new Date(cart.last_activity_at).getTime() - 3 * HOUR_MS).toISOString();
      const { data: order } = await admin
        .from("orders")
        .select("id")
        .ilike("customer_email", cart.email)
        .gte("created_at", since)
        .limit(1)
        .maybeSingle();
      if (order) {
        await admin
          .from("abandoned_carts")
          .update({ recovered_at: new Date().toISOString(), recovered_order_id: order.id })
          .eq("id", cart.id)
          .is("recovered_at", null);
        return false;
      }

      // Claim: only one run can win this update, so a reminder is never sent twice.
      const claimedAt = new Date().toISOString();
      const { data: claimed } = await admin
        .from("abandoned_carts")
        .update({ [column]: claimedAt })
        .eq("id", cart.id)
        .is(column, null)
        .select("id")
        .maybeSingle();
      if (!claimed) return false;

      async function release() {
        await admin.from("abandoned_carts").update({ [column]: null }).eq("id", cart.id);
      }

      if (suppressed.has(cart.email.toLowerCase())) {
        // Left the list: close the whole cycle without sending anything.
        await admin
          .from("abandoned_carts")
          .update({ stopped_at: claimedAt })
          .eq("id", cart.id);
        return false;
      }

      const live = await loadLiveCartLines(admin, sanitizeCartLines(cart.items));
      if (live.length === 0) {
        // Everything in the cart is gone from the store (sold out / unpublished): nothing to remind about.
        await admin.from("abandoned_carts").update({ stopped_at: claimedAt }).eq("id", cart.id);
        return false;
      }

      const total = formatBRL(cartSubtotalCents(live));
      const baseLink = `${SITE_URL}/carrinho?c=${cart.token}`;
      const tokens: Record<string, string> = {
        itens_html: buildItemsHtml(live),
        total,
        botao_carrinho: buildCartButton(baseLink),
        cupom_bloco_html: "",
        chamada: "falta pouco para fechar",
      };

      if (stage === 2) {
        // The coupon linked to the template is only the MODEL; each shopper gets a personal single-use code.
        const model = await resolveTemplateCoupon(admin, "abandoned_cart_24h");
        const personal = model ? await getPersonalCoupon(admin, cart.email, model) : null;
        if (personal) {
          tokens.chamada = `${personal.discountPercent}% OFF para fechar hoje`;
          tokens.botao_carrinho = buildCartButton(`${baseLink}&cupom=${encodeURIComponent(personal.code)}`);
          tokens.cupom_bloco_html = `<div style="text-align:center;margin:20px 0;padding:18px 16px;background:#f0fdf4;border:1px dashed #16a34a;border-radius:12px;">
            <p style="margin:0 0 8px;font-size:15px;color:#12294f;">Preparamos um cupom só seu para fechar a compra:</p>
            <p style="margin:0;font-size:22px;font-weight:bold;letter-spacing:0.5px;color:#16a34a;">${escapeHtml(personal.code)}</p>
            <p style="margin:10px 0 0;font-size:13px;color:#4b5563;">${personal.discountPercent}% de desconto${personal.minOrderCents > 0 ? ` em compras acima de ${formatBRL(personal.minOrderCents)}` : ""}. Vale até ${personal.validUntil.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} e só pode ser usado uma vez. Ele já vem preenchido no carrinho.</p>
          </div>`;
        }
      }

      const rendered = await renderEmailTemplate(
        admin,
        stage === 1 ? "abandoned_cart_1h" : "abandoned_cart_24h",
        tokens,
        {
          unsubscribeLink: `${supabaseUrl}/functions/v1/unsubscribe-email?email=${encodeURIComponent(cart.email)}`,
          recipientEmail: cart.email,
        },
      );
      if (!rendered) {
        await release();
        return false;
      }
      const result = await sendEmail(resendKey, {
        to: cart.email,
        subject: rendered.subject,
        html: rendered.html,
        template: rendered.templateId,
      });
      if (result.status !== "sent") {
        // Not delivered to the provider: try again on the next run instead of losing the reminder.
        await release();
        return false;
      }
      return true;
    }

    let sent1h = 0;
    let sent24h = 0;

    const { data: due1 } = await admin
      .from("abandoned_carts")
      .select(CART_COLUMNS)
      .is("recovered_at", null)
      .is("stopped_at", null)
      .gt("item_count", 0)
      .is("reminder_1_sent_at", null)
      .lte("last_activity_at", oneHourAgo)
      .order("last_activity_at", { ascending: true })
      .limit(BATCH);
    for (const cart of (due1 ?? []) as CartRow[]) {
      if (await remind(cart, 1)) sent1h++;
    }

    const { data: due2 } = await admin
      .from("abandoned_carts")
      .select(CART_COLUMNS)
      .is("recovered_at", null)
      .is("stopped_at", null)
      .gt("item_count", 0)
      .lte("reminder_1_sent_at", sixHoursAgo)
      .is("reminder_2_sent_at", null)
      .lte("last_activity_at", oneDayAgo)
      .order("last_activity_at", { ascending: true })
      .limit(BATCH);
    for (const cart of (due2 ?? []) as CartRow[]) {
      if (await remind(cart, 2)) sent24h++;
    }

    // Privacy: a saved cart (and its e-mail) is erased after 90 days without movement.
    const ninetyDaysAgo = new Date(now - 90 * 24 * HOUR_MS).toISOString();
    await admin.from("abandoned_carts").delete().lt("last_activity_at", ninetyDaysAgo);

    return jsonResponse({ ok: true, sent1h, sent24h });
  } catch (error) {
    console.error("[process-abandoned-carts]", error);
    const message = error instanceof Error ? error.message : "Erro ao processar carrinhos.";
    return jsonResponse({ error: message }, 500);
  }
});
