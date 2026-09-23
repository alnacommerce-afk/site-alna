import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL, formatDecimalToInput, parseDecimalInput } from "@/lib/money";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
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
  cost_cents: number | null;
  extra_cost_cents: number | null;
  tax_rate_pct: number;
  card_fee_pct: number;
  productTitle: string;
};

type FreightState = { status: "loading" | "ok" | "error"; cents: number | null };

function formatPct(value: number): string {
  return `${value.toFixed(2).replace(".", ",")}%`;
}

// Preço de venda = Custos fixos ÷ [1 − (Imposto% + Cartão% + Margem%)]. Imposto, cartão e margem
// são todos descontados do preço final (não do custo) — por isso somam no divisor, junto, em vez
// de o imposto virar um valor somado ao custo. Ex.: custo R$7, imposto 6% + cartão 2% + margem
// 20% → R$7 ÷ (1 − 0,28) = R$9,72, com 20% de margem líquida de verdade.
function computeVariantPricing(row: VariantRow, desiredMarginPct: number) {
  const hasCost = row.cost_cents != null;
  const custoTotalCents = (row.cost_cents ?? 0) + (row.extra_cost_cents ?? 0);
  const denom = 1 - (row.tax_rate_pct + row.card_fee_pct + desiredMarginPct) / 100;
  const precoCalculadoCents = hasCost && denom > 0 ? Math.round(custoTotalCents / denom) : null;
  // Quanto do preço final vira imposto, cartão e margem, em reais.
  const impostoCents =
    precoCalculadoCents != null ? Math.round(precoCalculadoCents * (row.tax_rate_pct / 100)) : null;
  const cartaoCents =
    precoCalculadoCents != null ? Math.round(precoCalculadoCents * (row.card_fee_pct / 100)) : null;
  const margemCents =
    precoCalculadoCents != null ? Math.round(precoCalculadoCents * (desiredMarginPct / 100)) : null;
  return {
    hasCost,
    custoTotalCents,
    impostoCents,
    cartaoCents,
    margemCents,
    precoCalculadoCents,
    denomValid: denom > 0,
  };
}

function PrecificacaoPage() {
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [desiredMarginPct, setDesiredMarginPct] = useState(0);
  const [marginDraft, setMarginDraft] = useState("0");
  const [rowDrafts, setRowDrafts] = useState<Record<string, { tax: string; card: string }>>({});
  const [selectedUf, setSelectedUf] = useState<Record<string, string>>({});
  const [freight, setFreight] = useState<Record<string, FreightState>>({});
  const applyingRef = useRef(false);

  async function load() {
    const [{ data: settingsRow }, { data, error }] = await Promise.all([
      supabase
        .from("pricing_settings")
        .select("desired_margin_pct")
        .eq("id", "default")
        .maybeSingle(),
      supabase
        .from("product_variants")
        .select(
          "id, sku, name, price_cents, cost_cents, extra_cost_cents, tax_rate_pct, card_fee_pct, products!inner(title, status)",
        )
        .eq("products.status", "published")
        .order("sku"),
    ]);

    if (settingsRow) {
      setDesiredMarginPct(settingsRow.desired_margin_pct);
      setMarginDraft(formatDecimalToInput(settingsRow.desired_margin_pct));
    }

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
      cost_cents: v.cost_cents,
      extra_cost_cents: v.extra_cost_cents,
      tax_rate_pct: v.tax_rate_pct,
      card_fee_pct: v.card_fee_pct,
      productTitle: (v.products as { title: string } | null)?.title ?? "",
    }));
    setRows(variantRows);
    setRowDrafts(
      Object.fromEntries(
        variantRows.map((v) => [
          v.id,
          { tax: formatDecimalToInput(v.tax_rate_pct), card: formatDecimalToInput(v.card_fee_pct) },
        ]),
      ),
    );
    setSelectedUf((prev) => ({
      ...Object.fromEntries(variantRows.map((v) => [v.id, DEFAULT_UF])),
      ...prev,
    }));
    setLoading(false);

    for (const v of variantRows) {
      calculateFreight(v.id, DEFAULT_UF);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preço = (Custo + Imposto) ÷ (1 − cartão% − margem%) — aplicado automaticamente no
  // product_variants.price_cents de cada anúncio sempre que o custo (API), o imposto/cartão da
  // variação ou a margem da loja mudam.
  useEffect(() => {
    if (loading || applyingRef.current) return;
    const updates = rows
      .map((row) => ({ row, calc: computeVariantPricing(row, desiredMarginPct) }))
      .filter(
        ({ row, calc }) =>
          calc.precoCalculadoCents != null && calc.precoCalculadoCents !== row.price_cents,
      );
    if (updates.length === 0) return;

    applyingRef.current = true;
    (async () => {
      let applied = 0;
      for (const { row, calc } of updates) {
        const { error } = await supabase
          .from("product_variants")
          .update({ price_cents: calc.precoCalculadoCents! })
          .eq("id", row.id);
        if (!error) {
          applied++;
          setRows((prev) =>
            prev.map((r) =>
              r.id === row.id ? { ...r, price_cents: calc.precoCalculadoCents! } : r,
            ),
          );
        }
      }
      if (applied > 0) {
        toast.success(
          applied === 1
            ? "1 preço atualizado automaticamente."
            : `${applied} preços atualizados automaticamente.`,
        );
      }
      applyingRef.current = false;
    })();
  }, [rows, desiredMarginPct, loading]);

  async function saveMargin(rawValue: string) {
    const parsed = parseDecimalInput(rawValue) ?? 0;
    if (parsed === desiredMarginPct) return;
    const { error } = await supabase
      .from("pricing_settings")
      .update({ desired_margin_pct: parsed })
      .eq("id", "default");
    if (error) {
      toast.error("Não foi possível salvar a margem.");
      return;
    }
    setDesiredMarginPct(parsed);
  }

  async function saveRowPct(
    rowId: string,
    field: "tax_rate_pct" | "card_fee_pct",
    rawValue: string,
  ) {
    const parsed = parseDecimalInput(rawValue) ?? 0;
    const current = rows.find((r) => r.id === rowId);
    if (!current || parsed === current[field]) return;
    const payload = field === "tax_rate_pct" ? { tax_rate_pct: parsed } : { card_fee_pct: parsed };
    const { error } = await supabase.from("product_variants").update(payload).eq("id", rowId);
    if (error) {
      toast.error("Não foi possível salvar o %.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [field]: parsed } : r)));
  }

  async function syncCosts() {
    setSyncing(true);
    try {
      const resp = await fetch(`${FUNCTIONS_URL}/sync-skus`, { method: "POST" });
      const json = await resp.json();
      if (!resp.ok || json.error) throw new Error(json.error ?? "Erro ao sincronizar custos.");
      toast.success(
        `Custos sincronizados: ${json.updated_variants} variação(ões) atualizada(s).` +
          (json.skus_not_found_here > 0
            ? ` ${json.skus_not_found_here} SKU(s) do FinMarket não encontrados aqui.`
            : ""),
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao sincronizar custos.");
    } finally {
      setSyncing(false);
    }
  }

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
      setFreight((prev) => ({
        ...prev,
        [variantId]: { status: "ok", cents: json.originalPriceCents },
      }));
    } catch {
      setFreight((prev) => ({ ...prev, [variantId]: { status: "error", cents: null } }));
    }
  }

  function handleUfChange(variantId: string, uf: string) {
    setSelectedUf((prev) => ({ ...prev, [variantId]: uf }));
    calculateFreight(variantId, uf);
  }

  return (
    <AdminShell>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Precificação</h1>
          <p className="text-sm text-muted-foreground">
            Custo puxado do FinMarket HUB, imposto e cartão por SKU, margem única pra loja toda — o
            preço de venda é calculado e aplicado sozinho. O frete (Melhor Envio) até a capital de
            qualquer estado aparece na hora.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={syncing} onClick={syncCosts}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sincronizar custos"}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhum anúncio publicado ainda.
        </div>
      ) : (
        <div className="overflow-x-hidden">
          <Table className="table-fixed text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18%]">SKU</TableHead>
                <TableHead className="w-[12%]">Custo (API)</TableHead>
                <TableHead className="w-[14%]">Imposto (% + R$)</TableHead>
                <TableHead className="w-[13%]">Cartão (% + R$)</TableHead>
                <TableHead className="w-[13%]">
                  <div className="space-y-1">
                    <span>Margem (loja, % + R$)</span>
                    <Input
                      className="h-6 w-14 text-xs"
                      inputMode="decimal"
                      value={marginDraft}
                      onChange={(e) => setMarginDraft(e.target.value)}
                      onBlur={() => saveMargin(marginDraft)}
                    />
                    <span className="font-normal text-muted-foreground">%</span>
                  </div>
                </TableHead>
                <TableHead className="w-[13%]">Preço calculado</TableHead>
                <TableHead className="w-[15%]">Frete até a capital</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const calc = computeVariantPricing(row, desiredMarginPct);
                const freightInfo = freight[row.id];
                const draft = rowDrafts[row.id] ?? { tax: "0", card: "0" };

                return (
                  <TableRow key={row.id}>
                    <TableCell className="truncate">
                      <p className="truncate font-mono font-semibold">{row.sku}</p>
                      <p className="truncate text-muted-foreground">
                        {row.productTitle}
                        {row.name ? ` — ${row.name}` : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      {calc.hasCost ? (
                        formatCentsToBRL(calc.custoTotalCents)
                      ) : (
                        <span className="text-muted-foreground">não sincronizado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          className="h-6 w-12 text-xs"
                          inputMode="decimal"
                          value={draft.tax}
                          onChange={(e) =>
                            setRowDrafts((prev) => ({
                              ...prev,
                              [row.id]: { tax: e.target.value, card: prev[row.id]?.card ?? "0" },
                            }))
                          }
                          onBlur={() => saveRowPct(row.id, "tax_rate_pct", draft.tax)}
                        />
                        <span>%</span>
                      </div>
                      <p className="mt-0.5 text-muted-foreground">
                        {calc.hasCost && calc.impostoCents != null
                          ? formatCentsToBRL(calc.impostoCents)
                          : "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          className="h-6 w-12 text-xs"
                          inputMode="decimal"
                          value={draft.card}
                          onChange={(e) =>
                            setRowDrafts((prev) => ({
                              ...prev,
                              [row.id]: { tax: prev[row.id]?.tax ?? "0", card: e.target.value },
                            }))
                          }
                          onBlur={() => saveRowPct(row.id, "card_fee_pct", draft.card)}
                        />
                        <span>%</span>
                      </div>
                      <p className="mt-0.5 text-muted-foreground">
                        {calc.cartaoCents != null ? formatCentsToBRL(calc.cartaoCents) : "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p>{formatPct(desiredMarginPct)}</p>
                      <p className="mt-0.5 text-muted-foreground">
                        {calc.margemCents != null ? formatCentsToBRL(calc.margemCents) : "—"}
                      </p>
                    </TableCell>
                    <TableCell className="font-semibold text-[#12294f]">
                      {calc.precoCalculadoCents != null ? (
                        formatCentsToBRL(calc.precoCalculadoCents)
                      ) : !calc.denomValid ? (
                        <span className="text-destructive">imposto+cartão+margem ≥ 100%</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Select
                          value={selectedUf[row.id] ?? DEFAULT_UF}
                          onValueChange={(uf) => handleUfChange(row.id, uf)}
                        >
                          <SelectTrigger className="h-7 w-16 text-xs">
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
                        <span className="text-muted-foreground">
                          {!freightInfo || freightInfo.status === "loading"
                            ? "Calculando..."
                            : freightInfo.status === "error"
                              ? "Indisponível"
                              : formatCentsToBRL(freightInfo.cents ?? 0)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminShell>
  );
}
