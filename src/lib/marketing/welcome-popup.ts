// When the welcome pop-up of the store (/loja) may appear. Kept free of UI code on purpose: only this small file
// is part of the page's first download; the pop-up itself (welcome-popup.tsx) is downloaded later, only when it is
// really about to be shown.
//
// The pop-up shows up only when ALL of these are true:
//   1. the page has finished loading and the browser went idle (nothing competes with the page itself);
//   2. 8 more seconds passed;
//   3. a real person interacted with the page (scrolled, clicked, touched or typed).
// Crawlers and speed-test robots don't interact, so they never see it — everybody gets the same page, nothing is
// hidden by "who is asking". A person who closed it does not see it for 14 days; a person who asked for the coupon
// (or who already left an e-mail, bought, or saved a cart) never sees it again.
import { getSavedCheckoutInfo } from "@/lib/checkout/saved-info";
import { getSavedCartState } from "@/lib/cart/saved-cart";

const STORAGE_KEY = "alna_welcome";
const DISMISS_DAYS = 14;
const WAIT_AFTER_LOAD_MS = 8000;

type WelcomeState = { claimed?: boolean; dismissedUntil?: number };

function readState(): WelcomeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WelcomeState) : {};
  } catch {
    return {};
  }
}

function writeState(patch: WelcomeState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readState(), ...patch }));
  } catch {
    // ignore write failures (private browsing, quota, etc.)
  }
}

export function markWelcomeClaimed() {
  writeState({ claimed: true });
}

export function markWelcomeDismissed() {
  writeState({ dismissedUntil: Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000 });
}

export function welcomePopupAllowed(): boolean {
  try {
    const state = readState();
    if (state.claimed) return false;
    if (state.dismissedUntil && state.dismissedUntil > Date.now()) return false;
    // Already known to the store: left an e-mail at the checkout / bought before, or saved a cart.
    if (getSavedCheckoutInfo().email) return false;
    if (getSavedCartState()) return false;
    return true;
  } catch {
    return false;
  }
}

/** Calls `show` once, when the conditions above are met. Returns a function that cancels everything. */
export function scheduleWelcomePopup(show: () => void): () => void {
  if (!welcomePopupAllowed()) return () => {};

  let waited = false;
  let interacted = false;
  let finished = false;
  let timer: number | undefined;

  const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart", "wheel"];

  function cleanup() {
    finished = true;
    window.clearTimeout(timer);
    window.removeEventListener("load", onLoaded);
    window.removeEventListener("scroll", onScroll);
    for (const name of events) window.removeEventListener(name, onInteract);
  }

  function check() {
    if (finished || !waited || !interacted) return;
    cleanup();
    show();
  }

  function onInteract() {
    interacted = true;
    check();
  }

  function onScroll() {
    if (window.scrollY > 200) onInteract();
  }

  function onLoaded() {
    const afterIdle = () => {
      timer = window.setTimeout(() => {
        waited = true;
        check();
      }, WAIT_AFTER_LOAD_MS);
    };
    if ("requestIdleCallback" in window) {
      (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(
        afterIdle,
        { timeout: 5000 },
      );
    } else {
      afterIdle();
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  for (const name of events) window.addEventListener(name, onInteract, { passive: true });
  if (document.readyState === "complete") onLoaded();
  else window.addEventListener("load", onLoaded);

  return cleanup;
}
