import { useEffect, useState } from "react";

const FUNCTIONS_URL = `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1`;
const POLL_INTERVAL_MS = 5000;

export type OrderStatusResponse = {
  order: {
    id: string;
    status: string;
    payment_status: string | null;
    payment_method: string | null;
    total_cents: number;
    installment_count: number;
    tracking_code: string | null;
    label_url: string | null;
    tracking: { status: string; postedAt: string | null; deliveredAt: string | null } | null;
  };
  pix: { encodedImage: string; payload: string; expirationDate: string } | null;
};

export function useOrderStatus(orderId: string | null) {
  const [data, setData] = useState<OrderStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStatus() {
    if (!orderId) return;
    try {
      const resp = await fetch(`${FUNCTIONS_URL}/get-order-status?orderId=${orderId}`);
      if (resp.ok) setData(await resp.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    setData(null);
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    if (!data || data.order.status !== "pending" || data.order.payment_method !== "pix") return;
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.order.status]);

  return { data, loading };
}
