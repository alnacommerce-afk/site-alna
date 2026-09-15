import { Link } from "@tanstack/react-router";
import { CheckCircle2, Copy, PackageCheck, Truck, XCircle } from "lucide-react";
import { toast } from "sonner";

import { formatCentsToBRL } from "@/lib/money";
import { useOrderStatus } from "@/lib/checkout/use-order-status";
import { Button } from "@/components/ui/button";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function TrackingTimeline({ order }: { order: NonNullable<ReturnType<typeof useOrderStatus>["data"]>["order"] }) {
  if (!order.tracking_code) return null;
  const posted = order.tracking?.postedAt ?? null;
  const delivered = order.tracking?.deliveredAt ?? null;

  const steps = [
    { label: "Pagamento confirmado", done: true, date: null as string | null },
    { label: posted ? "Coletado pela transportadora" : "Aguardando coleta", done: !!posted, date: posted },
    { label: "Entregue", done: !!delivered, date: delivered },
  ];

  return (
    <div className="mt-6 rounded-lg border border-[#12294f]/10 bg-[#fcfbf8] p-4 text-left">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Truck className="h-3.5 w-3.5" /> Rastreio J&amp;T Express: {order.tracking_code}
      </p>
      <ol className="mt-3 space-y-2 text-sm">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-2">
            {step.done ? (
              <PackageCheck className="h-4 w-4 shrink-0 text-[#16a34a]" />
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
      {order.label_url ? (
        <a
          href={order.label_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs text-[#16a34a] hover:underline"
        >
          Ver etiqueta de envio
        </a>
      ) : null}
    </div>
  );
}

export function OrderStatusPanel({ orderId }: { orderId: string | null }) {
  const { data, loading } = useOrderStatus(orderId);

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
        <Link to="/loja" search={{ categoria: undefined }} className="mt-3 inline-block text-[#16a34a] hover:underline">
          Voltar para a loja
        </Link>
      </div>
    );
  }

  const { order, pix } = data;

  if (order.status === "paid" || order.status === "shipped" || order.status === "completed") {
    return (
      <div className="py-4 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-[#16a34a]" />
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
        <Link to="/checkout" className="mt-6 inline-block text-[#16a34a] hover:underline">
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

  return <p className="py-6 text-center text-sm text-muted-foreground">Processando pagamento...</p>;
}
