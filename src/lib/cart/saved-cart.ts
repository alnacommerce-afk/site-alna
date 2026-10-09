// "Salvar carrinho": the shopper leaves an e-mail (and optionally a WhatsApp number) in the cart or checkout and
// agrees to receive up to 2 reminders about it. The server keeps one row per e-mail (save-cart); the browser only
// remembers the row's token, so later cart changes can be sent without the e-mail. Everything here is a no-op
// until the shopper has saved their cart.
import type { CartItem } from "@/lib/cart/cart-context";
import { getSavedCheckoutInfo } from "@/lib/checkout/saved-info";

const FUNCTIONS_URL = `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1`;
const STORAGE_KEY = "alna_saved_cart";
// Set when the shopper says "não quero lembretes": the checkout then does not save the cart by itself again.
const OPT_OUT_KEY = "alna_saved_cart_off";

// Set when the shopper agreed to cart reminders: by saving the cart (cart box / checkout) or by getting the
// welcome coupon in the pop-up (its text mentions the reminders). Only then the cart is saved by itself.
const CONSENT_KEY = "alna_saved_cart_consent";

export function hasReminderConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setReminderConsent() {
  try {
    localStorage.setItem(CONSENT_KEY, "1");
  } catch {
    // ignore
  }
}

export function remindersTurnedOff(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

export type SavedCartState = { token: string; emailMasked: string };

export function getSavedCartState(): SavedCartState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.token === "string" ? { token: parsed.token, emailMasked: parsed.emailMasked ?? "" } : null;
  } catch {
    return null;
  }
}

// Lets the cart box show "Carrinho salvo" the moment the cart is saved by itself (pop-up, checkout, e-mail link).
export const SAVED_CART_EVENT = "alna-saved-cart-changed";

export function setSavedCartState(state: SavedCartState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore write failures (private browsing, quota, etc.)
  }
  window.dispatchEvent(new Event(SAVED_CART_EVENT));
}

export function clearSavedCartState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(SAVED_CART_EVENT));
}

export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  return `${user.slice(0, 1)}${"*".repeat(Math.max(2, Math.min(user.length - 1, 6)))}@${domain}`;
}

const toLines = (items: CartItem[]) => items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));

/** Cart cart-key used to skip a sync when nothing changed. */
export function cartItemsKey(items: CartItem[]) {
  return items.map((i) => `${i.variantId}:${i.quantity}`).join("|");
}

export async function saveCartWithEmail(
  email: string,
  phone: string,
  items: CartItem[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const resp = await fetch(`${FUNCTIONS_URL}/save-cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, phone: phone || undefined, items: toLines(items) }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || typeof json.token !== "string") {
      return { ok: false, error: json.error ?? "Não foi possível salvar o carrinho agora." };
    }
    setSavedCartState({ token: json.token, emailMasked: maskEmail(email.trim().toLowerCase()) });
    try {
      localStorage.removeItem(OPT_OUT_KEY);
    } catch {
      // ignore
    }
    setReminderConsent();
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível salvar o carrinho agora." };
  }
}

/** True when the cart can be saved without asking again: e-mail known, reminders agreed to, not turned off. */
export function canAutoSaveCart(): boolean {
  if (getSavedCartState() || remindersTurnedOff() || !hasReminderConsent()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((getSavedCheckoutInfo().email ?? "").trim());
}

/** Saves the cart by itself for a shopper who already left an e-mail and agreed to the reminders. */
export async function autoSaveCart(items: CartItem[]) {
  if (items.length === 0 || !canAutoSaveCart()) return;
  const info = getSavedCheckoutInfo();
  await saveCartWithEmail((info.email ?? "").trim(), info.phone ?? "", items);
}

/** Sends the current items of an already saved cart (called, debounced, whenever the cart changes). */
export async function syncSavedCart(items: CartItem[]) {
  const state = getSavedCartState();
  if (!state) return;
  try {
    const resp = await fetch(`${FUNCTIONS_URL}/save-cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: state.token, items: toLines(items) }),
    });
    // The row is gone (e.g. removed by the admin): forget it, the shopper can save again.
    if (resp.status === 404) clearSavedCartState();
  } catch {
    // offline or server busy: the next change tries again
  }
}

export async function stopSavedCart() {
  const state = getSavedCartState();
  clearSavedCartState();
  try {
    localStorage.setItem(OPT_OUT_KEY, "1");
  } catch {
    // ignore
  }
  if (!state) return;
  try {
    await fetch(`${FUNCTIONS_URL}/save-cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: state.token, action: "stop" }),
    });
  } catch {
    // ignore
  }
}

export type RestoredCart = {
  items: (Omit<CartItem, "quantity"> & { quantity: number })[];
  unavailable: number;
  emailMasked: string;
};

export async function fetchSavedCart(token: string): Promise<RestoredCart | null> {
  try {
    const resp = await fetch(`${FUNCTIONS_URL}/get-saved-cart?token=${encodeURIComponent(token)}`);
    if (!resp.ok) return null;
    return (await resp.json()) as RestoredCart;
  } catch {
    return null;
  }
}
