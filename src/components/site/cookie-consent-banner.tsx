import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  onCookieConsentChanged,
  onOpenCookiePreferences,
  readCookieConsent,
  saveCookieConsent,
} from "@/lib/cookies/consent";

// Banner de cookies no padrão visual do site: desktop no canto inferior esquerdo, celular centralizado embaixo.
export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    // Lido só no navegador para não divergir da renderização do servidor.
    const current = readCookieConsent();
    if (current === null) setShowBanner(true);
    if (current) {
      setAnalytics(current.analytics);
      setMarketing(current.marketing);
    }
    const offOpen = onOpenCookiePreferences(() => {
      const saved = readCookieConsent();
      setAnalytics(saved?.analytics ?? false);
      setMarketing(saved?.marketing ?? false);
      setPrefsOpen(true);
    });
    const offChanged = onCookieConsentChanged(() => {
      setShowBanner(false);
      setPrefsOpen(false);
    });
    return () => {
      offOpen();
      offChanged();
    };
  }, []);

  function acceptAll() {
    saveCookieConsent({ analytics: true, marketing: true });
  }

  function rejectAll() {
    saveCookieConsent({ analytics: false, marketing: false });
  }

  function savePreferences() {
    saveCookieConsent({ analytics, marketing });
    setPrefsOpen(false);
  }

  return (
    <>
      {showBanner && !prefsOpen ? (
        <div
          role="region"
          aria-label="Uso de cookies"
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-xl bg-[#12294f] p-5 text-white shadow-2xl sm:bottom-6 sm:left-6 sm:right-auto sm:mx-0"
        >
          <p className="text-sm leading-relaxed">
            Nosso site utiliza cookies para garantir seu correto funcionamento e um serviço
            personalizado. Acesse o menu{" "}
            <button
              type="button"
              onClick={() => setPrefsOpen(true)}
              className="font-semibold underline underline-offset-2 hover:text-white/80"
            >
              Gerenciar Preferências
            </button>{" "}
            para configurar ou rejeitar a coleta de cookies. Veja a{" "}
            <Link to="/politica-de-privacidade" className="underline underline-offset-2 hover:text-white/80">
              Política de Privacidade
            </Link>
            .
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              onClick={acceptAll}
              className="w-full bg-[#16a34a] font-bold text-white hover:bg-[#15803d]"
            >
              Aceitar todos
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={rejectAll}
              className="w-full border-white/60 bg-transparent font-bold text-white hover:bg-white/10 hover:text-white"
            >
              Rejeitar
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#12294f]">Preferências de cookies</DialogTitle>
            <DialogDescription>
              Escolha quais cookies podemos usar. Você pode mudar isso a qualquer momento pelo link
              "Preferências de cookies" no rodapé.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox id="cookie-necessary" checked disabled className="mt-0.5" />
              <Label htmlFor="cookie-necessary" className="text-sm leading-snug">
                <span className="font-semibold text-[#12294f]">Necessários (sempre ativos)</span>
                <span className="block text-muted-foreground">
                  Carrinho, login e segurança do site.
                </span>
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="cookie-analytics"
                checked={analytics}
                onCheckedChange={(v) => setAnalytics(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="cookie-analytics" className="text-sm leading-snug">
                <span className="font-semibold text-[#12294f]">Análise de uso</span>
                <span className="block text-muted-foreground">
                  Google Analytics: ajuda a entender como o site é usado.
                </span>
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="cookie-marketing"
                checked={marketing}
                onCheckedChange={(v) => setMarketing(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="cookie-marketing" className="text-sm leading-snug">
                <span className="font-semibold text-[#12294f]">Publicidade</span>
                <span className="block text-muted-foreground">
                  Meta Pixel: mede anúncios no Instagram e no Facebook.
                </span>
              </Label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={rejectAll}>
              Rejeitar tudo
            </Button>
            <Button
              type="button"
              onClick={savePreferences}
              className="bg-[#16a34a] font-bold text-white hover:bg-[#15803d]"
            >
              Salvar preferências
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
