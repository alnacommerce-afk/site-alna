// The Home lives on the root domain; every other page (catalog, cart, checkout, account) lives on
// the store subdomain. Keep this in one place so switching hosts never means hunting through pages.
export const SITE_URL = "https://alnacommerce.com";
export const STORE_URL = "https://store.alnacommerce.com";

export const storeLink = (path = "/loja") => `${STORE_URL}${path}`;
