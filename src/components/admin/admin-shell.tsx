import { useEffect, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { CircleAlert } from "lucide-react";

import { useAdminSession } from "@/lib/admin/use-admin-session";
import { LOW_STOCK_THRESHOLD, useLowStockCount } from "@/lib/admin/use-low-stock";
import { Button } from "@/components/ui/button";

export function AdminShell({ children }: { children: ReactNode }) {
  const { status } = useAdminSession();
  const router = useRouter();
  const lowStockCount = useLowStockCount();

  useEffect(() => {
    if (status === "signed-out" || status === "unauthorized") {
      router.navigate({ to: "/admin/login" });
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        {status === "loading" ? "Verificando acesso..." : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/30 p-4">
        <Link to="/admin" className="mb-6 block text-sm font-semibold">
          Alna Admin
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          <Link
            to="/admin"
            activeOptions={{ exact: true }}
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Visão Geral
          </Link>
          <Link
            to="/admin/categorias"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Categorias
          </Link>
          <Link
            to="/admin/pedidos"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Pedidos
          </Link>
          <Link
            to="/admin/clientes"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Clientes
          </Link>
          <p className="mt-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Anúncio
          </p>
          <Link
            to="/admin/catalogo"
            className="rounded-md px-3 py-2 pl-6 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Catálogo
          </Link>
          <Link
            to="/admin/marketing/precificacao"
            className="rounded-md px-3 py-2 pl-6 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Precificação
          </Link>
          <Link
            to="/admin/estoque"
            className="flex items-center gap-1.5 rounded-md px-3 py-2 pl-6 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Estoque
            {lowStockCount > 0 && (
              <CircleAlert
                className="h-4 w-4 text-red-600"
                aria-label={`${lowStockCount} SKU(s) com estoque abaixo de ${LOW_STOCK_THRESHOLD}`}
              />
            )}
          </Link>
          <Link
            to="/admin/medidas"
            className="rounded-md px-3 py-2 pl-6 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Medidas
          </Link>
          <p className="mt-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Marketing
          </p>
          <Link
            to="/admin/marketing/cupons"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Cupons
          </Link>
          <Link
            to="/admin/marketing/fluxo-email"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Fluxo de E-mail
          </Link>
          <Link
            to="/admin/emails"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            E-mails enviados
          </Link>
          <Link
            to="/admin/marketing/nps"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            NPS
          </Link>
          <Link
            to="/admin/metricas"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Métricas
          </Link>
          <Link
            to="/admin/conexoes"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Conexões de API
          </Link>
          <Link
            to="/admin/configuracoes"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Configurações
          </Link>
        </nav>
        <Button
          variant="ghost"
          size="sm"
          className="mt-auto w-full justify-start"
          onClick={() => supabase.auth.signOut()}
        >
          Sair
        </Button>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
