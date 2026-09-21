import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { MIN_PASSWORD_LENGTH, PASSWORD_MIN_MESSAGE } from "@/lib/auth/password";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/conta/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Criar nova senha - ALNA" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RedefinirSenhaPage,
});

function RedefinirSenhaPage() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "yes" | "no">("checking");
  const [loading, setLoading] = useState(false);

  // The link in the e-mail lands here with a one-time recovery session in the URL; the Supabase
  // client picks it up on load and either fires PASSWORD_RECOVERY or already holds the session.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) setReady("yes");
    });
    const timer = window.setTimeout(async () => {
      const { data: current } = await supabase.auth.getSession();
      setReady((prev) => (prev === "yes" || current.session ? "yes" : "no"));
    }, 1500);
    return () => {
      data.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirmPassword = String(form.get("confirmPassword"));

    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(PASSWORD_MIN_MESSAGE);
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
      toast.error("Não foi possível criar a nova senha. Peça um novo link e tente de novo.");
      return;
    }
    toast.success("Senha criada! Você já está na sua conta.");
    router.navigate({ to: "/conta" });
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-20">
        <h1 className="mb-1 text-xl font-bold text-[#12294f]">Criar nova senha</h1>

        {ready === "checking" ? (
          <p className="text-sm text-muted-foreground">Validando o link...</p>
        ) : ready === "no" ? (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              Este link é inválido ou já foi usado. Peça um novo na tela de entrada.
            </p>
            <Link
              to="/conta/login"
              className="text-sm font-semibold text-[#16a34a] hover:underline"
            >
              Voltar para entrar
            </Link>
          </>
        ) : (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              Escolha uma senha com pelo menos {MIN_PASSWORD_LENGTH} caracteres.
            </p>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#16a34a] font-bold hover:bg-[#16a34a]/90"
                disabled={loading}
              >
                {loading ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
