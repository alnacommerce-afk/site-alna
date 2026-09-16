// A referral code from ?ref=CODIGO in the URL sticks around in localStorage until checkout sends
// it along, the same way the cart's coupon persists — but it's independent of the cart/coupon
// state since it's about who gets credit for the sale, not a discount on this order.
const STORAGE_KEY = "alna_referral_code";

export function captureReferralCodeFromUrl() {
  try {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code) localStorage.setItem(STORAGE_KEY, code.trim().toUpperCase());
  } catch {
    // ignore write failures (private browsing, quota, etc.)
  }
}

export function getReferralCode(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
