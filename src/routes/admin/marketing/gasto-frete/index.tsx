import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import {
  PAID_STATUSES,
  isShippingPaidByStore,
  productsPaidCents,
  sinceDays,
} from "@/lib/admin/sales-averages";
import { CircleHelp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  subtotal_cents: number;
  discount_cents: number;
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

function HelpTip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`O que significa ${title}`}
          className="text-muted-foreground hover:text-[#12294f]"
        >
          <CircleHelp className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2 text-sm">
        <p className="font-semibold text-[#12294f]">{title}</p>
        {children}
      </PopoverContent>
    </Popover>
  );
}

function GastoFretePage() {
  const [days, setDays] = useState("30");
  const [orders, setOrders] = useState<OrderRow[] | null>(null);

  useEffect(() => {
    setOrders(null);
    supabase
      .from("orders")
      .select(
        "id, created_at, subtotal_cents, discount_cents, shipping_cost_cents, label_price_cents, payment_method, installment_count, order_items(product_title, variant_name, quantity)",
      )
      .in("status", [...PAID_STATUSES])
      .gte("created_at", sinceDays(Number(days)))
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data ?? []) as OrderRow[]));
  }, [days]);

  const faturamento = (orders ?? []).reduce((sum, o) => sum + productsPaidCents(o), 0);
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
            <SelectItem value="15">Últimos 15 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="45">Últimos 45 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Faturamento
            <HelpTip title="Faturamento">
              <p>
                É o que os clientes pagaram <strong>pelos produtos</strong> nos pedidos pagos do
                período, já com o cupom descontado.
              </p>
              <p>
                O frete que o cliente pagou <strong>não entra</strong>: esse dinheiro serve para
                pagar a etiqueta, não é da loja. Exemplo: uma colher de R$ 2,53 com frete de R$
                17,43 deixa R$ 19,96 no caixa, mas aparece aqui só como R$ 2,53 — o cliente
                financiou a etiqueta.
              </p>
            </HelpTip>
          </p>
          <p className="mt-1 text-2xl font-bold text-[#12294f]">
            {orders ? formatCentsToBRL(faturamento) : "—"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Etiquetas
            <HelpTip title="Etiquetas">
              <p>
                Soma das etiquetas que <strong>a loja pagou</strong>: só os pedidos com frete
                grátis, marcados como "Pago pelo site".
              </p>
              <p>
                Pedidos em que o cliente pagou o frete ("Pago pelo cliente"){" "}
                <strong>não somam</strong>: a etiqueta saiu do dinheiro dele.
              </p>
            </HelpTip>
          </p>
          <p className="mt-1 text-2xl font-bold text-[#12294f]">
            {orders ? formatCentsToBRL(etiquetas) : "—"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Custo
            <HelpTip title="Custo">
              <p>
                É <strong>Etiquetas ÷ Faturamento</strong>: quanto de cada R$ 100 vendidos em
                produto você gastou com etiquetas que bancou.
              </p>
              <p>
                Exemplo: venda de R$ 150 com etiqueta de R$ 25 = 16,7%. Esse é o número para usar em
                Precificação &gt; Custo do frete.
              </p>
            </HelpTip>
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
              const paid = productsPaidCents(order);
              const label = order.label_price_cents;
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
                  <TableCell>{formatCentsToBRL(paid)}</TableCell>
                  <TableCell>
                    {label == null ? (
                      <span className="text-muted-foreground">etiqueta não gerada</span>
                    ) : (
                      <span className={storePays ? "" : "text-muted-foreground"}>
                        {formatCentsToBRL(label)}
                      </span>
                    )}
                    <p
                      className={
                        storePays
                          ? "font-semibold text-destructive"
                          : "font-semibold text-[#16a34a]"
                      }
                    >
                      {storePays ? "Pago pelo site" : "Pago pelo cliente"}
                    </p>
                  </TableCell>
                  <TableCell>
                    {!storePays || label == null || paid <= 0
                      ? "—"
                      : formatPct((label / paid) * 100)}
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
