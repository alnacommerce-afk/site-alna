import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import { PAID_STATUSES, isShippingPaidByStore, sinceDays } from "@/lib/admin/sales-averages";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/marketing/gasto-frete/")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: GastoFretePage,
});

type OrderRow = {
  id: string;
  created_at: string;
  total_cents: number;
  shipping_cost_cents: number | null;
  label_price_cents: number | null;
  payment_method: string | null;
  installment_count: number;
  order_items: { product_title: string; variant_name: string | null; quantity: number }[];
};

function formatPct(value: number) {
  return `${value.toFixed(2).replace(".", ",")}%`;
}

function paymentLabel(order: OrderRow) {
  if (order.payment_method === "pix") return "Pix";
  if (order.payment_method === "credit_card") return `Cartão ${order.installment_count}x`;
  return "—";
}

function GastoFretePage() {
  const [days, setDays] = useState("30");
  const [orders, setOrders] = useState<OrderRow[] | null>(null);

  useEffect(() => {
    setOrders(null);
    supabase
      .from("orders")
      .select(
        "id, created_at, total_cents, shipping_cost_cents, label_price_cents, payment_method, installment_count, order_items(product_title, variant_name, quantity)",
      )
      .in("status", [...PAID_STATUSES])
      .gte("created_at", sinceDays(Number(days)))
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data ?? []) as OrderRow[]));
  }, [days]);

  const faturamento = (orders ?? []).reduce((sum, o) => sum + o.total_cents, 0);
  const etiquetas = (orders ?? []).reduce(
    (sum, o) => sum + (isShippingPaidByStore(o) ? (o.label_price_cents ?? 0) : 0),
    0,
  );
  const semEtiqueta = (orders ?? []).filter(
    (o) => isShippingPaidByStore(o) && o.label_price_cents == null,
  ).length;
  const custoPct = faturamento > 0 ? (etiquetas / faturamento) * 100 : 0;

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Relatório de gasto com frete</h1>
          <p className="text-sm text-muted-foreground">
            Quanto da venda foi gasto com etiquetas nos pedidos pagos. Quando o cliente pagou o
            frete (compras abaixo do frete grátis), a etiqueta conta como zero.
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Faturamento
          </p>
          <p className="mt-1 text-2xl font-bold text-[#12294f]">
            {orders ? formatCentsToBRL(faturamento) : "—"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Etiquetas
          </p>
          <p className="mt-1 text-2xl font-bold text-[#12294f]">
            {orders ? formatCentsToBRL(etiquetas) : "—"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Custo
          </p>
          <p className="mt-1 text-2xl font-bold text-[#12294f]">
            {orders ? `${custoPct.toFixed(1).replace(".", ",")}%` : "—"}
          </p>
        </div>
      </div>
      {semEtiqueta > 0 ? (
        <p className="mb-4 text-xs text-amber-700">
          {semEtiqueta} pedido(s) com frete grátis ainda sem etiqueta gerada não entram nas
          etiquetas — o custo real pode ser maior que o mostrado.
        </p>
      ) : null}

      {orders === null ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhuma venda paga nesse período.
        </div>
      ) : (
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Valor pago</TableHead>
              <TableHead>Valor da etiqueta</TableHead>
              <TableHead>% sobre a venda</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const storePays = isShippingPaidByStore(order);
              const label = storePays ? order.label_price_cents : 0;
              return (
                <TableRow key={order.id}>
                  <TableCell>{new Date(order.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {order.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    {order.order_items
                      .map(
                        (i) =>
                          `${i.quantity}× ${i.product_title}${i.variant_name ? ` (${i.variant_name})` : ""}`,
                      )
                      .join(", ")}
                  </TableCell>
                  <TableCell>{paymentLabel(order)}</TableCell>
                  <TableCell>{formatCentsToBRL(order.total_cents)}</TableCell>
                  <TableCell>
                    {!storePays ? (
                      <span>
                        {formatCentsToBRL(0)}{" "}
                        <span className="text-muted-foreground">(pago pelo cliente)</span>
                      </span>
                    ) : label == null ? (
                      <span className="text-muted-foreground">etiqueta não gerada</span>
                    ) : (
                      formatCentsToBRL(label)
                    )}
                  </TableCell>
                  <TableCell>
                    {label == null || order.total_cents <= 0
                      ? "—"
                      : formatPct((label / order.total_cents) * 100)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </AdminShell>
  );
}
