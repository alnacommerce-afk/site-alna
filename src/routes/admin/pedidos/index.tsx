import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  tracking_code: string | null;
  label_url: string | null;
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
  const [orderToLabel, setOrderToLabel] = useState<OrderRow | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, created_at, customer_name, total_cents, payment_method, installment_count, status, payment_status, tracking_code, label_url, order_items(id)",
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

  useEffect(() => {
    load();
  }, []);

  async function confirmGenerateLabel() {
    if (!orderToLabel) return;
    const orderId = orderToLabel.id;
    setOrderToLabel(null);
    setGeneratingFor(orderId);

    const { data, error } = await supabase.functions.invoke("generate-shipping-label", {
      body: { orderId },
    });
    setGeneratingFor(null);

    if (error || data?.error) {
      toast.error(data?.error ?? "Não foi possível gerar a etiqueta.");
      return;
    }
    toast.success(`Etiqueta gerada. Rastreio: ${data.trackingCode ?? "aguardando"}`);
    load();
  }

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
              <TableHead>Rastreio</TableHead>
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
                <TableCell className="text-sm">
                  {order.tracking_code ? (
                    order.label_url ? (
                      <a
                        href={order.label_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#16a34a] hover:underline"
                      >
                        {order.tracking_code}
                      </a>
                    ) : (
                      order.tracking_code
                    )
                  ) : order.status === "paid" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={generatingFor === order.id}
                      onClick={() => setOrderToLabel(order)}
                    >
                      {generatingFor === order.id ? "Gerando..." : "Gerar etiqueta"}
                    </Button>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={!!orderToLabel} onOpenChange={(open) => !open && setOrderToLabel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar etiqueta de envio</AlertDialogTitle>
            <AlertDialogDescription>
              Isso compra a etiqueta do pedido #{orderToLabel?.id.slice(0, 8)} pela Melhor Envio
              agora, descontando o valor do frete do saldo da sua conta. Essa ação não pode ser
              desfeita. Confirmar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGenerateLabel}>Gerar etiqueta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
