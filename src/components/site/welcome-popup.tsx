import { useEffect, useRef, useState } from "react";
import { Check, Gift, X } from "lucide-react";

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

/**
 * Welcome pop-up in the middle of the screen (same on computer and phone). It closes ONLY with the X button: a click
 * outside or the Esc key do nothing, so it is never dismissed by accident.
 */
export default function WelcomePopup({ percent, onClose }: { percent: number; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const { items } = useCart();
  const boxRef = useRef<HTMLDivElement>(null);

  // Keeps the page behind from scrolling while the pop-up is open, and starts the keyboard flow inside the box.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    boxRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  function close() {
    if (!result) markWelcomeDismissed();
    onClose();
  }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div
        ref={boxRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-popup-title"
        className="relative max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 text-center shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Fechar"
          className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#15803d]/10 text-[#15803d]">
          {result ? <Check className="h-7 w-7" /> : <Gift className="h-7 w-7" />}
        </div>

        {result ? (
          <>
            <h2 id="welcome-popup-title" className="mt-4 text-xl font-bold text-[#12294f]">
              {MESSAGES[result.kind].title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{MESSAGES[result.kind].text(result.percent)}</p>
            <Button type="button" className="mt-5 w-full bg-[#15803d] hover:bg-[#15803d]/90" onClick={onClose}>
              Continuar comprando
            </Button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 id="welcome-popup-title" className="mt-4 text-xl font-bold text-[#12294f]">
              Seja bem-vindo ao nosso site! 💚
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Preparamos um mimo para você que vem pela 1ª vez: um cupom de{" "}
              <strong className="text-[#15803d]">{percent}% de desconto</strong>. É só deixar seu e-mail.
            </p>
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              aria-label="Seu e-mail"
              className="mt-4 h-11 text-base"
            />
            {error ? <p className="mt-1 text-left text-xs text-destructive">{error}</p> : null}
            <Button type="submit" disabled={sending} className="mt-3 h-11 w-full bg-[#15803d] text-base hover:bg-[#15803d]/90">
              {sending ? "Enviando..." : "Quero meu mimo"}
            </Button>
            <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
              Ao enviar, você aceita receber seu cupom, novidades e até 2 lembretes do seu carrinho por e-mail. Cancele
              quando quiser. Veja a{" "}
              <a href="/politica-de-privacidade" className="underline">
                política de privacidade
              </a>
              .
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
