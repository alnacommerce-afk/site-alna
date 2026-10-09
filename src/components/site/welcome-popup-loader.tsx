import { lazy, Suspense, useEffect, useState } from "react";

import { useSiteSettings } from "@/lib/site-data";
import { scheduleWelcomePopup } from "@/lib/marketing/welcome-popup";

// The pop-up itself is a separate download that only starts when it is about to be shown (after the page loaded,
// the browser was idle, a person interacted): the first load of /loja does not get any heavier.
const WelcomePopup = lazy(() => import("@/components/site/welcome-popup"));

/** Mounted on /loja only. Does nothing until the conditions in welcome-popup.ts are met. */
export function WelcomePopupLoader() {
  const { data: settings } = useSiteSettings();
  // null = the BOAS_VINDAS coupon is turned off in the admin: no pop-up.
  const percent = settings?.welcome_coupon_percent != null ? Number(settings.welcome_coupon_percent) : null;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (percent == null || percent <= 0) return;
    return scheduleWelcomePopup(() => setOpen(true));
  }, [percent]);

  if (!open || percent == null) return null;
  return (
    <Suspense fallback={null}>
      <WelcomePopup percent={percent} onClose={() => setOpen(false)} />
    </Suspense>
  );
}
