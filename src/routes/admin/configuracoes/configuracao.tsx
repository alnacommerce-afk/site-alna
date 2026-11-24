import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/configuracoes/configuracao")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: ConfiguracaoPage,
});

type CheckoutMode = "transparente" | "asaas";

function ConfiguracaoPage() {
  const [mode, setMode] = useState<CheckoutMode>("transparente");
  const [saved, setSaved] = useState<CheckoutMode>("transparente");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("checkout_mode")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          toast.error("Não foi possível carregar a configuração do checkout.");
        } else {
          const current: CheckoutMode = data?.checkout_mode === "asaas" ? "asaas" : "transparente";
          setMode(current);
          setSaved(current);
        }
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({ checkout_mode: mode })
      .eq("id", "default");
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar a configuração do checkout.");
      return;
    }
    setSaved(mode);
    toast.success("Configuração do checkout salva.");
  }

  if (loading) {
    return (
      <AdminShell>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </AdminShell>
    );
  }

  const changed = mode !== saved;

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Configuração</h1>
        <p className="text-sm text-muted-foreground">
          Escolha como o cliente paga com cartão. Só uma opção pode ficar marcada.
        </p>
      </div>

      <div className="max-w-2xl space-y-4">
        <h2 className="text-sm font-semibold text-[#12294f]">Checkout</h2>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm">
            <input
              type="radio"
              name="checkout-mode"
              className="mt-1"
              checked={mode === "transparente"}
              onChange={() => setMode("transparente")}
            />
            <span>
              <span className="font-medium">Checkout transparente</span>
              <span className="block text-xs text-muted-foreground">
                O cliente digita os dados do cartão no nosso site (como hoje).
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm">
            <input
              type="radio"
              name="checkout-mode"
              className="mt-1"
              checked={mode === "asaas"}
              onChange={() => setMode("asaas")}
            />
            <span>
              <span className="font-medium">Checkout da Asaas</span>
              <span className="block text-xs text-muted-foreground">
                No cartão, o cliente é levado para a página da Asaas para digitar os dados. O Pix
                continua no nosso site.
              </span>
            </span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={!changed || saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Em uso agora: {saved === "asaas" ? "Checkout da Asaas" : "Checkout transparente"}
          </span>
        </div>
      </div>
    </AdminShell>
  );
}
