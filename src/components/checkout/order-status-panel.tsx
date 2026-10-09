import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Copy, PackageCheck, Truck, XCircle } from "lucide-react";
import { toast } from "sonner";

import { formatCentsToBRL } from "@/lib/money";
import { useOrderStatus } from "@/lib/checkout/use-order-status";
import { Button } from "@/components/ui/button";

const FUNCTIONS_URL = `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1`;
const WHATSAPP_URL = "https://wa.me/5551994911125";

type PixData = { encodedImage: string; payload: string; expirationDate: string };
type RegenState = { status: "idle" | "working" | "failed"; pix: PixData | null; message: string | null; retry: boolean };

const REGEN_MESSAGES: Record<string, string> = {
  too_old: "Esse pedido é antigo e o Pix não pode mais ser gerado. Faça um novo pedido, é rapidinho.",
  limit: "Já geramos novos Pix para esse pedido várias vezes. Fale com a gente pelo WhatsApp ou faça um novo pedido.",
  cancelled: "Esse pedido foi cancelado. Faça um novo pedido quando quiser.",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function TrackingTimeline({ order }: { order: NonNullable<ReturnType<typeof useOrderStatus>["data"]>["order"] }) {
  // Nothing to show until the shipping label exists (same moment "Pedido preparado para envio" appears in Minha Conta).
  if (!order.melhor_envio_shipment_id && !order.tracking_code) return null;
  const posted = order.tracking?.postedAt ?? null;
  const delivered = order.tracking?.deliveredAt ?? null;

  // Same steps and wording as the order history in Minha Conta (order-timeline-dialog.tsx).
  const steps = [
    { label: "Pagamento confirmado", done: true, date: null as string | null },
    { label: "Pedido preparado para envio", done: true, date: null as string | null },
    { label: "Deixado no ponto de coleta", done: !!posted, date: posted },
    { label: "Pedido entregue", done: !!delivered, date: delivered },
  ];

  return (
    <div className="mt-6 rounded-lg border border-[#12294f]/10 bg-[#fcfbf8] p-4 text-left">
      {order.tracking_code ? (
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Truck className="h-3.5 w-3.5" /> Rastreio J&amp;T Express: {order.tracking_code}
        </p>
      ) : null}
      <ol className="mt-3 space-y-2 text-sm">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-2">
            {step.done ? (
              <PackageCheck className="h-4 w-4 shrink-0 text-[#15803d]" />
            ) : (
              <span className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/40" />
            )}
            <span className={step.done ? "font-medium text-[#12294f]" : "text-muted-foreground"}>
              {step.label}
              {step.date ? ` — ${formatDate(step.date)}` : ""}
            </span>
          </li>
        ))}
      </ol>
      {order.tracking_code ? (
        <a
          href={`https://www.melhorrastreio.com.br/app/jet/${encodeURIComponent(order.tracking_code)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs text-[#15803d] hover:underline"
        >
          Acompanhar a entrega
        </a>
      ) : null}
    </div>
  );
}

export function OrderStatusPanel({ orderId }: { orderId: string | null }) {
  const { data, loading, refresh } = useOrderStatus(orderId);
  const [regen, setRegen] = useState<RegenState>({ status: "idle", pix: null, message: null, retry: true });
  const attemptedFor = useRef<string | null>(null);

  // A pending Pix order with no QR Code to show (its charge is gone, e.g. made in the previous payment account)
  // gets a payable one automatically instead of an endless "Processando pagamento...".
  async function regeneratePix(attempt = 1) {
    if (!orderId) return;
    setRegen((prev) => ({ ...prev, status: "working", message: null }));
    try {
      const resp = await fetch(`${FUNCTIONS_URL}/regenerate-pix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const json = await resp.json().catch(() => ({}));
      if (json.state === "pix" && json.pix) {
        setRegen({ status: "idle", pix: json.pix as PixData, message: null, retry: true });
      } else if (json.state === "paid") {
        setRegen({ status: "idle", pix: null, message: null, retry: true });
        void refresh();
      } else if (json.state === "busy" && attempt < 4) {
        // Another tab is generating it right now: look again in a few seconds.
        window.setTimeout(() => void regeneratePix(attempt + 1), 3000);
      } else {
        const known = REGEN_MESSAGES[json.state as string];
        setRegen({
          status: "failed",
          pix: null,
          message: known ?? json.error ?? "Não conseguimos gerar o seu Pix agora.",
          retry: !known,
        });
      }
    } catch {
      setRegen({ status: "failed", pix: null, message: "Não conseguimos gerar o seu Pix agora.", retry: true });
    }
  }

  useEffect(() => {
    if (!data || !orderId) return;
    if (data.order.status !== "pending" || data.order.payment_method !== "pix" || data.pix) return;
    if (attemptedFor.current === orderId) return;
    attemptedFor.current = orderId;
    void regeneratePix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, orderId]);

  function copyPixCode() {
    if (!data?.pix?.payload) return;
    navigator.clipboard.writeText(data.pix.payload);
    toast.success("Código Pix copiado.");
  }

  if (loading) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Processando pagamento...</p>;
  }
  if (!data) {
    return (
      <div className="py-6 text-center">
        <h2 className="text-lg font-bold text-[#12294f]">Pedido não encontrado</h2>
        <Link to="/loja" search={{ categoria: undefined }} className="mt-3 inline-block text-[#15803d] hover:underline">
          Voltar para a loja
        </Link>
      </div>
    );
  }

  const { order } = data;
  const pix = data.pix ?? regen.pix;

  if (order.status === "paid" || order.status === "shipped" || order.status === "completed") {
    return (
      <div className="py-4 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-[#15803d]" />
        <h2 className="mt-3 text-lg font-bold text-[#12294f]">Pagamento confirmado!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pedido #{order.id.slice(0, 8)} — {formatCentsToBRL(order.total_cents)}
        </p>
        <TrackingTimeline order={order} />
        <Link
          to="/loja"
          search={{ categoria: undefined }}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-[#12294f] px-5 py-3 text-sm font-bold text-white hover:bg-[#12294f]/90"
        >
          Continuar comprando
        </Link>
      </div>
    );
  }

  if (order.status === "cancelled") {
    return (
      <div className="py-4 text-center">
        <XCircle className="mx-auto h-14 w-14 text-destructive" />
        <h2 className="mt-3 text-lg font-bold text-[#12294f]">Não foi possível concluir o pagamento</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Verifique os dados e tente novamente, ou fale com a gente pelo WhatsApp.
        </p>
        <Link to="/checkout" className="mt-6 inline-block text-[#15803d] hover:underline">
          Tentar novamente
        </Link>
      </div>
    );
  }

  if (pix) {
    return (
      <div className="py-4 text-center">
        <h2 className="text-lg font-bold text-[#12294f]">Pague com Pix para confirmar</h2>
        <p className="mt-1 text-sm text-muted-foreground">Total: {formatCentsToBRL(order.total_cents)}</p>
        <img src={`data:image/png;base64,${pix.encodedImage}`} alt="QR Code Pix" className="mx-auto mt-5 h-56 w-56" />
        <Button variant="outline" onClick={copyPixCode} className="mt-4 gap-2">
          <Copy className="h-4 w-4" /> Copiar código Pix
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          Assim que o pagamento for confirmado, esta tela atualiza automaticamente.
        </p>
      </div>
    );
  }

  if (order.payment_method === "pix" && regen.status === "failed") {
    return (
      <div className="py-6 text-center">
        <h2 className="text-lg font-bold text-[#12294f]">Não conseguimos mostrar o seu Pix agora</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{regen.message}</p>
        <div className="mt-5 flex flex-col items-center gap-2">
          {regen.retry ? (
            <Button onClick={() => void regeneratePix()} className="bg-[#15803d] hover:bg-[#15803d]/90">
              Tentar de novo
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              Falar no WhatsApp
            </a>
          </Button>
          <Link to="/loja" search={{ categoria: undefined }} className="text-sm text-[#15803d] hover:underline">
            Fazer um novo pedido
          </Link>
        </div>
      </div>
    );
  }
  if (order.payment_method === "pix") {
    return <p className="py-6 text-center text-sm text-muted-foreground">Gerando o seu Pix...</p>;
  }

  return <p className="py-6 text-center text-sm text-muted-foreground">Processando pagamento...</p>;
}
