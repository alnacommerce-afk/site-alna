import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/pedidos/")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: PedidosPage,
});

type OrderRow = {
  id: string;
  created_at: string;
  customer_name: string | null;
  total_cents: number;
  payment_method: string | null;
  installment_count: number;
  status: string;
  payment_status: string | null;
  itemCount: number;
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

function PedidosPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, created_at, customer_name, total_cents, payment_method, installment_count, status, payment_status, order_items(id)",
        )
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Não foi possível carregar os pedidos.");
        setLoading(false);
        return;
      }

      setOrders(
        (data ?? []).map((o) => ({
          ...o,
          itemCount: (o.order_items ?? []).length,
        })),
      );
      setLoading(false);
    }
    load();
  }, []);

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">
          Pedidos recebidos pelo checkout. Status atualiza automaticamente pelo webhook da Asaas.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhum pedido ainda.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="font-medium">{order.customer_name ?? "—"}</TableCell>
                <TableCell>{order.itemCount}</TableCell>
                <TableCell className="text-sm">
                  {order.payment_method === "pix"
                    ? "Pix"
                    : order.payment_method === "credit_card"
                      ? `Cartão ${order.installment_count}x`
                      : "—"}
                </TableCell>
                <TableCell className="font-semibold text-[#12294f]">
                  {formatCentsToBRL(order.total_cents)}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[order.status] ?? "secondary"}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </AdminShell>
  );
}
