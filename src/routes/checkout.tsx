import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { formatCentsToBRL } from "@/lib/money";
import { cardFeePercentFor, grossUpForCardFee, PIX_DISCOUNT } from "@/lib/payment-fees";
import { useCart } from "@/lib/cart/cart-context";
import { getSavedCheckoutInfo, saveCheckoutInfo } from "@/lib/checkout/saved-info";
import { getReferralCode } from "@/lib/referral/referral-code";
import { fetchShippingQuote, onlyDigits } from "@/lib/shipping/quote";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { OrderStatusPanel } from "@/components/checkout/order-status-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar compra - ALNA" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CheckoutPage,
});

const FUNCTIONS_URL = `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1`;
const INSTALLMENT_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

function CheckoutPage() {
  const { items, subtotalCents, coupon, discountCents, clear } = useCart();
  const [resultOpen, setResultOpen] = useState(false);
  const [resultOrderId, setResultOrderId] = useState<string | null>(null);
  const saved = useMemo(() => getSavedCheckoutInfo(), []);

  const [name, setName] = useState(saved.name ?? "");
  const [cpf, setCpf] = useState(saved.cpf ?? "");
  const [email, setEmail] = useState(saved.email ?? "");
  // Never pre-filled: the customer has to type the address a second time so a typo can't send the
  // order e-mails (and the provisional password) to somebody else.
  const [emailConfirm, setEmailConfirm] = useState("");
  const [phone, setPhone] = useState(saved.phone ?? "");

  const [cep, setCep] = useState(saved.zip ?? "");
  const [street, setStreet] = useState(saved.street ?? "");
  const [number, setNumber] = useState(saved.number ?? "");
  const [complement, setComplement] = useState(saved.complement ?? "");
  const [neighborhood, setNeighborhood] = useState(saved.neighborhood ?? "");
  const [city, setCity] = useState(saved.city ?? "");
  const [state, setState] = useState(saved.state ?? "");
  const [lookingUpCep, setLookingUpCep] = useState(false);

  const [shippingCents, setShippingCents] = useState<number | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [calculatingShipping, setCalculatingShipping] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card">("pix");
  const [installmentCount, setInstallmentCount] = useState(1);
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardMonth, setCardMonth] = useState("");
  const [cardYear, setCardYear] = useState("");
  const [cardCcv, setCardCcv] = useState("");

  const [submitting, setSubmitting] = useState(false);

  async function handleCepBlur() {
    const digits = onlyDigits(cep);
    if (digits.length !== 8) return;
    saveCheckoutInfo({ zip: digits });

    setLookingUpCep(true);
    setShippingError(null);
    try {
      const viaCepResp = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const viaCep = await viaCepResp.json();
      if (!viaCep.erro) {
        setStreet(viaCep.logradouro ?? "");
        setNeighborhood(viaCep.bairro ?? "");
        setCity(viaCep.localidade ?? "");
        setState(viaCep.uf ?? "");
      }
    } catch {
      // ViaCEP indisponível — deixa os campos para preenchimento manual.
    } finally {
      setLookingUpCep(false);
    }

    setCalculatingShipping(true);
    const result = await fetchShippingQuote(
      digits,
      items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
    );
    setCalculatingShipping(false);
    if ("error" in result) {
      setShippingCents(null);
      setShippingError(result.error);
    } else {
      setShippingCents(result.priceCents);
    }
  }

  useEffect(() => {
    if (items.length > 0 && onlyDigits(cep).length === 8) void handleCepBlur();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const baseTotalCents = shippingCents != null ? subtotalCents - discountCents + shippingCents : null;
  const displayTotalCents =
    baseTotalCents == null
      ? null
      : paymentMethod === "pix"
        ? Math.round(baseTotalCents * (1 - PIX_DISCOUNT))
        : grossUpForCardFee(baseTotalCents, installmentCount);

  async function handleSubmit() {
    if (items.length === 0) {
      toast.error("Seu carrinho está vazio.");
      return;
    }
    if (!name || !cpf || !email || !phone) {
      toast.error("Preencha seus dados pessoais.");
      return;
    }
    if (email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()) {
      toast.error("Os dois e-mails precisam ser iguais. Confira a digitação.");
      return;
    }
    if (shippingCents == null) {
      toast.error("Informe um CEP válido para calcular o frete antes de continuar.");
      return;
    }
    if (paymentMethod === "credit_card" && (!cardNumber || !cardHolder || !cardMonth || !cardYear || !cardCcv)) {
      toast.error("Preencha os dados do cartão.");
      return;
    }

    setSubmitting(true);
    setResultOrderId(null);
    setResultOpen(true);
    try {
      const resp = await fetch(`${FUNCTIONS_URL}/checkout-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name, cpfCnpj: cpf, email, phone },
          shippingAddress: { zip: cep, street, number, complement, neighborhood, city, state },
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          paymentMethod,
          couponCode: coupon?.code,
          referredByCode: getReferralCode() ?? undefined,
          installmentCount: paymentMethod === "credit_card" ? installmentCount : undefined,
          creditCard:
            paymentMethod === "credit_card"
              ? {
                  holderName: cardHolder,
                  number: cardNumber,
                  expiryMonth: cardMonth,
                  expiryYear: cardYear,
                  ccv: cardCcv,
                }
              : undefined,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setResultOpen(false);
        toast.error(json.error ?? "Não foi possível finalizar o pedido.");
        return;
      }
      saveCheckoutInfo({
        name,
        cpf,
        email,
        phone,
        zip: onlyDigits(cep),
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
      });
      clear();
      setResultOrderId(json.orderId);
    } catch {
      setResultOpen(false);
      toast.error("Não foi possível finalizar o pedido. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-[#12294f]">Finalizar compra</h1>

        {items.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">Seu carrinho está vazio.</p>
        ) : (
          <div className="mt-8 space-y-8">
            <section className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#12294f]">
                Seus dados
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input id="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">WhatsApp</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="email-confirm">Confirme o e-mail</Label>
                  <Input
                    id="email-confirm"
                    type="email"
                    autoComplete="off"
                    value={emailConfirm}
                    onChange={(e) => setEmailConfirm(e.target.value)}
                    onPaste={(e) => e.preventDefault()}
                    aria-invalid={emailConfirm !== "" && email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()}
                  />
                  {emailConfirm !== "" && email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase() ? (
                    <p className="text-xs text-destructive">Os e-mails não são iguais.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Digite de novo: enviamos a confirmação do pedido e o acesso à sua conta para este e-mail.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#12294f]">
                Endereço de entrega
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                  />
                  {lookingUpCep ? (
                    <p className="text-xs text-muted-foreground">Buscando endereço...</p>
                  ) : null}
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="street">Rua</Label>
                  <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="number">Número</Label>
                  <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="state">UF</Label>
                  <Input id="state" maxLength={2} value={state} onChange={(e) => setState(e.target.value)} />
                </div>
              </div>

              <div className="rounded-md border border-dashed p-3 text-sm">
                {calculatingShipping ? (
                  <span className="text-muted-foreground">Calculando frete (J&amp;T Express)...</span>
                ) : shippingCents != null ? (
                  <span className="font-semibold text-[#12294f]">
                    Frete J&amp;T Express: {shippingCents === 0 ? "Grátis" : formatCentsToBRL(shippingCents)}
                  </span>
                ) : shippingError ? (
                  <span className="text-destructive">{shippingError}</span>
                ) : (
                  <span className="text-muted-foreground">
                    Informe o CEP para calcular o frete.
                  </span>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#12294f]">
                Forma de pagamento
              </h2>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as "pix" | "credit_card")}
                className="grid grid-cols-2 gap-2"
              >
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm ${
                    paymentMethod === "pix" ? "border-[#16a34a] bg-[#16a34a]/5" : "border-[#12294f]/15"
                  }`}
                >
                  <RadioGroupItem value="pix" /> PIX <span className="text-xs text-[#16a34a]">(-4%)</span>
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm ${
                    paymentMethod === "credit_card" ? "border-[#16a34a] bg-[#16a34a]/5" : "border-[#12294f]/15"
                  }`}
                >
                  <RadioGroupItem value="credit_card" /> Cartão de crédito
                </label>
              </RadioGroup>

              {paymentMethod === "credit_card" ? (
                <div className="space-y-3 rounded-md border border-[#12294f]/15 p-4">
                  <div className="space-y-1">
                    <Label htmlFor="cardNumber">Número do cartão</Label>
                    <Input
                      id="cardNumber"
                      inputMode="numeric"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="0000 0000 0000 0000"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cardHolder">Nome impresso no cartão</Label>
                    <Input id="cardHolder" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="cardMonth">Mês</Label>
                      <Input id="cardMonth" placeholder="MM" maxLength={2} value={cardMonth} onChange={(e) => setCardMonth(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cardYear">Ano</Label>
                      <Input id="cardYear" placeholder="AAAA" maxLength={4} value={cardYear} onChange={(e) => setCardYear(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cardCcv">CVV</Label>
                      <Input id="cardCcv" maxLength={4} value={cardCcv} onChange={(e) => setCardCcv(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Parcelas</Label>
                    <Select
                      value={String(installmentCount)}
                      onValueChange={(v) => setInstallmentCount(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {installmentCount}x
                          {baseTotalCents != null
                            ? ` de ${formatCentsToBRL(
                                Math.round(grossUpForCardFee(baseTotalCents, installmentCount) / installmentCount),
                              )}`
                            : ""}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {INSTALLMENT_OPTIONS.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}x
                            {baseTotalCents != null
                              ? ` de ${formatCentsToBRL(
                                  Math.round(grossUpForCardFee(baseTotalCents, n) / n),
                                )} (${(cardFeePercentFor(n) * 100).toFixed(2)}% a.m.)`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="space-y-2 rounded-lg border border-[#12294f]/10 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCentsToBRL(subtotalCents)}</span>
              </div>
              {discountCents > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Desconto ({coupon?.code})</span>
                  <span className="text-[#16a34a]">-{formatCentsToBRL(discountCents)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Frete (J&amp;T Express)</span>
                <span>
                  {shippingCents == null
                    ? "—"
                    : shippingCents === 0
                      ? "Grátis"
                      : formatCentsToBRL(shippingCents)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2 text-base font-bold text-[#12294f]">
                <span>Total</span>
                <span>{displayTotalCents != null ? formatCentsToBRL(displayTotalCents) : "—"}</span>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || shippingCents == null}
                className="mt-3 w-full bg-[#16a34a] text-base font-bold hover:bg-[#16a34a]/90"
              >
                {submitting ? "Processando..." : "Finalizar pedido"}
              </Button>
            </section>
          </div>
        )}
      </div>

      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="sr-only">Status do pagamento</DialogTitle>
          {resultOrderId ? (
            <OrderStatusPanel orderId={resultOrderId} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Processando pagamento...</p>
          )}
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}
