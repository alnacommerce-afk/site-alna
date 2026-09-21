import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/clientes")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: ClientesPage,
});

type Address = {
  zip?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
};

type OrderRow = {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_document: string | null;
  shipping_address: Address | null;
  total_cents: number;
  status: string;
  created_at: string;
};

type Customer = {
  key: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  address: Address;
  orders: number;
  paidOrders: number;
  spentCents: number;
  firstOrderAt: string;
  lastOrderAt: string;
};

// A customer is one account (user_id); orders made without one are grouped by e-mail.
// Orders arrive newest first, so the first row seen for a customer holds their latest data.
function groupCustomers(orders: OrderRow[]): Customer[] {
  const byKey = new Map<string, Customer>();
  for (const order of orders) {
    const key = order.user_id ?? order.customer_email.toLowerCase();
    const paid = order.status !== "pending" && order.status !== "cancelled";
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        key,
        name: order.customer_name.trim(),
        email: order.customer_email,
        phone: order.customer_phone ?? "",
        document: order.customer_document ?? "",
        address: order.shipping_address ?? {},
        orders: 1,
        paidOrders: paid ? 1 : 0,
        spentCents: paid ? order.total_cents : 0,
        firstOrderAt: order.created_at,
        lastOrderAt: order.created_at,
      });
      continue;
    }
    existing.orders += 1;
    if (paid) {
      existing.paidOrders += 1;
      existing.spentCents += order.total_cents;
    }
    existing.firstOrderAt = order.created_at;
  }
  return [...byKey.values()];
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return raw;
}

function formatDocument(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  if (digits.length === 14)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  return raw;
}

function formatAddress(a: Address) {
  const line1 = [a.street, a.number].filter(Boolean).join(", ");
  const line2 = [a.complement, a.neighborhood].filter(Boolean).join(" · ");
  const line3 = [[a.city, a.state].filter(Boolean).join("/"), a.zip].filter(Boolean).join(" · ");
  return [line1, line2, line3].filter(Boolean);
}

function ClientesPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, user_id, customer_name, customer_email, customer_phone, customer_document, shipping_address, total_cents, status, created_at",
        )
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error("Não foi possível carregar os clientes.");
        setLoading(false);
        return;
      }
      setOrders((data ?? []) as unknown as OrderRow[]);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const customers = useMemo(() => groupCustomers(orders), [orders]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    const digits = term.replace(/\D/g, "");
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        (digits && (c.document.replace(/\D/g, "").includes(digits) || c.phone.replace(/\D/g, "").includes(digits))),
    );
  }, [customers, search]);

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Dados que cada cliente preencheu no checkout. Cada cliente aparece uma vez, com os dados do
          pedido mais recente e o total de compras.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-80"
          placeholder="Buscar por nome, e-mail, CPF ou telefone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <p className="ml-auto text-sm text-muted-foreground">{filtered.length} cliente(s)</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Total pago</TableHead>
                <TableHead>Cliente desde</TableHead>
                <TableHead>Última compra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((customer) => (
                  <TableRow key={customer.key}>
                    <TableCell className="text-sm font-medium">{customer.name}</TableCell>
                    <TableCell className="text-sm">{customer.email}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {customer.document ? formatDocument(customer.document) : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {customer.phone ? formatPhone(customer.phone) : "—"}
                    </TableCell>
                    <TableCell className="min-w-56 text-xs text-muted-foreground">
                      {formatAddress(customer.address).length === 0 ? "—" : formatAddress(customer.address).map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {customer.orders}
                      {customer.paidOrders !== customer.orders ? (
                        <Badge variant="secondary" className="ml-2">
                          {customer.paidOrders} pago(s)
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm">
                      {brl(customer.spentCents)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDate(customer.firstOrderAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDate(customer.lastOrderAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
