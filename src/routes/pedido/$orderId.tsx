import { createFileRoute } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { OrderStatusPanel } from "@/components/checkout/order-status-panel";

export const Route = createFileRoute("/pedido/$orderId")({
  head: () => ({
    meta: [
      { title: "Seu pedido - ALNA" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrderStatusPage,
});

function OrderStatusPage() {
  const { orderId } = Route.useParams();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-4 py-14 text-center">
        <OrderStatusPanel orderId={orderId} />
      </div>
      <SiteFooter />
    </div>
  );
}
