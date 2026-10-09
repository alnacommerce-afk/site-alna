// Random, single-use coupons: every customer gets a code of their own, tied to their e-mail. The admin-controlled
// "modelo" coupon (Admin > Marketing > Cupons > Cupons aleatórios) only supplies the percentage and the minimum
// order; each code is a copy that expires, stops working after the first paid order (usage is counted by the orders
// trigger when payment is confirmed) and remembers which model it came from (source_coupon_id), so the admin can
// count how many were generated and used per model.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { randomPassword } from "./random-password.ts";

const VALID_DAYS = 7;
const COOLDOWN_DAYS = 30;
const REWARD_VALID_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PersonalCoupon = {
  code: string;
  discountPercent: number;
  minOrderCents: number;
  validUntil: Date;
};

// `id` is the model coupon the code was copied from.
type Model = { id?: string; discountPercent: number; minOrderCents: number };

async function createCoupon(
  admin: SupabaseClient,
  email: string,
  model: Model,
  validDays: number,
  prefix: string,
): Promise<PersonalCoupon | null> {
  const validUntil = new Date(Date.now() + validDays * DAY_MS);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `${prefix}-${randomPassword(6).toUpperCase()}`;
    const { error } = await admin.from("coupons").insert({
      code,
      discount_percent: model.discountPercent,
      min_order_cents: model.minOrderCents,
      active: true,
      max_uses: 1,
      valid_until: validUntil.toISOString(),
      personal_for_email: email,
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

// Abandoned-cart coupon. Rules (agreed with the owner), looking only at coupons of the SAME model:
//   - latest coupon of this e-mail still valid and unused  -> send that same code again;
//   - otherwise, if it was issued less than 30 days ago     -> no coupon this time;
//   - otherwise (none yet, or issued 30+ days ago)          -> issue a new one (valid 7 days).
export async function getPersonalCoupon(
  admin: SupabaseClient,
  email: string,
  model: Model,
): Promise<PersonalCoupon | null> {
  const normalized = email.trim().toLowerCase();
  const now = Date.now();

  let lastQuery = admin
    .from("coupons")
    .select("code, discount_percent, min_order_cents, valid_until, uses_count, created_at")
    .eq("personal_for_email", normalized);
  if (model.id) lastQuery = lastQuery.eq("source_coupon_id", model.id);
  const { data: last } = await lastQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();

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

  return createCoupon(admin, normalized, model, VALID_DAYS, "VOLTA");
}

// Referral reward: EVERY paid purchase through someone's link earns that someone a new code of their own (no
// 30-day wait, no reuse), valid for 30 days.
export function issueRewardCoupon(admin: SupabaseClient, email: string, model: Model) {
  return createCoupon(admin, email.trim().toLowerCase(), model, REWARD_VALID_DAYS, "INDIQUE");
}
