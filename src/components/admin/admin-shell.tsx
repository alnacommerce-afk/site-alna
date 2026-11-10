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
  "/admin/categorias",
];
const MARKETING_PATHS = [
  "/admin/marketing/cupons",
  "/admin/marketing/fluxo-email",
  "/admin/marketing/email-marketing",
  "/admin/marketing/carrinhos",
  "/admin/emails",
  "/admin/marketing/nps",
  "/admin/marketing/ideias-post",
];
const FRETE_PATHS = ["/admin/marketing/gasto-frete", "/admin/medidas"];
const METRICAS_PATHS = ["/admin/metricas", "/admin/marketing/campanhas"];
const CONEXOES_PATHS = ["/admin/conexoes"];
const CONFIGURACOES_PATHS = ["/admin/configuracoes", ...CONEXOES_PATHS];

// A menu section that folds like a drawer: click the title to hide/show its items. It opens by itself
// when the current page belongs to it, and remembers the last choice in this browser. A section can
// hold other sections (nested = true gives it a deeper indent).
function NavGroup({
  id,
  title,
  paths,
  nested = false,
  children,
}: {
  id: string;
  title: string;
  paths: string[];
  nested?: boolean;
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
    <div className={nested ? "mt-1" : "mt-3"}>
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
          <div className="flex flex-col gap-1 pt-1 [&>a]:pl-6 [&>div]:pl-3" inert={!open}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// One clickable entry. `hash` points to a section of the page (e.g. #envio-frete); the highlight
// only lights up when the hash matches, so two entries on the same page don't both look selected.
function NavItem({
  to,
  hash,
  exact = false,
  className = "",
  children,
}: {
  to: string;
  hash?: string;
  exact?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      {...(hash ? { hash } : {})}
      activeOptions={{ exact, includeHash: true }}
      className={`rounded-md px-3 py-2 hover:bg-accent ${className}`}
      activeProps={{ className: "bg-accent font-medium" }}
    >
      {children}
    </Link>
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
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col overflow-y-auto border-r bg-muted/30 p-4">
        <Link to="/admin" className="mb-6 block text-sm font-semibold">
          Alna Admin
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          <NavItem to="/admin" exact>
            Visão Geral
          </NavItem>
          <NavItem to="/admin/pedidos">Pedidos</NavItem>
          <NavItem to="/admin/clientes">Clientes</NavItem>

          <NavGroup id="anuncio" title="Anúncio" paths={ANUNCIO_PATHS}>
            <NavItem to="/admin/catalogo">Catálogo</NavItem>
            <NavItem to="/admin/marketing/precificacao">Precificação</NavItem>
            <NavItem to="/admin/estoque" className="flex items-center gap-1.5">
              Estoque
              {lowStockCount > 0 && (
                <CircleAlert
                  className="h-4 w-4 text-red-600"
                  aria-label={`${lowStockCount} SKU(s) com estoque abaixo de ${LOW_STOCK_THRESHOLD}`}
                />
              )}
            </NavItem>
            <NavItem to="/admin/categorias">Categorias</NavItem>
          </NavGroup>

          <NavGroup id="marketing" title="Marketing" paths={MARKETING_PATHS}>
            <NavItem to="/admin/marketing/cupons">Cupons</NavItem>
            <NavItem to="/admin/marketing/fluxo-email">Fluxo de E-mail</NavItem>
            <NavItem to="/admin/marketing/email-marketing">E-mail marketing</NavItem>
            <NavItem to="/admin/marketing/carrinhos">Carrinhos abandonados</NavItem>
            <NavItem to="/admin/emails">E-mails enviados</NavItem>
            <NavItem to="/admin/marketing/nps">NPS</NavItem>
            <NavItem to="/admin/marketing/ideias-post">Ideias de Post</NavItem>
          </NavGroup>

          <NavGroup id="frete" title="Frete" paths={FRETE_PATHS}>
            <NavItem to="/admin/marketing/gasto-frete">Gasto com frete</NavItem>
            <NavItem to="/admin/medidas">Medidas</NavItem>
          </NavGroup>

          <NavGroup id="metricas" title="Métricas" paths={METRICAS_PATHS}>
            <NavItem to="/admin/metricas">Minhas métricas</NavItem>
            <NavItem to="/admin/marketing/campanhas">Campanhas link UTM</NavItem>
          </NavGroup>

          <NavGroup id="configuracoes" title="Configurações" paths={CONFIGURACOES_PATHS}>
            <NavItem to="/admin/configuracoes">Dados da loja</NavItem>
            <NavItem to="/admin/configuracoes" hash="envio-frete">
              Envio / Frete
            </NavItem>
            <NavGroup id="conexoes" title="Conexões de API" paths={CONEXOES_PATHS} nested>
              <NavItem to="/admin/conexoes">Todas as conexões</NavItem>
              <NavItem to="/admin/conexoes" hash="google_analytics">
                Google Analytics
              </NavItem>
            </NavGroup>
          </NavGroup>
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
