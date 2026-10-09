import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import { saveCheckoutInfo } from "@/lib/checkout/saved-info";
import { useCart } from "@/lib/cart/cart-context";
import { autoSaveCart, setReminderConsent } from "@/lib/cart/saved-cart";
import { setPendingCoupon } from "@/lib/marketing/pending-coupon";
import { markWelcomeClaimed, markWelcomeDismissed } from "@/lib/marketing/welcome-popup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FUNCTIONS_URL = `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1`;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Result = { kind: "sent" | "already" | "existing_customer"; percent?: number };

const MESSAGES: Record<Result["kind"], { title: string; text: (percent?: number) => string }> = {
  sent: {
    title: "Cupom enviado!",
    text: (percent) =>
      `Mandamos seu cupom de ${percent ?? ""}% para o seu e-mail e já deixamos ele pronto no carrinho. Confira também o spam.`,
  },
  already: {
    title: "Seu cupom já foi enviado",
    text: () => "Esse e-mail já recebeu o cupom de boas-vindas. Procure na caixa de entrada (e no spam).",
  },
  existing_customer: {
    title: "Você já é de casa!",
    text: () => "O cupom de boas-vindas vale só para a primeira compra, mas você vai receber nossas novidades.",
  },
};

/** Small, non-blocking card (no dark overlay, nothing hidden behind it): welcome coupon in exchange for an e-mail. */
export default function WelcomePopup({ percent, onClose }: { percent: number; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const { items } = useCart();

  function dismiss() {
    if (!result) markWelcomeDismissed();
    onClose();
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const typed = email.trim();
    if (!EMAIL_RE.test(typed)) {
      setError("Informe um e-mail válido.");
      return;
    }
    setSending(true);
    try {
      const resp = await fetch(`${FUNCTIONS_URL}/welcome-coupon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: typed }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(json.error ?? "Não foi possível enviar agora. Tente de novo.");
        return;
      }
      if (json.state === "sent") {
        // The coupon waits, typed, in the cart; the checkout opens with the e-mail filled in.
        if (typeof json.code === "string") setPendingCoupon(json.code);
        saveCheckoutInfo({ email: typed });
        markWelcomeClaimed();
        setReminderConsent();
        void autoSaveCart(items);
        setResult({ kind: "sent", percent: json.percent });
      } else if (json.state === "already" || json.state === "existing_customer") {
        saveCheckoutInfo({ email: typed });
        markWelcomeClaimed();
        setReminderConsent();
        void autoSaveCart(items);
        setResult({ kind: json.state });
      } else {
        setError("O cupom de boas-vindas não está disponível agora.");
      }
    } catch {
      setError("Não foi possível enviar agora. Tente de novo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Cupom de boas-vindas"
      className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border border-[#12294f]/15 bg-white p-4 shadow-xl sm:right-auto sm:w-[360px]"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar"
        className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>

      {result ? (
        <div className="pr-6">
          <p className="flex items-center gap-2 text-base font-bold text-[#15803d]">
            <Check className="h-5 w-5" /> {MESSAGES[result.kind].title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{MESSAGES[result.kind].text(result.percent)}</p>
          <Button type="button" className="mt-3 w-full bg-[#15803d] hover:bg-[#15803d]/90" onClick={onClose}>
            Continuar comprando
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="pr-6">
          <p className="text-base font-bold text-[#12294f]">Ganhe {percent}% na sua primeira compra</p>
          <p className="mt-1 text-sm text-muted-foreground">Deixe seu e-mail e receba seu cupom de boas-vindas.</p>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            aria-label="Seu e-mail"
            className="mt-3"
          />
          {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
          <Button type="submit" disabled={sending} className="mt-2 w-full bg-[#15803d] hover:bg-[#15803d]/90">
            {sending ? "Enviando..." : "Quero meu cupom"}
          </Button>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            Ao enviar, você aceita receber seu cupom, novidades e até 2 lembretes do seu carrinho por e-mail. Cancele quando quiser. Veja a{" "}
            <a href="/politica-de-privacidade" className="underline">
              política de privacidade
            </a>
            .
          </p>
          <button type="button" onClick={dismiss} className="mt-2 text-xs text-muted-foreground underline">
            Agora não
          </button>
        </form>
      )}
    </div>
  );
}
