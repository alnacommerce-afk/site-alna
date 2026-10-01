import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { storeLink } from "@/lib/site-urls";

export const Route = createFileRoute("/admin/marketing/campanhas/")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: CampanhasPage,
});

type Campaign = {
  id: string;
  name: string;
  utm_campaign: string;
  created_at: string;
};

// Same definition the rest of the admin uses for "a real sale" (Visão Geral dashboard).
const NOT_A_SALE = new Set(["pending", "cancelled"]);

function slugify(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "campanha"
  );
}

function campaignLink(utmCampaign: string) {
  return storeLink(
    `/loja?utm_source=campanha&utm_medium=offline&utm_campaign=${encodeURIComponent(utmCampaign)}`,
  );
}

type ViewsState =
  | { status: "loading" }
  | { status: "not_configured" }
  | { status: "error" }
  | { status: "ok"; counts: Record<string, number> };

function CampanhasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [salesCounts, setSalesCounts] = useState<Record<string, number>>({});
  const [views, setViews] = useState<ViewsState>({ status: "loading" });
  const [newName, setNewName] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function loadCampaigns() {
      const { data, error } = await supabase
        .from("marketing_campaigns")
        .select("id, name, utm_campaign, created_at")
        .order("created_at", { ascending: true });
      if (error) {
        toast.error("Não foi possível carregar as campanhas.");
        setCampaigns([]);
        return;
      }
      setCampaigns(data ?? []);
    }
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (!campaigns) return;
    const list = campaigns;

    async function loadSales() {
      const { data } = await supabase
        .from("orders")
        .select("utm_campaign, status")
        .not("utm_campaign", "is", null);
      const counts: Record<string, number> = {};
      for (const order of data ?? []) {
        if (!order.utm_campaign || NOT_A_SALE.has(order.status)) continue;
        counts[order.utm_campaign] = (counts[order.utm_campaign] ?? 0) + 1;
      }
      setSalesCounts(counts);
    }
    loadSales();

    async function loadViews() {
      if (list.length === 0) {
        setViews({ status: "ok", counts: {} });
        return;
      }
      setViews({ status: "loading" });
      const { data, error } = await supabase.functions.invoke("ga4-campaign-views", {
        body: { campaigns: list.map((c) => c.utm_campaign) },
      });
      if (error) {
        setViews({ status: "error" });
        return;
      }
      if (data?.configured === false) {
        setViews({ status: "not_configured" });
        return;
      }
      setViews({ status: "ok", counts: data?.views ?? {} });
    }
    loadViews();
  }, [campaigns]);

  async function handleGenerate() {
    const name = newName.trim();
    if (!name || !campaigns) return;
    setGenerating(true);
    const baseSlug = slugify(name);
    let attempt = 0;
    while (attempt < 6) {
      const utmCampaign = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
      const { data, error } = await supabase
        .from("marketing_campaigns")
        .insert({ name, utm_campaign: utmCampaign })
        .select("id, name, utm_campaign, created_at")
        .single();
      if (!error && data) {
        setCampaigns((prev) => [...(prev ?? []), data]);
        setNewName("");
        setGenerating(false);
        return;
      }
      if (error?.code === "23505") {
        attempt++;
        continue;
      }
      toast.error("Não foi possível criar a campanha.");
      setGenerating(false);
      return;
    }
    toast.error("Não foi possível gerar um link único para essa campanha.");
    setGenerating(false);
  }

  function copyLink(utmCampaign: string) {
    navigator.clipboard
      .writeText(campaignLink(utmCampaign))
      .then(() => toast.success("Link copiado!"))
      .catch(() => toast.error("Não foi possível copiar o link."));
  }

  function renderViews(utmCampaign: string) {
    if (views.status === "ok") return views.counts[utmCampaign] ?? 0;
    if (views.status === "error") return <span className="text-destructive">Erro</span>;
    if (views.status === "not_configured") return <span className="text-muted-foreground">—</span>;
    return <span className="text-muted-foreground">Carregando...</span>;
  }

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Campanhas</h1>
        <p className="text-sm text-muted-foreground">
          Gere um link com UTM para campanhas de panfleto, outdoor, redes sociais etc. e acompanhe
          quantas visualizações e vendas cada uma trouxe.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome da campanha</TableHead>
            <TableHead>Link UTM</TableHead>
            <TableHead>Visualizações (30 dias)</TableHead>
            <TableHead>Nº de vendas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns === null ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                Carregando...
              </TableCell>
            </TableRow>
          ) : (
            campaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell className="font-medium">{campaign.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="inline-block max-w-[320px] truncate align-middle text-xs text-muted-foreground">
                      {campaignLink(campaign.utm_campaign)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => copyLink(campaign.utm_campaign)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{renderViews(campaign.utm_campaign)}</TableCell>
                <TableCell>{salesCounts[campaign.utm_campaign] ?? 0}</TableCell>
              </TableRow>
            ))
          )}

          <TableRow>
            <TableCell>
              <Input
                placeholder="Nome da campanha"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) handleGenerate();
                }}
              />
            </TableCell>
            <TableCell>
              {newName.trim() ? (
                <Button size="sm" onClick={handleGenerate} disabled={generating}>
                  {generating ? "Gerando..." : "Gerar"}
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">—</TableCell>
            <TableCell className="text-muted-foreground">—</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </AdminShell>
  );
}
