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
  } catch {
    // Analytics is best-effort — never let a failed fetch break the page.
  }
}
