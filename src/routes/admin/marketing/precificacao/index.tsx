import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL, formatCentsToInput, parseCentsFromInput } from "@/lib/money";
import { AdminShell } from "@/components/admin/admin-shell";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/marketing/precificacao/")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: PrecificacaoPage,
});

const FUNCTIONS_URL = `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1`;
const DEFAULT_UF = "SP";

// Capital CEPs — each verified live against ViaCEP before shipping this page, since Melhor
// Envio's calculate endpoint needs a real, deliverable postal code (a bare "70000-000"-style
// guess for a capital is not guaranteed to actually exist).
const BRAZIL_STATES = [
  { uf: "AC", name: "Acre", capitalCep: "69921092" },
  { uf: "AL", name: "Alagoas", capitalCep: "57041350" },
  { uf: "AP", name: "Amapá", capitalCep: "68900013" },
  { uf: "AM", name: "Amazonas", capitalCep: "69057004" },
  { uf: "BA", name: "Bahia", capitalCep: "41500620" },
  { uf: "CE", name: "Ceará", capitalCep: "60176210" },
  { uf: "DF", name: "Distrito Federal", capitalCep: "72615002" },
  { uf: "ES", name: "Espírito Santo", capitalCep: "29016345" },
  { uf: "GO", name: "Goiás", capitalCep: "74053010" },
  { uf: "MA", name: "Maranhão", capitalCep: "65066660" },
  { uf: "MT", name: "Mato Grosso", capitalCep: "78049531" },
  { uf: "MS", name: "Mato Grosso do Sul", capitalCep: "79070060" },
  { uf: "MG", name: "Minas Gerais", capitalCep: "30510670" },
  { uf: "PA", name: "Pará", capitalCep: "66814133" },
  { uf: "PB", name: "Paraíba", capitalCep: "58010820" },
  { uf: "PR", name: "Paraná", capitalCep: "80020924" },
  { uf: "PE", name: "Pernambuco", capitalCep: "50060003" },
  { uf: "PI", name: "Piauí", capitalCep: "64060810" },
  { uf: "RJ", name: "Rio de Janeiro", capitalCep: "21011718" },
  { uf: "RN", name: "Rio Grande do Norte", capitalCep: "59073817" },
  { uf: "RS", name: "Rio Grande do Sul", capitalCep: "91250373" },
  { uf: "RO", name: "Rondônia", capitalCep: "76811278" },
  { uf: "RR", name: "Roraima", capitalCep: "69301970" },
  { uf: "SC", name: "Santa Catarina", capitalCep: "88010000" },
  { uf: "SP", name: "São Paulo", capitalCep: "04939180" },
  { uf: "SE", name: "Sergipe", capitalCep: "49081000" },
  { uf: "TO", name: "Tocantins", capitalCep: "77001900" },
];

type VariantRow = {
  id: string;
  sku: string;
  name: string;
  price_cents: number;
  productTitle: string;
};

type FreightState = { status: "loading" | "ok" | "error"; cents: number | null };

function PrecificacaoPage() {
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const [selectedUf, setSelectedUf] = useState<Record<string, string>>({});
  const [freight, setFreight] = useState<Record<string, FreightState>>({});

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("product_variants")
        .select("id, sku, name, price_cents, products!inner(title, status)")
        .eq("products.status", "published")
        .order("sku");

      if (error) {
        toast.error("Não foi possível carregar os anúncios.");
        setLoading(false);
        return;
      }

      const variantRows = (data ?? []).map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        price_cents: v.price_cents,
        productTitle: (v.products as { title: string } | null)?.title ?? "",
      }));
      setRows(variantRows);
      setPriceDrafts(Object.fromEntries(variantRows.map((v) => [v.id, formatCentsToInput(v.price_cents)])));
      setSelectedUf(Object.fromEntries(variantRows.map((v) => [v.id, DEFAULT_UF])));
      setLoading(false);

      for (const v of variantRows) {
        calculateFreight(v.id, DEFAULT_UF);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function calculateFreight(variantId: string, uf: string) {
    const state = BRAZIL_STATES.find((s) => s.uf === uf);
    if (!state) return;
    setFreight((prev) => ({ ...prev, [variantId]: { status: "loading", cents: null } }));
    try {
      const resp = await fetch(`${FUNCTIONS_URL}/calculate-shipping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationZip: state.capitalCep,
          items: [{ variantId, quantity: 1 }],
        }),
      });
      const json = await resp.json();
      if (!resp.ok || json.error) {
        setFreight((prev) => ({ ...prev, [variantId]: { status: "error", cents: null } }));
        return;
      }
      // originalPriceCents (not priceCents) — a real freight cost regardless of the free-shipping
      // promotion, since this screen is checking actual carrier cost, not a customer-facing quote.
      setFreight((prev) => ({ ...prev, [variantId]: { status: "ok", cents: json.originalPriceCents } }));
    } catch {
      setFreight((prev) => ({ ...prev, [variantId]: { status: "error", cents: null } }));
    }
  }

  function handleUfChange(variantId: string, uf: string) {
    setSelectedUf((prev) => ({ ...prev, [variantId]: uf }));
    calculateFreight(variantId, uf);
  }

  async function savePrice(variant: VariantRow) {
    const newCents = parseCentsFromInput(priceDrafts[variant.id] ?? "");
    if (newCents === variant.price_cents) return;
    if (newCents <= 0) {
      toast.error("Informe um preço válido.");
      setPriceDrafts((prev) => ({ ...prev, [variant.id]: formatCentsToInput(variant.price_cents) }));
      return;
    }

    setSavingFor(variant.id);
    const { error } = await supabase
      .from("product_variants")
      .update({ price_cents: newCents })
      .eq("id", variant.id);
    setSavingFor(null);

    if (error) {
      toast.error("Não foi possível salvar o preço.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === variant.id ? { ...r, price_cents: newCents } : r)));
    toast.success("Preço atualizado — já vale no anúncio.");
  }

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Precificação</h1>
        <p className="text-sm text-muted-foreground">
          Ajuste o preço de cada anúncio e veja, na hora, o custo real do frete (Melhor Envio) até
          a capital de qualquer estado — e o total já somado.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhum anúncio publicado ainda.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Preço (R$)</TableHead>
              <TableHead>Frete até a capital</TableHead>
              <TableHead>Total (R$)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((variant) => {
              const draftCents = parseCentsFromInput(priceDrafts[variant.id] ?? "");
              const freightInfo = freight[variant.id];
              const totalCents = draftCents + (freightInfo?.cents ?? 0);

              return (
                <TableRow key={variant.id}>
                  <TableCell>
                    <p className="font-mono text-xs font-semibold">{variant.sku}</p>
                    <p className="text-xs text-muted-foreground">
                      {variant.productTitle}
                      {variant.name ? ` — ${variant.name}` : ""}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-28"
                      inputMode="decimal"
                      value={priceDrafts[variant.id] ?? ""}
                      onChange={(e) =>
                        setPriceDrafts((prev) => ({ ...prev, [variant.id]: e.target.value }))
                      }
                      onBlur={() => savePrice(variant)}
                      disabled={savingFor === variant.id}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedUf[variant.id] ?? DEFAULT_UF}
                        onValueChange={(uf) => handleUfChange(variant.id, uf)}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BRAZIL_STATES.map((s) => (
                            <SelectItem key={s.uf} value={s.uf}>
                              {s.uf}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">
                        {!freightInfo || freightInfo.status === "loading"
                          ? "Calculando..."
                          : freightInfo.status === "error"
                            ? "Indisponível"
                            : formatCentsToBRL(freightInfo.cents ?? 0)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-[#12294f]">
                    {freightInfo?.status === "ok" ? formatCentsToBRL(totalCents) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </AdminShell>
  );
}
