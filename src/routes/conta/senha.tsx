import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { CustomerShell } from "@/components/customer/customer-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/conta/senha")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: TrocarSenhaPage,
});

function TrocarSenhaPage() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirmPassword = String(form.get("confirmPassword"));

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error("Não foi possível trocar a senha.");
      return;
    }
    toast.success("Senha alterada com sucesso.");
    (event.target as HTMLFormElement).reset();
  }

  return (
    <CustomerShell>
      <form className="max-w-sm space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <Label htmlFor="password">Nova senha</Label>
          <Input id="password" name="password" type="password" required minLength={6} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={6} />
        </div>
        <Button type="submit" disabled={loading} className="bg-[#16a34a] font-bold hover:bg-[#16a34a]/90">
          {loading ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </CustomerShell>
  );
}
