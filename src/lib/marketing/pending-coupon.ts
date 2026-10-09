// A coupon from ?cupom=CODIGO in the URL (the coupon button of the marketing e-mail) is kept in
// localStorage until the customer reaches the cart, where it shows up already typed in the coupon
// field. It is only a pre-fill: the coupon is still validated when the customer clicks "Aplicar".
const STORAGE_KEY = "alna_pending_coupon";

export function capturePendingCouponFromUrl(): string | null {
  try {
    const code = new URLSearchParams(window.location.search).get("cupom")?.trim().toUpperCase();
    if (!code) return null;
    localStorage.setItem(STORAGE_KEY, code.slice(0, 40));
    return code;
  } catch {
    return null;
  }
}

/** Keeps a coupon (e.g. the welcome coupon) typed and waiting in the cart's coupon field. */
export function setPendingCoupon(code: string) {
  try {
    localStorage.setItem(STORAGE_KEY, code.trim().toUpperCase().slice(0, 40));
  } catch {
    // ignore
  }
}

export function getPendingCoupon(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingCoupon() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
