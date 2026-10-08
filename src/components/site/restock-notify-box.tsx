import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useCustomerSession } from "@/lib/customer/use-customer-session";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Shown on the product page when the selected variant is out of stock. A signed-in customer just
// ticks a box (we already have their e-mail); a guest fills a small name+e-mail form. Either way it
// writes to `restock_notifications`, and Admin > Marketing > Fluxo de E-mail documents what happens
// next: when the admin restocks this SKU above zero, everyone here gets a "voltou!" e-mail.
export function RestockNotifyBox({ variantId }: { variantId: string }) {
  const { status, session } = useCustomerSession();
  const [submitted, setSubmitted] = useState(false);
  const [checked, setChecked] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(payload: { name: string | null; email: string }) {
    setLoading(true);
    const { error } = await supabase.from("restock_notifications").insert({
      product_variant_id: variantId,
      user_id: session?.user?.id ?? null,
      name: payload.name,
      email: payload.email,
    });
    setLoading(false);
    if (error) {
      // Unique violation — an active sign-up for this e-mail + SKU already exists.
      if (error.code === "23505") {
        toast.info("Você já está na lista — avisaremos assim que voltar ao estoque.");
        setSubmitted(true);
        return;
      }
      toast.error("Não foi possível registrar seu aviso. Tente novamente.");
      setChecked(false);
      return;
    }
    setSubmitted(true);
    toast.success("Pronto! Avisaremos por e-mail assim que voltar ao estoque.");
  }

  if (status === "loading") return null;

  if (submitted) {
    return (
      <p className="mt-3 rounded-md border border-[#15803d]/30 bg-[#15803d]/5 p-3 text-sm text-[#15803d]">
        Você será avisado(a) por e-mail assim que este produto voltar ao estoque.
      </p>
    );
  }

  if (status === "authenticated" && session?.user?.email) {
    const userEmail = session.user.email;
    const userName = (session.user.user_metadata as { name?: string } | null)?.name ?? null;
    return (
      <div className="mt-3 flex items-center gap-2 rounded-md border border-[#12294f]/15 p-3">
        <Checkbox
          id="avise-me"
          checked={checked}
          disabled={loading}
          onCheckedChange={(value) => {
            const isChecked = value === true;
            setChecked(isChecked);
            if (isChecked) submit({ name: userName, email: userEmail });
          }}
        />
        <Label htmlFor="avise-me" className="cursor-pointer text-sm font-normal">
          Avise-me quando este produto voltar ao estoque
        </Label>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-md border border-[#12294f]/15 p-3">
      <p className="text-sm font-medium text-[#12294f]">Avise-me quando voltar ao estoque</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          type="email"
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={loading || !email.trim()}
        onClick={() => submit({ name: name.trim() || null, email: email.trim() })}
      >
        Avisar quando voltar
      </Button>
    </div>
  );
}
