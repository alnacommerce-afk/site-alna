import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/admin/metricas")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: MetricasPage,
});

type Stats = {
  productsPublished: number;
  productsDraft: number;
  categories: number;
  leads: number;
  orders: number;
};

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-3xl font-bold text-[#12294f]">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function MetricasPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [published, draft, categories, leads, orders] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
      ]);

      const hasError = [published, draft, categories, leads, orders].some((r) => r.error);
      if (hasError) {
        toast.error("Não foi possível carregar todas as métricas.");
      }

      setStats({
        productsPublished: published.count ?? 0,
        productsDraft: draft.count ?? 0,
        categories: categories.count ?? 0,
        leads: leads.count ?? 0,
        orders: orders.count ?? 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Métricas</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do catálogo e do relacionamento com clientes.
        </p>
      </div>

      {loading || !stats ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Produtos publicados" value={stats.productsPublished} />
          <StatCard label="Produtos em rascunho" value={stats.productsDraft} />
          <StatCard label="Categorias" value={stats.categories} />
          <StatCard
            label="Leads recebidos"
            value={stats.leads}
            hint="Contato, newsletter e carrinho abandonado"
          />
          <StatCard
            label="Pedidos"
            value={stats.orders}
            hint="Fica ativo quando o checkout for lançado"
          />
        </div>
      )}
    </AdminShell>
  );
}
