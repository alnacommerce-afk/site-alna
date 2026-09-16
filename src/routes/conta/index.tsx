import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import { CustomerShell } from "@/components/customer/customer-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SITE_URL = "https://alnacommerce.com";
const REFERRAL_CODE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomReferralCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += REFERRAL_CODE_CHARS[Math.floor(Math.random() * REFERRAL_CODE_CHARS.length)];
  }
  return code;
}

export const Route = createFileRoute("/conta/")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: MinhaContaPage,
});

type OrderRow = {
  id: string;
  created_at: string;
  total_cents: number;
  payment_method: string | null;
  status: string;
  tracking_code: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  paid: "default",
  shipped: "default",
  completed: "default",
  cancelled: "destructive",
};

function MinhaContaPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("orders")
        .select("id, created_at, total_cents, payment_method, status, tracking_code")
        .order("created_at", { ascending: false });
      setOrders((data ?? []) as OrderRow[]);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    async function loadReferralCode() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      const { data: existing } = await supabase
        .from("referral_codes")
        .select("code")
        .eq("user_id", userId)
        .maybeSingle();
      if (existing) {
        setReferralCode(existing.code);
        return;
      }

      for (let attempt = 0; attempt < 5; attempt++) {
        const code = randomReferralCode();
        const { data: created, error } = await supabase
          .from("referral_codes")
          .insert({ user_id: userId, code })
          .select("code")
          .maybeSingle();
        if (created) {
          setReferralCode(created.code);
          return;
        }
        if (error?.code !== "23505") break;
      }
    }
    loadReferralCode();
  }, []);

  const referralLink = referralCode ? `${SITE_URL}/loja?ref=${referralCode}` : null;

  function copyReferralLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast.success("Link copiado!");
  }

  return (
    <CustomerShell>
      {referralLink && (
        <div className="mb-6 rounded-lg border border-[#12294f]/10 bg-[#f0fdf4] p-4">
          <p className="text-sm font-semibold text-[#12294f]">Indique e ganhe 5%</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Compartilhe seu link pessoal — quando alguém comprar através dele, você ganha um cupom de 5% de desconto.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 truncate rounded-md bg-white px-3 py-2 text-xs text-[#12294f]">
              {referralLink}
            </code>
            <Button type="button" size="icon" variant="outline" onClick={copyReferralLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Você ainda não fez nenhum pedido.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              to="/pedido/$orderId"
              params={{ orderId: order.id }}
              className="flex items-center justify-between rounded-lg border border-[#12294f]/10 p-4 text-sm hover:bg-muted/40"
            >
              <div>
                <p className="font-semibold text-[#12294f]">Pedido #{order.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString("pt-BR")}
                  {order.tracking_code ? ` — Rastreio: ${order.tracking_code}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#12294f]">{formatCentsToBRL(order.total_cents)}</span>
                <Badge variant={STATUS_VARIANTS[order.status] ?? "secondary"}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </CustomerShell>
  );
}
