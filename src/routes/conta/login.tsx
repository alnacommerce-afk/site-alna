import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/conta/login")({
  head: () => ({
    meta: [
      { title: "Entrar - ALNA" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CustomerLoginPage,
});

function CustomerLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error("E-mail ou senha incorretos.");
      return;
    }
    router.navigate({ to: "/conta" });
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("resetEmail")).trim();
    setLoading(true);
    const { error } = await supabase.functions.invoke("request-password-reset", { body: { email } });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível enviar agora. Tente novamente em instantes.");
      return;
    }
    setResetSent(true);
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-20">
        <h1 className="mb-1 text-xl font-bold text-[#12294f]">Minha conta</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Acesse com o e-mail e a senha do seu pedido. Esqueceu? É só pedir uma nova abaixo.
        </p>

        <form className="space-y-3" onSubmit={handleLogin}>
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <Button type="submit" className="w-full bg-[#16a34a] font-bold hover:bg-[#16a34a]/90" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-4">
          {resetSent ? (
            <p className="rounded-md bg-[#f0fdf4] p-3 text-sm text-[#12294f]">
              Se este e-mail tiver uma conta, enviamos um link para criar uma nova senha. Confira também o
              spam.
            </p>
          ) : resetOpen ? (
            <form className="space-y-2" onSubmit={handleReset}>
              <Label htmlFor="resetEmail">Digite o e-mail da sua conta</Label>
              <Input id="resetEmail" name="resetEmail" type="email" required />
              <Button type="submit" variant="outline" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar link para criar nova senha"}
              </Button>
            </form>
          ) : (
            <button
              type="button"
              className="text-sm font-semibold text-[#16a34a] hover:underline"
              onClick={() => setResetOpen(true)}
            >
              Esqueci minha senha
            </button>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:underline">
            Voltar para o site
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
