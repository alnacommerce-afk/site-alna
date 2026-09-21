import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type TimelineOrder = {
  id: string;
  created_at: string;
  total_cents: number;
  status: string;
  tracking_code: string | null;
};

type OrderEvent = { kind: string; title: string; detail: string | null; occurred_at: string };
type OrderItem = { id: string; product_title: string; variant_name: string | null; quantity: number };

// The journey every order goes through, in order. Steps without an event yet show as "next".
const STEPS: { kind: string; title: string; pending: string }[] = [
  { kind: "order_created", title: "Compra realizada", pending: "Aguardando a criação do pedido." },
  { kind: "payment_confirmed", title: "Pagamento confirmado", pending: "Aguardando a confirmação do pagamento." },
  { kind: "label_generated", title: "Etiqueta de envio gerada", pending: "Estamos preparando o seu pedido." },
  { kind: "posted", title: "Pedido postado", pending: "Assim que a transportadora receber o pedido, ele aparece aqui." },
  { kind: "delivered", title: "Pedido entregue", pending: "Previsão: quando a transportadora concluir a entrega." },
];
const STOPPING_KINDS = ["cancelled", "refunded"];

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function OrderTimelineDialog({
  order,
  onClose,
}: {
  order: TimelineOrder | null;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<OrderEvent[] | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    setEvents(null);
    setItems([]);
    async function load(orderId: string) {
      const [eventsResult, itemsResult] = await Promise.all([
        supabase
          .from("order_events")
          .select("kind, title, detail, occurred_at")
          .eq("order_id", orderId)
          .order("occurred_at", { ascending: true }),
        supabase
          .from("order_items")
          .select("id, product_title, variant_name, quantity")
          .eq("order_id", orderId),
      ]);
      if (cancelled) return;
      if (eventsResult.error) toast.error("Não foi possível carregar a história do pedido.");
      setEvents((eventsResult.data ?? []) as OrderEvent[]);
      setItems((itemsResult.data ?? []) as OrderItem[]);
    }
    load(order.id);
    return () => {
      cancelled = true;
    };
  }, [order]);

  const byKind = new Map((events ?? []).map((event) => [event.kind, event]));
  const stop = STOPPING_KINDS.map((kind) => byKind.get(kind)).find(Boolean);
  const stopped = !!stop;

  function copyTracking() {
    if (!order?.tracking_code) return;
    navigator.clipboard.writeText(order.tracking_code);
    toast.success("Código de rastreio copiado.");
  }

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#12294f]">
            Pedido #{order?.id.slice(0, 8)}
          </DialogTitle>
        </DialogHeader>

        {order ? (
          <div className="space-y-5 text-sm">
            <div className="rounded-md bg-muted/40 p-3">
              {items.map((item) => (
                <p key={item.id}>
                  {item.quantity}× {item.product_title}
                  {item.variant_name ? ` — ${item.variant_name}` : ""}
                </p>
              ))}
              <p className="mt-1 font-semibold text-[#12294f]">
                Total: {formatCentsToBRL(order.total_cents)}
              </p>
            </div>

            {order.tracking_code ? (
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Código de rastreio</p>
                  <p className="font-mono text-sm font-semibold">{order.tracking_code}</p>
                </div>
                <Button type="button" size="icon" variant="outline" onClick={copyTracking}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            {events === null ? (
              <p className="text-muted-foreground">Carregando história do pedido...</p>
            ) : (
              <ol className="space-y-0">
                {STEPS.map((step, index) => {
                  const event = byKind.get(step.kind);
                  const done = !!event;
                  const isLast = index === STEPS.length - 1 && !stopped;
                  return (
                    <li key={step.kind} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                            done
                              ? "border-[#16a34a] bg-[#16a34a] text-white"
                              : "border-muted-foreground/30 bg-white"
                          }`}
                        >
                          {done ? <Check className="h-3.5 w-3.5" /> : null}
                        </span>
                        {!isLast ? (
                          <span className={`w-0.5 grow ${done ? "bg-[#16a34a]" : "bg-muted-foreground/20"}`} />
                        ) : null}
                      </div>
                      <div className="pb-5">
                        <p className={done ? "font-semibold text-[#12294f]" : "text-muted-foreground"}>
                          {event?.title ?? step.title}
                        </p>
                        {event ? (
                          <>
                            <p className="text-xs text-muted-foreground">{formatDateTime(event.occurred_at)}</p>
                            {event.detail ? <p className="mt-0.5 text-xs">{event.detail}</p> : null}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">{step.pending}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
                {stop ? (
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white">
                      !
                    </span>
                    <div>
                      <p className="font-semibold text-destructive">{stop.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(stop.occurred_at)}</p>
                      {stop.detail ? <p className="mt-0.5 text-xs">{stop.detail}</p> : null}
                    </div>
                  </li>
                ) : null}
              </ol>
            )}

            {order.status === "pending" ? (
              <Link
                to="/pedido/$orderId"
                params={{ orderId: order.id }}
                className="inline-block text-sm font-semibold text-[#16a34a] hover:underline"
              >
                Ver dados do pagamento
              </Link>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
