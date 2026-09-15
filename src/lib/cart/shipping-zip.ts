const STORAGE_KEY = "alna_shipping_zip";

export function getStoredShippingZip(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setStoredShippingZip(zip: string) {
  try {
    localStorage.setItem(STORAGE_KEY, zip);
  } catch {
    // ignore write failures (private browsing, quota, etc.)
  }
}
