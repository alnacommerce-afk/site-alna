// Remembers what a shopper already typed (CEP, and after a completed order, their full personal
// and address data) so they never have to retype it across the product page, cart and checkout —
// there's no customer login yet (guest checkout only), so this is per-browser via localStorage.
export type SavedCheckoutInfo = {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  zip: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

const STORAGE_KEY = "alna_checkout_info";

export function getSavedCheckoutInfo(): Partial<SavedCheckoutInfo> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCheckoutInfo(patch: Partial<SavedCheckoutInfo>) {
  try {
    const existing = getSavedCheckoutInfo();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...patch }));
  } catch {
    // ignore write failures (private browsing, quota, etc.)
  }
}
