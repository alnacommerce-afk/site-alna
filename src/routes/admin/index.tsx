import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes, LayoutGrid, LineChart, Plug, Settings } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminOverviewPage,
});

const QUICK_LINKS = [
  {
    to: "/admin/catalogo" as const,
    icon: Boxes,
    title: "Catálogo",
    description: "Cadastre e edite os produtos da loja.",
  },
  {
    to: "/admin/categorias" as const,
    icon: LayoutGrid,
    title: "Categorias",
    description: "Organize os produtos em categorias.",
  },
  {
    to: "/admin/metricas" as const,
    icon: LineChart,
    title: "Métricas",
    description: "Acompanhe produtos, categorias e leads.",
  },
  {
    to: "/admin/conexoes" as const,
    icon: Plug,
    title: "Conexões de API",
    description: "Status das integrações externas.",
  },
  {
    to: "/admin/configuracoes" as const,
    icon: Settings,
    title: "Configurações",
    description: "Dados da empresa exibidos no site.",
  },
];

type Stats = {
  productsPublished: number;
  categories: number;
  leads: number;
};

function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      const [published, categories, leads] = await Promise.all([
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("status", "published"),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        productsPublished: published.count ?? 0,
        categories: categories.count ?? 0,
        leads: leads.count ?? 0,
      });
    }
    load();
  }, []);

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Bem-vindo ao painel da Alna Commerce.</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Produtos publicados
            </p>
            <p className="mt-2 text-3xl font-bold text-[#12294f]">
              {stats?.productsPublished ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Categorias
            </p>
            <p className="mt-2 text-3xl font-bold text-[#12294f]">{stats?.categories ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Leads recebidos
            </p>
            <p className="mt-2 text-3xl font-bold text-[#12294f]">{stats?.leads ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Acesso rápido
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map((item) => (
          <Link key={item.to} to={item.to}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="flex items-start gap-3 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#16a34a]/10 text-[#16a34a]">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-[#12294f]">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
