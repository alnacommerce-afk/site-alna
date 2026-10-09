import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, CircleAlert } from "lucide-react";

import { useAdminSession } from "@/lib/admin/use-admin-session";
import { LOW_STOCK_THRESHOLD, useLowStockCount } from "@/lib/admin/use-low-stock";
import { Button } from "@/components/ui/button";

const ANUNCIO_PATHS = [
  "/admin/catalogo",
  "/admin/marketing/precificacao",
  "/admin/estoque",
  "/admin/medidas",
];
const MARKETING_PATHS = [
  "/admin/marketing/cupons",
  "/admin/marketing/campanhas",
  "/admin/marketing/gasto-frete",
  "/admin/marketing/fluxo-email",
  "/admin/marketing/email-marketing",
  "/admin/marketing/carrinhos",
  "/admin/emails",
  "/admin/marketing/nps",
  "/admin/marketing/ideias-post",
];

// A menu section that folds like a drawer: click the title to hide/show its items. It opens by itself
// when the current page belongs to it, and remembers the last choice in this browser.
function NavGroup({
  id,
  title,
  paths,
  children,
}: {
  id: string;
  title: string;
  paths: string[];
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const containsCurrentPage = paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const storageKey = `alna_admin_nav_${id}`;
  const [open, setOpen] = useState(() => {
    if (containsCurrentPage) return true;
    try {
      return localStorage.getItem(storageKey) === "open";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (containsCurrentPage) setOpen(true);
  }, [containsCurrentPage]);

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(storageKey, next ? "open" : "closed");
    } catch {
      // remembering the choice is only a convenience
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent"
      >
        {title}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "" : "-rotate-90"}`} />
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-1 pt-1 [&>a]:pl-6" inert={!open}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

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
          <NavGroup id="anuncio" title="Anúncio" paths={ANUNCIO_PATHS}>
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
          </NavGroup>
          <NavGroup id="marketing" title="Marketing" paths={MARKETING_PATHS}>
          <Link
            to="/admin/marketing/cupons"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Cupons
          </Link>
          <Link
            to="/admin/marketing/campanhas"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Campanhas link UTM
          </Link>
          <Link
            to="/admin/marketing/gasto-frete"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Gasto com frete
          </Link>
          <Link
            to="/admin/marketing/fluxo-email"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Fluxo de E-mail
          </Link>
          <Link
            to="/admin/marketing/email-marketing"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            E-mail marketing
          </Link>
          <Link
            to="/admin/marketing/carrinhos"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Carrinhos abandonados
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
            to="/admin/marketing/ideias-post"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Ideias de Post
          </Link>
          </NavGroup>
          <Link
            to="/admin/metricas"
            className="mt-3 rounded-md px-3 py-2 hover:bg-accent"
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
