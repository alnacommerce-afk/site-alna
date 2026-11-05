// Escolha de cookies do visitante (LGPD). Fica no navegador: a escolha vale só para este aparelho.
// Necessários funcionam sempre; analytics (GA4) e marketing (Meta Pixel) dependem do "sim" do visitante.

export type CookieConsent = { analytics: boolean; marketing: boolean };

const STORAGE_KEY = "alna_cookie_consent";
const CHANGED_EVENT = "alna:cookie-consent-changed";
const OPEN_EVENT = "alna:open-cookie-preferences";

export function readCookieConsent(): CookieConsent | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    return { analytics: parsed.analytics === true, marketing: parsed.marketing === true };
  } catch {
    return null;
  }
}

export function saveCookieConsent(consent: CookieConsent) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Sem armazenamento (navegação privada, bloqueio): o banner volta na próxima visita.
  }
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function onCookieConsentChanged(listener: () => void) {
  window.addEventListener(CHANGED_EVENT, listener);
  return () => window.removeEventListener(CHANGED_EVENT, listener);
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onOpenCookiePreferences(listener: () => void) {
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
}
