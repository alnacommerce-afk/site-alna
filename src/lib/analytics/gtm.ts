// Google Tag Manager (contêiner GTM-P5PV9CFG). Carrega só depois que o visitante aceita
// "Análise de uso" no banner de cookies (LGPD), junto com o GA4, e uma única vez por página.
// Atenção: o GA4 (G-DP9VE6XSRF) continua instalado direto; por isso NÃO criar dentro do GTM uma
// tag de configuração do mesmo GA4, senão a visita conta em dobro.
const GTM_ID = "GTM-P5PV9CFG";
let injected = false;

export function injectGtm() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    const loader = document.createElement("script");
    loader.async = true;
    loader.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
    document.head.appendChild(loader);
  } catch {
    // Best-effort: falha de medição nunca pode quebrar a página.
  }
}
