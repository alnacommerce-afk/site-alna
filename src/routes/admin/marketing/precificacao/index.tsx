import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL, formatDecimalToInput, parseDecimalInput } from "@/lib/money";
import { loadSalesAverages, type SalesAverages } from "@/lib/admin/sales-averages";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
// Média usada pelos botões "Usar média real" de cupom e de frete.
const AVERAGE_WINDOW_DAYS = 90;

type VariantRow = {
  id: string;
  sku: string;
  name: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  cost_cents: number | null;
  extra_cost_cents: number | null;
  freight_cost_cents: number | null;
  tax_rate_pct: number;
  card_fee_pct: number;
  margin_pct: number;
  coupon_avg_pct: number;
  shipping_cost_pct: number;
  discount_pct: number;
  productTitle: string;
};

type PctField =
  | "tax_rate_pct"
  | "card_fee_pct"
  | "margin_pct"
  | "coupon_avg_pct"
  | "shipping_cost_pct"
  | "discount_pct";
type PctDraftKey = "tax" | "card" | "margin" | "coupon" | "shipping" | "discount";
const FIELD_TO_DRAFT_KEY: Record<PctField, PctDraftKey> = {
  tax_rate_pct: "tax",
  card_fee_pct: "card",
  margin_pct: "margin",
  coupon_avg_pct: "coupon",
  shipping_cost_pct: "shipping",
  discount_pct: "discount",
};
const FIELD_LABELS: Record<PctField, string> = {
  tax_rate_pct: "Imposto",
  card_fee_pct: "Cartão",
  margin_pct: "Margem",
  coupon_avg_pct: "Média em cupom",
  shipping_cost_pct: "Custo do frete",
  discount_pct: "Desconto no anúncio",
};
// Estas duas mexem no preço de TODA a loja na hora, então pedem uma confirmação com o antes e o depois.
const CONFIRM_FIELDS: PctField[] = ["coupon_avg_pct", "shipping_cost_pct"];

function buildPctPayload(field: PctField, parsed: number) {
  switch (field) {
    case "tax_rate_pct":
      return { tax_rate_pct: parsed };
    case "card_fee_pct":
      return { card_fee_pct: parsed };
    case "margin_pct":
      return { margin_pct: parsed };
    case "coupon_avg_pct":
      return { coupon_avg_pct: parsed };
    case "shipping_cost_pct":
      return { shipping_cost_pct: parsed };
    case "discount_pct":
      return { discount_pct: parsed };
  }
}

type RowDraft = Record<PctDraftKey, string>;
const EMPTY_ROW_DRAFT: RowDraft = {
  tax: "0",
  card: "0",
  margin: "0",
  coupon: "0",
  shipping: "0",
  discount: "0",
};

// Preço de venda = Custo ÷ [1 − (Imposto% + Cartão% + Margem% + Cupom% + Frete%)]. Custo é a soma dos 3
// valores que o FinMarket HUB reporta por SKU (compra + extra + frete de compra) — descontados do preço
// final (não do custo), por isso somam juntos no divisor. Cupom e frete grátis (etiqueta) funcionam do
// mesmo jeito: são uma fatia do preço de venda que não chega ao bolso. Ex.: custo R$7, imposto 6% +
// cartão 2% + margem 20% + cupom 5% + frete 10% → R$7 ÷ (1 − 0,43) = R$12,28, com 20% de margem líquida
// de verdade. Todos os % são por variação — um produto específico pode precisar de um % diferente.
function computeVariantPricing(row: VariantRow) {
  const hasCost = row.cost_cents != null;
  const custoTotalCents =
    (row.cost_cents ?? 0) + (row.extra_cost_cents ?? 0) + (row.freight_cost_cents ?? 0);
  const denom =
    1 -
    (row.tax_rate_pct +
      row.card_fee_pct +
      row.margin_pct +
      row.coupon_avg_pct +
      row.shipping_cost_pct) /
      100;
  const precoCalculadoCents = hasCost && denom > 0 ? Math.round(custoTotalCents / denom) : null;
  // Quanto do preço final vira imposto, cartão, margem, cupom e frete, em reais.
  const parte = (pct: number) =>
    precoCalculadoCents != null ? Math.round(precoCalculadoCents * (pct / 100)) : null;
  const impostoCents = parte(row.tax_rate_pct);
  const cartaoCents = parte(row.card_fee_pct);
  const margemCents = parte(row.margin_pct);
  const cupomCents = parte(row.coupon_avg_pct);
  const freteCents = parte(row.shipping_cost_pct);
  // Preço "de" (vitrine): mais alto que o preço calculado, de forma que aplicando o desconto do
  // anúncio o cliente pague exatamente o preço calculado. Sem desconto, não existe preço "de".
  const anuncioCents =
    precoCalculadoCents != null && row.discount_pct > 0 && row.discount_pct < 100
      ? Math.round(precoCalculadoCents / (1 - row.discount_pct / 100))
      : null;
  return {
    hasCost,
    custoTotalCents,
    impostoCents,
    cartaoCents,
    margemCents,
    cupomCents,
    freteCents,
    anuncioCents,
    precoCalculadoCents,
    denomValid: denom > 0,
  };
}

function PctCell({
  value,
  reais,
  onChange,
  onBlur,
}: {
  value: string;
  reais?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <TableCell>
      <div className="flex items-center gap-1">
        <Input
          className="h-6 w-12 text-xs"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
        <span>%</span>
      </div>
      {reais !== undefined ? <p className="mt-0.5 text-muted-foreground">{reais}</p> : null}
    </TableCell>
  );
}

function PrecificacaoPage() {
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [bulkDrafts, setBulkDrafts] = useState<RowDraft>({
    tax: "",
    card: "",
    margin: "",
    coupon: "",
    shipping: "",
    discount: "",
  });
  const [rowDrafts, setRowDrafts] = useState<Record<string, RowDraft>>({});
  const [averages, setAverages] = useState<SalesAverages | null>(null);
  const [pendingBulk, setPendingBulk] = useState<{ field: PctField; value: number } | null>(null);
  const applyingRef = useRef(false);

  async function load() {
    const { data, error } = await supabase
      .from("product_variants")
      .select(
        "id, sku, name, price_cents, compare_at_price_cents, cost_cents, extra_cost_cents, freight_cost_cents, tax_rate_pct, card_fee_pct, margin_pct, coupon_avg_pct, shipping_cost_pct, discount_pct, products!inner(title, status)",
      )
      .eq("products.status", "published")
      .order("sku");

    if (error) {
      toast.error("Não foi possível carregar os anúncios.");
      setLoading(false);
      return;
    }

    const variantRows: VariantRow[] = (data ?? []).map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      price_cents: v.price_cents,
      compare_at_price_cents: v.compare_at_price_cents,
      cost_cents: v.cost_cents,
      extra_cost_cents: v.extra_cost_cents,
      freight_cost_cents: v.freight_cost_cents,
      tax_rate_pct: v.tax_rate_pct,
      card_fee_pct: v.card_fee_pct,
      margin_pct: v.margin_pct,
      coupon_avg_pct: v.coupon_avg_pct,
      shipping_cost_pct: v.shipping_cost_pct,
      discount_pct: v.discount_pct,
      productTitle: (v.products as { title: string } | null)?.title ?? "",
    }));
    setRows(variantRows);
    setRowDrafts(
      Object.fromEntries(
        variantRows.map((v) => [
          v.id,
          {
            tax: formatDecimalToInput(v.tax_rate_pct),
            card: formatDecimalToInput(v.card_fee_pct),
            margin: formatDecimalToInput(v.margin_pct),
            coupon: formatDecimalToInput(v.coupon_avg_pct),
            shipping: formatDecimalToInput(v.shipping_cost_pct),
            discount: formatDecimalToInput(v.discount_pct),
          },
        ]),
      ),
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
    loadSalesAverages(AVERAGE_WINDOW_DAYS).then(setAverages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preço = Custo ÷ [1 − (imposto% + cartão% + margem% + cupom% + frete%)] e preço "de" = Preço ÷ (1 − desconto%) —
  // ambos aplicados automaticamente no product_variants de cada anúncio sempre que o custo (API)
  // ou qualquer % daquela variação mudam.
  useEffect(() => {
    if (loading || applyingRef.current) return;
    const updates = rows
      .map((row) => ({ row, calc: computeVariantPricing(row) }))
      .filter(
        ({ row, calc }) =>
          calc.precoCalculadoCents != null &&
          (calc.precoCalculadoCents !== row.price_cents ||
            calc.anuncioCents !== row.compare_at_price_cents),
      );
    if (updates.length === 0) return;

    applyingRef.current = true;
    (async () => {
      let applied = 0;
      for (const { row, calc } of updates) {
        const { error } = await supabase
          .from("product_variants")
          .update({
            price_cents: calc.precoCalculadoCents!,
            compare_at_price_cents: calc.anuncioCents,
          })
          .eq("id", row.id);
        if (!error) {
          applied++;
          setRows((prev) =>
            prev.map((r) =>
              r.id === row.id
                ? {
                    ...r,
                    price_cents: calc.precoCalculadoCents!,
                    compare_at_price_cents: calc.anuncioCents,
                  }
                : r,
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
  }, [rows, loading]);

  async function saveRowPct(rowId: string, field: PctField, rawValue: string) {
    const parsed = parseDecimalInput(rawValue) ?? 0;
    const current = rows.find((r) => r.id === rowId);
    if (!current || parsed === current[field]) return;
    const { error } = await supabase
      .from("product_variants")
      .update(buildPctPayload(field, parsed))
      .eq("id", rowId);
    if (error) {
      toast.error("Não foi possível salvar o %.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [field]: parsed } : r)));
  }

  // Preenche o % de todos os anúncios de uma vez (campo do cabeçalho) — cada linha continua
  // editável individualmente depois, para o caso de um produto específico precisar de uma
  // margem/imposto/cartão diferente do resto.
  async function applyBulkPct(field: PctField, parsed: number) {
    const draftKey = FIELD_TO_DRAFT_KEY[field];
    const ids = rows.map((r) => r.id);
    const { error } = await supabase
      .from("product_variants")
      .update(buildPctPayload(field, parsed))
      .in("id", ids);
    if (error) {
      toast.error("Não foi possível aplicar a todos.");
      return;
    }
    setRows((prev) => prev.map((r) => ({ ...r, [field]: parsed })));
    setRowDrafts((prev) => {
      const next = { ...prev };
      const formatted = formatDecimalToInput(parsed);
      for (const id of ids) {
        const current = next[id] ?? EMPTY_ROW_DRAFT;
        next[id] = { ...current, [draftKey]: formatted };
      }
      return next;
    });
    setBulkDrafts((prev) => ({ ...prev, [draftKey]: "" }));
    toast.success(
      `${FIELD_LABELS[field]} aplicado a ${ids.length} anúncio(s) — ajuste linha a linha se algum precisar ser diferente.`,
    );
  }

  // Ponto de entrada do "Aplicar a todos": campos que mexem no preço da loja inteira pedem confirmação.
  function requestBulkPct(field: PctField, rawValue: string) {
    const draftKey = FIELD_TO_DRAFT_KEY[field];
    const trimmed = rawValue.trim();
    if (!trimmed || rows.length === 0) {
      setBulkDrafts((prev) => ({ ...prev, [draftKey]: "" }));
      return;
    }
    const parsed = parseDecimalInput(trimmed) ?? 0;
    if (CONFIRM_FIELDS.includes(field)) {
      setPendingBulk({ field, value: parsed });
      return;
    }
    applyBulkPct(field, parsed);
  }

  // Antes/depois do preço de 1 unidade de cada produto com custo, se o % fosse aplicado a todos.
  function previewBulk(field: PctField, value: number) {
    let before = 0;
    let after = 0;
    let changed = 0;
    for (const row of rows) {
      const now = computeVariantPricing(row).precoCalculadoCents;
      const next = computeVariantPricing({ ...row, [field]: value }).precoCalculadoCents;
      if (now == null || next == null) continue;
      before += now;
      after += next;
      if (now !== next) changed++;
    }
    return {
      before,
      after,
      changed,
      variationPct: before > 0 ? ((after - before) / before) * 100 : 0,
    };
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

  function setDraft(rowId: string, base: RowDraft, key: PctDraftKey, value: string) {
    setRowDrafts((prev) => ({ ...prev, [rowId]: { ...(prev[rowId] ?? base), [key]: value } }));
  }

  function renderBulkHeader({
    field,
    draftKey,
    title,
    suggestion,
  }: {
    field: PctField;
    draftKey: PctDraftKey;
    title: string;
    suggestion?: { value: number; hint: string } | undefined;
  }) {
    return (
      <div className="space-y-1">
        <span>{title}</span>
        <Input
          className="h-6 w-14 text-xs"
          inputMode="decimal"
          placeholder="Aplicar a todos"
          value={bulkDrafts[draftKey]}
          onChange={(e) => setBulkDrafts((prev) => ({ ...prev, [draftKey]: e.target.value }))}
          onBlur={() => requestBulkPct(field, bulkDrafts[draftKey])}
        />
        <span className="block font-normal text-muted-foreground">% (todos)</span>
        {suggestion ? (
          <button
            type="button"
            className="block text-left font-normal text-[#16a34a] underline"
            onClick={() => setPendingBulk({ field, value: suggestion.value })}
          >
            Usar média real ({formatDecimalToInput(suggestion.value)}%)
            <span className="block text-muted-foreground no-underline">{suggestion.hint}</span>
          </button>
        ) : null}
      </div>
    );
  }

  const couponSuggestion =
    averages && averages.grossCents > 0
      ? {
          value: Math.round(averages.couponPct * 10) / 10,
          hint: `${averages.paidOrders} vendas em ${AVERAGE_WINDOW_DAYS} dias`,
        }
      : undefined;
  const shippingSuggestion =
    averages && averages.revenueCents > 0
      ? {
          value: Math.round(averages.shippingPct * 10) / 10,
          hint: `${averages.paidOrders} vendas em ${AVERAGE_WINDOW_DAYS} dias`,
        }
      : undefined;

  const preview = pendingBulk ? previewBulk(pendingBulk.field, pendingBulk.value) : null;

  return (
    <AdminShell>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Precificação</h1>
          <p className="text-sm text-muted-foreground">
            Custo puxado do FinMarket HUB; imposto, cartão, margem, média em cupom, custo do frete e
            desconto no anúncio por SKU — o preço de venda (e o "de" riscado, quando há desconto) é
            calculado e aplicado sozinho, na hora em que qualquer % muda. Cupom e frete começam em
            0%: preencha à mão ou use a média real das vendas (últimos {AVERAGE_WINDOW_DAYS} dias).
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
                <TableHead className="w-[14%]">SKU</TableHead>
                <TableHead className="w-[9%]">Custo (API)</TableHead>
                <TableHead className="w-[10%]">
                  {renderBulkHeader({
                    field: "tax_rate_pct",
                    draftKey: "tax",
                    title: "Imposto (% + R$)",
                  })}
                </TableHead>
                <TableHead className="w-[10%]">
                  {renderBulkHeader({
                    field: "card_fee_pct",
                    draftKey: "card",
                    title: "Cartão (% + R$)",
                  })}
                </TableHead>
                <TableHead className="w-[10%]">
                  {renderBulkHeader({
                    field: "margin_pct",
                    draftKey: "margin",
                    title: "Margem (% + R$)",
                  })}
                </TableHead>
                <TableHead className="w-[11%]">
                  {renderBulkHeader({
                    field: "coupon_avg_pct",
                    draftKey: "coupon",
                    title: "Média em cupom (% + R$)",
                    suggestion: couponSuggestion,
                  })}
                </TableHead>
                <TableHead className="w-[11%]">
                  {renderBulkHeader({
                    field: "shipping_cost_pct",
                    draftKey: "shipping",
                    title: "Custo do frete (% + R$)",
                    suggestion: shippingSuggestion,
                  })}
                </TableHead>
                <TableHead className="w-[11%]">
                  {renderBulkHeader({
                    field: "discount_pct",
                    draftKey: "discount",
                    title: "Desconto no anúncio",
                  })}
                </TableHead>
                <TableHead className="w-[14%]">Preço no anúncio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const calc = computeVariantPricing(row);
                const draft = rowDrafts[row.id] ?? EMPTY_ROW_DRAFT;
                const reais = (cents: number | null) =>
                  calc.hasCost && cents != null ? formatCentsToBRL(cents) : "—";

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
                    <PctCell
                      value={draft.tax}
                      reais={reais(calc.impostoCents)}
                      onChange={(v) => setDraft(row.id, draft, "tax", v)}
                      onBlur={() => saveRowPct(row.id, "tax_rate_pct", draft.tax)}
                    />
                    <PctCell
                      value={draft.card}
                      reais={reais(calc.cartaoCents)}
                      onChange={(v) => setDraft(row.id, draft, "card", v)}
                      onBlur={() => saveRowPct(row.id, "card_fee_pct", draft.card)}
                    />
                    <PctCell
                      value={draft.margin}
                      reais={reais(calc.margemCents)}
                      onChange={(v) => setDraft(row.id, draft, "margin", v)}
                      onBlur={() => saveRowPct(row.id, "margin_pct", draft.margin)}
                    />
                    <PctCell
                      value={draft.coupon}
                      reais={reais(calc.cupomCents)}
                      onChange={(v) => setDraft(row.id, draft, "coupon", v)}
                      onBlur={() => saveRowPct(row.id, "coupon_avg_pct", draft.coupon)}
                    />
                    <PctCell
                      value={draft.shipping}
                      reais={reais(calc.freteCents)}
                      onChange={(v) => setDraft(row.id, draft, "shipping", v)}
                      onBlur={() => saveRowPct(row.id, "shipping_cost_pct", draft.shipping)}
                    />
                    <PctCell
                      value={draft.discount}
                      onChange={(v) => setDraft(row.id, draft, "discount", v)}
                      onBlur={() => saveRowPct(row.id, "discount_pct", draft.discount)}
                    />
                    <TableCell className="font-semibold text-[#12294f]">
                      {calc.precoCalculadoCents != null ? (
                        calc.anuncioCents != null ? (
                          <>
                            <p className="font-normal text-muted-foreground line-through">
                              {formatCentsToBRL(calc.anuncioCents)}
                            </p>
                            <p>{formatCentsToBRL(calc.precoCalculadoCents)}</p>
                          </>
                        ) : (
                          formatCentsToBRL(calc.precoCalculadoCents)
                        )
                      ) : !calc.denomValid ? (
                        <span className="text-destructive">soma dos % ≥ 100%</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!pendingBulk} onOpenChange={(open) => !open && setPendingBulk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Aplicar {pendingBulk ? formatDecimalToInput(pendingBulk.value) : ""}% em "
              {pendingBulk ? FIELD_LABELS[pendingBulk.field] : ""}" para todos?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {preview && preview.changed > 0 ? (
                  <p>
                    Os preços de <strong>{preview.changed}</strong> anúncio(s) mudam{" "}
                    <strong>na hora, na loja inteira</strong>. Somando 1 unidade de cada produto: de{" "}
                    <strong>{formatCentsToBRL(preview.before)}</strong> para{" "}
                    <strong>{formatCentsToBRL(preview.after)}</strong> (
                    {preview.variationPct >= 0 ? "+" : ""}
                    {preview.variationPct.toFixed(1).replace(".", ",")}%).
                  </p>
                ) : (
                  <p>Nenhum preço muda com esse valor.</p>
                )}
                <p className="text-muted-foreground">
                  Depois você ainda pode ajustar linha a linha, ou trocar o valor quando tiver uma
                  média melhor.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                if (pendingBulk) {
                  setBulkDrafts((prev) => ({
                    ...prev,
                    [FIELD_TO_DRAFT_KEY[pendingBulk.field]]: "",
                  }));
                }
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingBulk) applyBulkPct(pendingBulk.field, pendingBulk.value);
                setPendingBulk(null);
              }}
            >
              Aplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
