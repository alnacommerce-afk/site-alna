import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";

const VISITORS_POLL_MS = 60000;

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminOverviewPage,
});

// Orders in these statuses never became a real sale — excluded from every total below.
const NOT_A_SALE = new Set(["pending", "cancelled"]);

type Stats = {
  productsPublished: number;
  categories: number;
  leads: number;
};

type SalesSummary = {
  today: number;
  last7Days: number;
  last30Days: number;
};

type VisitorsState =
  | { status: "loading" | "not_configured" | "error" }
  | { status: "ok"; count: number };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sales, setSales] = useState<SalesSummary | null>(null);
  const [visitors, setVisitors] = useState<VisitorsState>({ status: "loading" });

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

  useEffect(() => {
    async function loadSales() {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { data } = await supabase
        .from("orders")
        .select("created_at, total_cents, status")
        .gte("created_at", thirtyDaysAgo.toISOString());

      const todayBoundary = startOfToday();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      let today = 0;
      let last7Days = 0;
      let last30Days = 0;
      for (const order of data ?? []) {
        if (NOT_A_SALE.has(order.status)) continue;
        const createdAt = new Date(order.created_at);
        last30Days += order.total_cents;
        if (createdAt >= sevenDaysAgo) last7Days += order.total_cents;
        if (createdAt >= todayBoundary) today += order.total_cents;
      }
      setSales({ today, last7Days, last30Days });
    }
    loadSales();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadVisitors() {
      const { data, error } = await supabase.functions.invoke("ga4-realtime-visitors");
      if (cancelled) return;
      if (error || data?.error) {
        setVisitors({ status: "error" });
        return;
      }
      if (data?.configured === false) {
        setVisitors({ status: "not_configured" });
        return;
      }
      setVisitors({ status: "ok", count: data.activeUsers ?? 0 });
    }
    loadVisitors();
    const interval = setInterval(loadVisitors, VISITORS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Bem-vindo ao painel da ALNA.</p>
      </div>

      <Card className="mb-8">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Visitantes agora no site
            </p>
            <p className="mt-2 text-3xl font-bold text-[#12294f]">
              {visitors.status === "ok" ? visitors.count : "—"}
            </p>
            {visitors.status === "not_configured" ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Conecte o Google Analytics em{" "}
                <Link to="/admin/conexoes" className="underline">
                  Conexões de API
                </Link>{" "}
                para ativar.
              </p>
            ) : visitors.status === "error" ? (
              <p className="mt-1 text-xs text-destructive">
                Não foi possível consultar o Google Analytics agora.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Vendas
      </h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Vendido hoje
            </p>
            <p className="mt-2 text-3xl font-bold text-[#16a34a]">
              {sales ? formatCentsToBRL(sales.today) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Últimos 7 dias
            </p>
            <p className="mt-2 text-3xl font-bold text-[#16a34a]">
              {sales ? formatCentsToBRL(sales.last7Days) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Últimos 30 dias
            </p>
            <p className="mt-2 text-3xl font-bold text-[#16a34a]">
              {sales ? formatCentsToBRL(sales.last30Days) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
    </AdminShell>
  );
}
