// A coupon from ?cupom=CODIGO in the URL (the coupon button of the marketing e-mail) is kept in sessionStorage,
// so only in this tab: closing the tab forgets it, and reopening the site means copying the coupon from the e-mail.
// It shows up already typed in the cart's coupon field. It is only a pre-fill: the coupon is still validated
// when the customer clicks "Aplicar".
const STORAGE_KEY = "alna_pending_coupon";

export function capturePendingCouponFromUrl(): string | null {
  try {
    const code = new URLSearchParams(window.location.search).get("cupom")?.trim().toUpperCase();
    if (!code) return null;
    sessionStorage.setItem(STORAGE_KEY, code.slice(0, 40));
    return code;
  } catch {
    return null;
  }
}

/** Keeps a coupon (e.g. the welcome coupon) typed and waiting in the cart's coupon field. */
export function setPendingCoupon(code: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, code.trim().toUpperCase().slice(0, 40));
  } catch {
    // ignore
  }
}

export function getPendingCoupon(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingCoupon() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
