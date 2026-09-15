import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Copy, XCircle } from "lucide-react";
import { toast } from "sonner";

import { formatCentsToBRL } from "@/lib/money";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pedido/$orderId")({
  head: () => ({
    meta: [
      { title: "Seu pedido - Alna Commerce" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrderStatusPage,
});

const FUNCTIONS_URL = `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1`;
const POLL_INTERVAL_MS = 5000;

type OrderStatusResponse = {
  order: {
    id: string;
    status: string;
    payment_status: string | null;
    payment_method: string | null;
    total_cents: number;
    installment_count: number;
  };
  pix: { encodedImage: string; payload: string; expirationDate: string } | null;
};

function OrderStatusPage() {
  const { orderId } = Route.useParams();
  const [data, setData] = useState<OrderStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStatus() {
    try {
      const resp = await fetch(`${FUNCTIONS_URL}/get-order-status?orderId=${orderId}`);
      if (resp.ok) setData(await resp.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    if (!data || data.order.status !== "pending" || data.order.payment_method !== "pix") return;
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.order.status]);

  function copyPixCode() {
    if (!data?.pix?.payload) return;
    navigator.clipboard.writeText(data.pix.payload);
    toast.success("Código Pix copiado.");
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <div className="mx-auto max-w-lg px-4 py-14 text-center">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando seu pedido...</p>
        ) : !data ? (
          <>
            <h1 className="text-xl font-bold text-[#12294f]">Pedido não encontrado</h1>
            <Link to="/loja" search={{ categoria: undefined }} className="mt-4 inline-block text-[#16a34a] hover:underline">
              Voltar para a loja
            </Link>
          </>
        ) : data.order.status === "paid" ? (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-[#16a34a]" />
            <h1 className="mt-3 text-xl font-bold text-[#12294f]">Pagamento confirmado!</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pedido #{data.order.id.slice(0, 8)} — {formatCentsToBRL(data.order.total_cents)}
            </p>
            <Link
              to="/loja"
              search={{ categoria: undefined }}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-[#12294f] px-5 py-3 text-sm font-bold text-white hover:bg-[#12294f]/90"
            >
              Continuar comprando
            </Link>
          </>
        ) : data.order.status === "cancelled" ? (
          <>
            <XCircle className="mx-auto h-14 w-14 text-destructive" />
            <h1 className="mt-3 text-xl font-bold text-[#12294f]">Não foi possível concluir o pagamento</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Verifique os dados e tente novamente, ou fale com a gente pelo WhatsApp.
            </p>
            <Link to="/checkout" className="mt-6 inline-block text-[#16a34a] hover:underline">
              Tentar novamente
            </Link>
          </>
        ) : data.pix ? (
          <>
            <h1 className="text-xl font-bold text-[#12294f]">Pague com Pix para confirmar</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Total: {formatCentsToBRL(data.order.total_cents)}
            </p>
            <img
              src={`data:image/png;base64,${data.pix.encodedImage}`}
              alt="QR Code Pix"
              className="mx-auto mt-5 h-56 w-56"
            />
            <Button variant="outline" onClick={copyPixCode} className="mt-4 gap-2">
              <Copy className="h-4 w-4" /> Copiar código Pix
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              Assim que o pagamento for confirmado, esta página atualiza automaticamente.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Processando pagamento...</p>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
