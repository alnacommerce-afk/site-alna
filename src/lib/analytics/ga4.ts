import { supabase } from "@/integrations/supabase/client";

// Injects the GA4 tracking snippet only if an admin has set a Measurement ID (Admin >
// Configurações) — the site ships with no tracking by default.
let injected = false;

export async function injectGa4IfConfigured() {
  if (injected) return;
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("ga4_measurement_id")
      .eq("id", "default")
      .maybeSingle();
    const measurementId = data?.ga4_measurement_id;
    if (!measurementId) return;
    injected = true;

    const loader = document.createElement("script");
    loader.async = true;
    loader.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(loader);

    const inline = document.createElement("script");
    inline.text = `window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}', { linker: { domains: ['alna.sale', 'store.alna.sale'] } });`;
    document.head.appendChild(inline);

    // gtag.js normally strips its own "_gl" linker param from the visible URL right after
    // reading it, but that cleanup only happens near page load — since we inject the tag late
    // (on purpose, to not block the first paint), that window has already passed. Clean it up
    // ourselves so a visitor arriving from alna.sale doesn't keep seeing the "_gl=..." junk.
    if (window.location.search.includes("_gl=")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("_gl");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  } catch {
    // Analytics is best-effort — never let a failed fetch break the page.
  }
}
