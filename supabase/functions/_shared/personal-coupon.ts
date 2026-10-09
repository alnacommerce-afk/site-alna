// Personal, single-use coupon for the abandoned-cart e-mail. The admin-controlled coupon linked to the
// "cart_reminder_24h" template (ALNA10%OFF) is only the MODEL: its percentage and minimum are copied
// into a one-off code that is tied to the customer's e-mail, expires in a few days and stops working
// after the first paid order (usage is counted by the orders trigger when payment is confirmed).
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { randomPassword } from "./random-password.ts";

const VALID_DAYS = 7;
const COOLDOWN_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PersonalCoupon = {
  code: string;
  discountPercent: number;
  minOrderCents: number;
  validUntil: Date;
};

// `id` is the model coupon the code was copied from: it is stored on the new coupon (source_coupon_id) so the
// admin can count how many were generated and used per model.
type Model = { id?: string; discountPercent: number; minOrderCents: number };

// Rules (agreed with the owner):
//   - latest personal coupon of this e-mail still valid and unused  -> send that same code again;
//   - otherwise, if it was issued less than 30 days ago               -> no coupon this time;
//   - otherwise (none yet, or issued 30+ days ago)                    -> issue a new one.
export async function getPersonalCoupon(
  admin: SupabaseClient,
  email: string,
  model: Model,
): Promise<PersonalCoupon | null> {
  const normalized = email.trim().toLowerCase();
  const now = Date.now();

  const { data: last } = await admin
    .from("coupons")
    .select("code, discount_percent, min_order_cents, valid_until, uses_count, created_at")
    .eq("personal_for_email", normalized)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last) {
    const issuedAt = new Date(last.created_at).getTime();
    const stillValid = last.valid_until ? new Date(last.valid_until).getTime() > now : false;
    if (stillValid && last.uses_count === 0) {
      return {
        code: last.code,
        discountPercent: Number(last.discount_percent),
        minOrderCents: Number(last.min_order_cents ?? 0),
        validUntil: new Date(last.valid_until as string),
      };
    }
    if (now - issuedAt < COOLDOWN_DAYS * DAY_MS) return null;
  }

  const validUntil = new Date(now + VALID_DAYS * DAY_MS);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `VOLTA-${randomPassword(6).toUpperCase()}`;
    const { error } = await admin.from("coupons").insert({
      code,
      discount_percent: model.discountPercent,
      min_order_cents: model.minOrderCents,
      active: true,
      max_uses: 1,
      valid_until: validUntil.toISOString(),
      personal_for_email: normalized,
      auto_generated: true,
      source_coupon_id: model.id ?? null,
    });
    if (!error) {
      return { code, discountPercent: model.discountPercent, minOrderCents: model.minOrderCents, validUntil };
    }
    if (error.code !== "23505") {
      console.error("[personal-coupon] falha ao gerar cupom pessoal", error);
      return null;
    }
  }
  return null;
}
