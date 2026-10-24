import { supabase } from "@/integrations/supabase/client";

// Injects the Meta Pixel only if an admin has set a Pixel ID (Admin > Configurações) — the site
// ships with no Meta tracking by default. Same pattern as ga4.ts: loaded after the first paint.
let injected = false;

export async function injectMetaPixelIfConfigured() {
  if (injected) return;
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("meta_pixel_id")
      .eq("id", "default")
      .maybeSingle();
    const pixelId = data?.meta_pixel_id?.trim();
    if (!pixelId || !/^\d+$/.test(pixelId)) return;
    injected = true;

    // Código base oficial do Meta Pixel (fbevents.js), com o ID da ALNA.
    const inline = document.createElement("script");
    inline.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init','${pixelId}');fbq('track','PageView');`;
    document.head.appendChild(inline);
  } catch {
    // Pixel é best-effort — nunca pode quebrar a página.
  }
}
