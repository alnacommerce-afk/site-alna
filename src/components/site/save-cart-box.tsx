import { useEffect, useState } from "react";
import { BellRing, Check } from "lucide-react";
import { toast } from "sonner";

import { useCart } from "@/lib/cart/cart-context";
import { getSavedCheckoutInfo, saveCheckoutInfo } from "@/lib/checkout/saved-info";
import {
  canAutoSaveCart,
  getSavedCartState,
  saveCartWithEmail,
  stopSavedCart,
  type SavedCartState,
} from "@/lib/cart/saved-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "Salve seu carrinho": e-mail (required) and WhatsApp (optional) for up to 2 reminders about the cart. */
export function SaveCartBox({ restoredState }: { restoredState?: SavedCartState | null }) {
  const { items } = useCart();
  const [saved, setSaved] = useState<SavedCartState | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showPhone, setShowPhone] = useState(false);
  // E-mail already known and reminders agreed to: the cart is being saved by itself, nothing to ask.
  const [autoSaving, setAutoSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read after mount so the server-rendered page and the first client render match.
  useEffect(() => {
    setSaved(getSavedCartState());
    setAutoSaving(canAutoSaveCart());
    const info = getSavedCheckoutInfo();
    setEmail(info.email ?? "");
    setPhone(info.phone ?? "");
    setShowPhone(!!info.phone);
  }, []);

  useEffect(() => {
    if (restoredState) setSaved(restoredState);
  }, [restoredState]);

  async function handleSave() {
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError("Informe um e-mail válido.");
      return;
    }
    setSaving(true);
    const result = await saveCartWithEmail(email.trim(), phone, items);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(getSavedCartState());
    // The checkout opens with these already filled in (the shopper only repeats the e-mail in the confirmation field).
    saveCheckoutInfo({ email: email.trim(), ...(phone.trim() ? { phone: phone.trim() } : {}) });
    toast.success("Carrinho salvo! Se você não finalizar, avisamos por e-mail.");
  }

  async function handleStop() {
    await stopSavedCart();
    setSaved(null);
    toast.success("Pronto, não enviaremos lembretes deste carrinho.");
  }

  if (!saved && autoSaving) return null;

  if (saved) {
    return (
      <div className="rounded-md border border-[#15803d]/30 bg-[#15803d]/5 p-3 text-sm">
        <p className="flex items-start gap-2 font-semibold text-[#15803d]">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          Carrinho salvo{saved.emailMasked ? ` para ${saved.emailMasked}` : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Se você não finalizar a compra, enviamos um lembrete por e-mail.{" "}
          <button type="button" onClick={handleStop} className="underline hover:text-destructive">
            Não quero lembretes
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-[#12294f]/25 p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-[#12294f]">
        <BellRing className="h-4 w-4" /> Salve seu carrinho
      </p>
      <p className="text-xs text-muted-foreground">
        Deixe seu e-mail e a gente guarda seus itens e avisa se você precisar de mais tempo.
      </p>
      <div className="space-y-1">
        <Label htmlFor="save-cart-email" className="text-xs">
          E-mail
        </Label>
        <Input
          id="save-cart-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
        />
      </div>
      {showPhone ? (
        <div className="space-y-1">
          <Label htmlFor="save-cart-phone" className="text-xs">
            WhatsApp (opcional)
          </Label>
          <Input
            id="save-cart-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(47) 90000-0000"
          />
        </div>
      ) : (
        <button type="button" onClick={() => setShowPhone(true)} className="text-xs text-muted-foreground underline">
          Adicionar WhatsApp (opcional)
        </button>
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button type="button" variant="outline" className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? "Salvando..." : "Salvar carrinho"}
      </Button>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Ao salvar, você aceita receber até 2 lembretes por e-mail sobre este carrinho. Dá para cancelar em qualquer
        e-mail ou aqui. Veja a{" "}
        <a href="/politica-de-privacidade" className="underline">
          política de privacidade
        </a>
        .
      </p>
    </div>
  );
}
