import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import { CustomerShell } from "@/components/customer/customer-shell";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/conta/")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: MinhaContaPage,
});

type OrderRow = {
  id: string;
  created_at: string;
  total_cents: number;
  payment_method: string | null;
  status: string;
  tracking_code: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  paid: "default",
  shipped: "default",
  completed: "default",
  cancelled: "destructive",
};

function MinhaContaPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("orders")
        .select("id, created_at, total_cents, payment_method, status, tracking_code")
        .order("created_at", { ascending: false });
      setOrders((data ?? []) as OrderRow[]);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <CustomerShell>
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Você ainda não fez nenhum pedido.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              to="/pedido/$orderId"
              params={{ orderId: order.id }}
              className="flex items-center justify-between rounded-lg border border-[#12294f]/10 p-4 text-sm hover:bg-muted/40"
            >
              <div>
                <p className="font-semibold text-[#12294f]">Pedido #{order.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString("pt-BR")}
                  {order.tracking_code ? ` — Rastreio: ${order.tracking_code}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#12294f]">{formatCentsToBRL(order.total_cents)}</span>
                <Badge variant={STATUS_VARIANTS[order.status] ?? "secondary"}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </CustomerShell>
  );
}
