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

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-20">
        <h1 className="mb-1 text-xl font-bold text-[#12294f]">Minha conta</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Acesse com o e-mail e a senha que enviamos após seu primeiro pedido.
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
