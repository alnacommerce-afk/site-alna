import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCentsToBRL } from "@/lib/money";
import { storeLink } from "@/lib/site-urls";
import { fillMessage, whatsappLink } from "@/lib/admin/whatsapp";

export const Route = createFileRoute("/admin/marketing/carrinhos/")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: AbandonedCartsPage,
});

type SavedCart = {
  id: string;
  token: string;
  email: string;
  phone: string | null;
  summary: string | null;
  item_count: number;
  subtotal_cents: number;
  last_activity_at: string;
  reminder_1_sent_at: string | null;
  reminder_2_sent_at: string | null;
  stopped_at: string | null;
  recovered_at: string | null;
  recovered_order_id: string | null;
};

type PendingOrder = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  total_cents: number;
  created_at: string;
  payment_method: string | null;
};

type OrderLite = { id: string; status: string; total_cents: number; created_at: string };

const PAID_STATUSES = new Set(["paid", "shipped", "completed"]);

const DEFAULT_CART_MESSAGE =
  "Olá! Aqui é da Alna. Vi que você deixou {produtos} no carrinho. Posso te ajudar a finalizar a compra? Seu carrinho continua guardado aqui: {link}";
const DEFAULT_ORDER_MESSAGE =
  "Olá, {nome}! Aqui é da Alna. Vi que o seu pedido #{pedido} ({total}) ainda está pendente de pagamento. Posso te ajudar a finalizar? Ele continua aqui: {link}";

const MESSAGE_KEYS = { cart: "alna_admin_wa_cart", order: "alna_admin_wa_order" } as const;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} dias`;
}

function readMessage(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function MessageEditor({
  storageKey,
  fallback,
  value,
  onChange,
  tokens,
}: {
  storageKey: string;
  fallback: string;
  value: string;
  onChange: (value: string) => void;
  tokens: string;
}) {
  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-semibold text-[#12294f]">Mensagem de WhatsApp (você revisa antes de enviar)</p>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Campos que se preenchem sozinhos: {tokens}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              onChange(fallback);
              try {
                localStorage.removeItem(storageKey);
              } catch {
                // ignore
              }
            }}
          >
            Voltar ao texto padrão
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              try {
                localStorage.setItem(storageKey, value);
                toast.success("Mensagem guardada neste navegador.");
              } catch {
                toast.error("Não foi possível guardar a mensagem.");
              }
            }}
          >
            Guardar mensagem
          </Button>
        </div>
      </div>
    </div>
  );
}

function AbandonedCartsPage() {
  const [carts, setCarts] = useState<SavedCart[]>([]);
  const [pending, setPending] = useState<PendingOrder[]>([]);
  const [orders, setOrders] = useState<Record<string, OrderLite>>({});
  const [loading, setLoading] = useState(true);
  const [cartMessage, setCartMessage] = useState(DEFAULT_CART_MESSAGE);
  const [orderMessage, setOrderMessage] = useState(DEFAULT_ORDER_MESSAGE);

  useEffect(() => {
    setCartMessage(readMessage(MESSAGE_KEYS.cart, DEFAULT_CART_MESSAGE));
    setOrderMessage(readMessage(MESSAGE_KEYS.order, DEFAULT_ORDER_MESSAGE));
  }, []);

  async function load() {
    const [cartRes, pendingRes] = await Promise.all([
      supabase
        .from("abandoned_carts")
        .select(
          "id, token, email, phone, summary, item_count, subtotal_cents, last_activity_at, reminder_1_sent_at, reminder_2_sent_at, stopped_at, recovered_at, recovered_order_id",
        )
        .order("last_activity_at", { ascending: false })
        .limit(500),
      supabase
        .from("orders")
        .select("id, customer_name, customer_email, customer_phone, total_cents, created_at, payment_method")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    const cartRows = (cartRes.data ?? []) as SavedCart[];
    setCarts(cartRows);
    setPending((pendingRes.data ?? []) as PendingOrder[]);

    const orderIds = [...new Set(cartRows.map((c) => c.recovered_order_id).filter((id): id is string => !!id))];
    if (orderIds.length > 0) {
      const { data } = await supabase.from("orders").select("id, status, total_cents, created_at").in("id", orderIds);
      setOrders(Object.fromEntries(((data ?? []) as OrderLite[]).map((o) => [o.id, o])));
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  // A cart counts as "recovered" only when the order came AFTER a reminder and was actually paid.
  const recoveredOrder = (cart: SavedCart): OrderLite | null => {
    if (!cart.reminder_1_sent_at || !cart.recovered_order_id) return null;
    const order = orders[cart.recovered_order_id];
    if (!order || !PAID_STATUSES.has(order.status)) return null;
    return new Date(order.created_at) >= new Date(cart.reminder_1_sent_at) ? order : null;
  };

  const stats = useMemo(() => {
    const recovered = carts.map(recoveredOrder).filter((o): o is OrderLite => !!o);
    return {
      saved: carts.length,
      reminder1: carts.filter((c) => c.reminder_1_sent_at).length,
      reminder2: carts.filter((c) => c.reminder_2_sent_at).length,
      recovered: recovered.length,
      recoveredCents: recovered.reduce((sum, o) => sum + o.total_cents, 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carts, orders]);

  function cartStatus(cart: SavedCart): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
    if (recoveredOrder(cart)) return { label: "Recuperado (pago)", variant: "default" };
    if (cart.recovered_at) return { label: "Virou pedido", variant: "secondary" };
    if (cart.stopped_at) return { label: "Sem lembretes", variant: "outline" };
    if (cart.item_count === 0) return { label: "Carrinho vazio", variant: "outline" };
    if (cart.reminder_2_sent_at) return { label: "Lembrete 2 enviado", variant: "secondary" };
    if (cart.reminder_1_sent_at) return { label: "Lembrete 1 enviado", variant: "secondary" };
    return { label: "Aguardando 1 hora", variant: "outline" };
  }

  const cartLink = (cart: SavedCart) => storeLink(`/carrinho?c=${cart.token}`);

  function cartWhatsapp(cart: SavedCart) {
    return whatsappLink(
      cart.phone,
      fillMessage(cartMessage, { produtos: cart.summary ?? "alguns itens", link: cartLink(cart) }),
    );
  }

  function orderWhatsapp(order: PendingOrder) {
    return whatsappLink(
      order.customer_phone,
      fillMessage(orderMessage, {
        nome: (order.customer_name ?? "").split(" ")[0] || "tudo bem",
        pedido: order.id.slice(0, 8),
        total: formatCentsToBRL(order.total_cents),
        link: storeLink(`/pedido/${order.id}`),
      }),
    );
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  async function removeCart(cart: SavedCart) {
    if (!window.confirm(`Remover o carrinho de ${cart.email}? Ele deixa de receber lembretes.`)) return;
    const { error } = await supabase.from("abandoned_carts").delete().eq("id", cart.id);
    if (error) {
      toast.error("Não foi possível remover.");
      return;
    }
    setCarts((prev) => prev.filter((c) => c.id !== cart.id));
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#12294f]">Carrinhos abandonados</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Clientes que deixaram o e-mail no carrinho recebem 1 lembrete depois de 1 hora (sem cupom) e outro depois de
            24 horas (com cupom pessoal). Nada é enviado entre 22h e 8h. Aqui você também chama no WhatsApp quem deixou o
            número.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { label: "Carrinhos salvos", value: String(stats.saved) },
            { label: "Lembrete 1 enviado", value: String(stats.reminder1) },
            { label: "Lembrete 2 enviado", value: String(stats.reminder2) },
            { label: "Recuperados (pagos)", value: String(stats.recovered) },
            { label: "Valor recuperado", value: formatCentsToBRL(stats.recoveredCents) },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-[#12294f]">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="carrinhos">
          <TabsList>
            <TabsTrigger value="carrinhos">Carrinhos salvos ({carts.length})</TabsTrigger>
            <TabsTrigger value="pedidos">Pedidos pendentes ({pending.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="carrinhos" className="space-y-4">
            <MessageEditor
              storageKey={MESSAGE_KEYS.cart}
              fallback={DEFAULT_CART_MESSAGE}
              value={cartMessage}
              onChange={setCartMessage}
              tokens="{produtos} e {link}"
            />
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : carts.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Ainda não há carrinhos salvos. Eles aparecem quando um cliente deixa o e-mail na caixa "Salve seu
                carrinho".
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Itens</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Parado há</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carts.map((cart) => {
                      const status = cartStatus(cart);
                      const wa = cartWhatsapp(cart);
                      return (
                        <TableRow key={cart.id}>
                          <TableCell className="text-sm">
                            <p className="font-medium text-[#12294f]">{cart.email}</p>
                            <p className="text-xs text-muted-foreground">{cart.phone ?? "sem WhatsApp"}</p>
                          </TableCell>
                          <TableCell className="max-w-[260px] text-xs text-muted-foreground">
                            {cart.summary ?? "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm font-semibold">
                            {formatCentsToBRL(cart.subtotal_cents)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs" title={formatDateTime(cart.last_activity_at)}>
                            {timeAgo(cart.last_activity_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant} className="whitespace-nowrap text-[10px]">
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              {wa ? (
                                <Button asChild size="sm" className="gap-1 bg-[#15803d] hover:bg-[#15803d]/90">
                                  <a href={wa} target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                                  </a>
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => copy(cartLink(cart))}
                              >
                                <Copy className="h-3.5 w-3.5" /> Link
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                title="Remover"
                                onClick={() => removeCart(cart)}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pedidos" className="space-y-4">
            <MessageEditor
              storageKey={MESSAGE_KEYS.order}
              fallback={DEFAULT_ORDER_MESSAGE}
              value={orderMessage}
              onChange={setOrderMessage}
              tokens="{nome}, {pedido}, {total} e {link}"
            />
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : pending.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhum pedido pendente de pagamento agora.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Criado há</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((order) => {
                      const wa = orderWhatsapp(order);
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="whitespace-nowrap text-sm font-medium">
                            #{order.id.slice(0, 8)}
                            <p className="text-xs font-normal text-muted-foreground">
                              {order.payment_method === "pix" ? "Pix" : order.payment_method === "credit_card" ? "Cartão" : "—"}
                            </p>
                          </TableCell>
                          <TableCell className="text-sm">
                            <p className="font-medium text-[#12294f]">{order.customer_name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.customer_email ?? "sem e-mail"} · {order.customer_phone ?? "sem WhatsApp"}
                            </p>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm font-semibold">
                            {formatCentsToBRL(order.total_cents)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs" title={formatDateTime(order.created_at)}>
                            {timeAgo(order.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              {wa ? (
                                <Button asChild size="sm" className="gap-1 bg-[#15803d] hover:bg-[#15803d]/90">
                                  <a href={wa} target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                                  </a>
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => copy(storeLink(`/pedido/${order.id}`))}
                              >
                                <Copy className="h-3.5 w-3.5" /> Link
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}
