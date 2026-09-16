import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  melhor_envio_shipment_id: string | null;
  itemCount: number;
};

type OrderItemRow = {
  sku: string | null;
  product_title: string;
  variant_name: string | null;
  quantity: number;
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
  const [downloadingFor, setDownloadingFor] = useState<string | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState(false);
  const [infoOrder, setInfoOrder] = useState<OrderRow | null>(null);
  const [infoItems, setInfoItems] = useState<OrderItemRow[]>([]);
  const [infoLoading, setInfoLoading] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, created_at, customer_name, total_cents, payment_method, installment_count, status, payment_status, tracking_code, label_url, melhor_envio_shipment_id, order_items(id)",
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

  async function loadBalance() {
    const { data, error } = await supabase.functions.invoke("melhor-envio-balance");
    if (error || data?.error || data?.balance == null) {
      setBalanceError(true);
      return;
    }
    setBalance(data.balance);
  }

  useEffect(() => {
    load();
    loadBalance();
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

  async function downloadLabel(order: OrderRow) {
    setDownloadingFor(order.id);
    const { data, error } = await supabase.functions.invoke("get-shipping-labels", {
      body: { orderIds: [order.id] },
    });
    setDownloadingFor(null);
    if (error || data?.error) {
      toast.error(data?.error ?? "Não foi possível preparar a etiqueta.");
      return;
    }
    // Cache-bust: the URL is the same every time for a given order, so without this the browser
    // can silently reopen an old cached copy instead of fetching the freshly-generated file.
    window.open(`${data.url}?t=${Date.now()}`, "_blank");
  }

  async function downloadAllLabels() {
    const orderIds = orders.filter((o) => o.melhor_envio_shipment_id).map((o) => o.id);
    if (!orderIds.length) {
      toast.error("Nenhum pedido com etiqueta gerada ainda.");
      return;
    }
    setBulkDownloading(true);
    const { data, error } = await supabase.functions.invoke("get-shipping-labels", {
      body: { orderIds },
    });
    setBulkDownloading(false);
    if (error || data?.error) {
      toast.error(data?.error ?? "Não foi possível preparar as etiquetas.");
      return;
    }
    window.open(`${data.url}?t=${Date.now()}`, "_blank");
  }

  async function openInfo(order: OrderRow) {
    setInfoOrder(order);
    setInfoLoading(true);
    const { data } = await supabase
      .from("order_items")
      .select("sku, product_title, variant_name, quantity")
      .eq("order_id", order.id);
    setInfoItems(data ?? []);
    setInfoLoading(false);
  }

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            Pedidos recebidos pelo checkout. Status atualiza automaticamente pelo webhook da Asaas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Card>
            <CardContent className="px-4 py-2">
              <p className="text-xs text-muted-foreground">Saldo Melhor Envio</p>
              <p className="font-semibold text-[#12294f]">
                {balanceError ? "Indisponível" : balance == null ? "Carregando..." : formatCentsToBRL(Math.round(balance * 100))}
              </p>
            </CardContent>
          </Card>
          <Button variant="outline" onClick={downloadAllLabels} disabled={bulkDownloading}>
            {bulkDownloading ? "Preparando..." : "Baixar em massa"}
          </Button>
        </div>
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
              <TableHead></TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rastreio</TableHead>
              <TableHead>Etiqueta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="font-medium">{order.customer_name ?? "—"}</TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => openInfo(order)}
                    className="text-muted-foreground hover:text-[#12294f]"
                    title="Ver itens do pedido"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TableCell>
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
                <TableCell className="text-sm">{order.tracking_code ?? "—"}</TableCell>
                <TableCell className="text-sm">
                  {order.melhor_envio_shipment_id ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={downloadingFor === order.id}
                      onClick={() => downloadLabel(order)}
                    >
                      {downloadingFor === order.id ? "Preparando..." : "Baixar etiqueta"}
                    </Button>
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

      <Dialog open={!!infoOrder} onOpenChange={(open) => !open && setInfoOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pedido #{infoOrder?.id}</DialogTitle>
          </DialogHeader>
          {infoLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {infoItems.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{item.sku ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {item.product_title}
                      {item.variant_name ? ` — ${item.variant_name}` : ""}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
