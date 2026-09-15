import { useEffect, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { useCustomerSession } from "@/lib/customer/use-customer-session";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";

export function CustomerShell({ children }: { children: ReactNode }) {
  const { status } = useCustomerSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "signed-out") {
      router.navigate({ to: "/conta/login" });
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader />
        <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
          {status === "loading" ? "Verificando acesso..." : null}
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#12294f]">Minha conta</h1>
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
            Sair
          </Button>
        </div>
        <nav className="mb-8 flex gap-2 border-b">
          <Link
            to="/conta"
            activeOptions={{ exact: true }}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-[#12294f]"
            activeProps={{ className: "border-b-2 border-[#16a34a] text-[#12294f]" }}
          >
            Meus pedidos
          </Link>
          <Link
            to="/conta/senha"
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-[#12294f]"
            activeProps={{ className: "border-b-2 border-[#16a34a] text-[#12294f]" }}
          >
            Trocar senha
          </Link>
        </nav>
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
