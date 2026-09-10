import { useEffect, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { useAdminSession } from "@/lib/admin/use-admin-session";
import { Button } from "@/components/ui/button";

export function AdminShell({ children }: { children: ReactNode }) {
  const { status } = useAdminSession();
  const router = useRouter();

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
        <div className="mb-6 text-sm font-semibold">Alna Admin</div>
        <nav className="flex flex-col gap-1 text-sm">
          <Link
            to="/admin/catalogo"
            className="rounded-md px-3 py-2 hover:bg-accent"
            activeProps={{ className: "bg-accent font-medium" }}
          >
            Catálogo
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
