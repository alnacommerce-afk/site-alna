/* Banner de cookies da Home e da /atacado (LGPD). Mesmo padrão visual do site da loja.
   O GA4 só carrega depois que o visitante aceita "Análise de uso". Carrega com a página ociosa,
   para não competir com a primeira pintura. A escolha fica no navegador do visitante. */
(function () {
  var KEY = 'alna_cookie_consent', GA_ID = 'G-HXX69DW2QK';

  function read() {
    try {
      var p = JSON.parse(localStorage.getItem(KEY));
      return p ? { analytics: p.analytics === true, marketing: false } : null;
    } catch (e) { return null; }
  }
  function save(analytics) {
    try { localStorage.setItem(KEY, JSON.stringify({ analytics: analytics, marketing: false })); } catch (e) {}
  }

  var gaLoaded = false;
  function loadGA() {
    if (gaLoaded) return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { linker: { domains: ['alna.sale', 'store.alna.sale'] } });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    // Google Tag Manager (GTM-P5PV9CFG): mesmo aceite do GA4, mesma hora. Não criar aqui o GA4 de novo.
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-P5PV9CFG';
    document.head.appendChild(g);
  }

  var css = '' +
    '.ck-banner{position:fixed;bottom:16px;left:16px;right:16px;max-width:384px;margin:0 auto;z-index:60;' +
    'background:#12294f;color:#fff;border-radius:12px;padding:20px;box-shadow:0 20px 40px -12px rgba(0,0,0,.45);' +
    'font:400 14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
    '.ck-banner p{margin:0}' +
    '.ck-banner a,.ck-banner .ck-link{color:#fff;text-decoration:underline;text-underline-offset:2px;background:none;border:0;padding:0;font:inherit;cursor:pointer}' +
    '.ck-row{display:grid;grid-template-columns:1fr;gap:8px;margin-top:16px}' +
    '.ck-btn{width:100%;border-radius:8px;padding:11px 14px;font:700 14px system-ui,sans-serif;cursor:pointer;border:2px solid transparent}' +
    '.ck-accept{background:#16a34a;color:#fff}.ck-accept:hover{background:#15803d}' +
    '.ck-reject{background:transparent;color:#fff;border-color:rgba(255,255,255,.6)}.ck-reject:hover{background:rgba(255,255,255,.1)}' +
    '.ck-panel{margin-top:14px;display:none;gap:10px;flex-direction:column}' +
    '.ck-panel.open{display:flex}' +
    '.ck-panel label{display:flex;gap:10px;align-items:flex-start;cursor:pointer}' +
    '.ck-panel small{display:block;color:rgba(255,255,255,.75)}' +
    '@media (min-width:640px){.ck-banner{left:24px;right:auto;bottom:24px;margin:0}.ck-row{grid-template-columns:1fr 1fr}}';

  function build() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var box = document.createElement('div');
    box.className = 'ck-banner';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Uso de cookies');
    box.innerHTML =
      '<p>Nosso site utiliza cookies para garantir seu correto funcionamento e um serviço personalizado. ' +
      'Acesse o menu <button type="button" class="ck-link" data-ck="manage"><u>Gerenciar Preferências</u></button> ' +
      'para configurar ou rejeitar a coleta de cookies. Veja a <a href="https://store.alna.sale/politica-de-privacidade">Política de Privacidade</a>.</p>' +
      '<div class="ck-row" data-ck="main">' +
      '<button type="button" class="ck-btn ck-accept" data-ck="accept">Aceitar todos</button>' +
      '<button type="button" class="ck-btn ck-reject" data-ck="reject">Rejeitar</button>' +
      '</div>' +
      '<div class="ck-panel" data-ck="panel">' +
      '<label><input type="checkbox" disabled checked> <span><b>Necessários (sempre ativos)</b><small>Carrinho, login e segurança do site.</small></span></label>' +
      '<label><input type="checkbox" data-ck="analytics"> <span><b>Análise de uso</b><small>Google Analytics: ajuda a entender como o site é usado.</small></span></label>' +
      '<button type="button" class="ck-btn ck-accept" data-ck="save">Salvar preferências</button>' +
      '</div>';
    document.body.appendChild(box);

    function hide() { box.remove(); }
    box.addEventListener('click', function (ev) {
      var el = ev.target.closest('[data-ck]');
      if (!el) return;
      var action = el.getAttribute('data-ck');
      if (action === 'accept') { save(true); loadGA(); hide(); }
      if (action === 'reject') { save(false); hide(); }
      if (action === 'manage') { box.querySelector('[data-ck="panel"]').classList.add('open'); }
      if (action === 'save') {
        var on = box.querySelector('[data-ck="analytics"]').checked;
        save(on); if (on) loadGA(); hide();
      }
    });
    return box;
  }

  function showBanner() {
    if (read() !== null) return;
    build();
  }

  window.addEventListener('load', function () {
    var c = read();
    var go = function () { if (c && c.analytics) loadGA(); showBanner(); };
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 2000);
  });

  // Link "Preferências de cookies" no rodapé: reabre o banner para trocar a escolha.
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('[data-cookie-prefs]');
    if (!a) return;
    ev.preventDefault();
    var existing = document.querySelector('.ck-banner');
    if (existing) existing.remove();
    var box = build();
    box.querySelector('[data-ck="panel"]').classList.add('open');
    box.querySelector('[data-ck="analytics"]').checked = !!(read() && read().analytics);
  });
})();
