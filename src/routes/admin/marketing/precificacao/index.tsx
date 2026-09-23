import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL, formatDecimalToInput, parseDecimalInput } from "@/lib/money";
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
  cost_cents: number | null;
  extra_cost_cents: number | null;
  productTitle: string;
};

type PricingSettings = {
  tax_rate_pct: number;
  card_fee_pct: number;
  desired_margin_pct: number;
};

type FreightState = { status: "loading" | "ok" | "error"; cents: number | null };

function formatPct(value: number): string {
  return `${value.toFixed(2).replace(".", ",")}%`;
}

// Margem sobre o preço final (não sobre o custo): Preço = (Custo + Imposto) ÷ (1 − cartão% − margem%).
// Assim o % de cartão e a margem desejada realmente saem do preço de venda, não do custo.
function computeVariantPricing(row: VariantRow, settings: PricingSettings) {
  const hasCost = row.cost_cents != null;
  const custoTotalCents = (row.cost_cents ?? 0) + (row.extra_cost_cents ?? 0);
  const impostoCents = hasCost ? Math.round(custoTotalCents * (settings.tax_rate_pct / 100)) : null;
  const denom = 1 - settings.card_fee_pct / 100 - settings.desired_margin_pct / 100;
  const precoCalculadoCents =
    hasCost && impostoCents != null && denom > 0
      ? Math.round((custoTotalCents + impostoCents) / denom)
      : null;
  return { hasCost, custoTotalCents, impostoCents, precoCalculadoCents, denomValid: denom > 0 };
}

function PrecificacaoPage() {
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<PricingSettings>({
    tax_rate_pct: 0,
    card_fee_pct: 0,
    desired_margin_pct: 0,
  });
  const [settingsDrafts, setSettingsDrafts] = useState({ tax: "0", card: "0", margin: "0" });
  const [selectedUf, setSelectedUf] = useState<Record<string, string>>({});
  const [freight, setFreight] = useState<Record<string, FreightState>>({});
  const applyingRef = useRef(false);

  useEffect(() => {
    async function load() {
      const [{ data: settingsRow }, { data, error }] = await Promise.all([
        supabase
          .from("pricing_settings")
          .select("tax_rate_pct, card_fee_pct, desired_margin_pct")
          .eq("id", "default")
          .maybeSingle(),
        supabase
          .from("product_variants")
          .select(
            "id, sku, name, price_cents, cost_cents, extra_cost_cents, products!inner(title, status)",
          )
          .eq("products.status", "published")
          .order("sku"),
      ]);

      if (settingsRow) {
        setSettings(settingsRow);
        setSettingsDrafts({
          tax: formatDecimalToInput(settingsRow.tax_rate_pct),
          card: formatDecimalToInput(settingsRow.card_fee_pct),
          margin: formatDecimalToInput(settingsRow.desired_margin_pct),
        });
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
        productTitle: (v.products as { title: string } | null)?.title ?? "",
      }));
      setRows(variantRows);
      setSelectedUf(Object.fromEntries(variantRows.map((v) => [v.id, DEFAULT_UF])));
      setLoading(false);

      for (const v of variantRows) {
        calculateFreight(v.id, DEFAULT_UF);
      }
    }
    load();
  }, []);

  // Preço = (Custo + Imposto) ÷ (1 − cartão% − margem%) — aplicado automaticamente no
  // product_variants.price_cents de cada anúncio sempre que o custo (API) ou os % mudam.
  useEffect(() => {
    if (loading || applyingRef.current) return;
    const updates = rows
      .map((row) => ({ row, calc: computeVariantPricing(row, settings) }))
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
  }, [rows, settings, loading]);

  async function saveSetting(field: keyof PricingSettings, rawValue: string) {
    const parsed = parseDecimalInput(rawValue) ?? 0;
    if (parsed === settings[field]) return;
    const payload =
      field === "tax_rate_pct"
        ? { tax_rate_pct: parsed }
        : field === "card_fee_pct"
          ? { card_fee_pct: parsed }
          : { desired_margin_pct: parsed };
    const { error } = await supabase.from("pricing_settings").update(payload).eq("id", "default");
    if (error) {
      toast.error("Não foi possível salvar a configuração.");
      return;
    }
    setSettings((prev) => ({ ...prev, [field]: parsed }));
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
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Precificação</h1>
        <p className="text-sm text-muted-foreground">
          Custo puxado do FinMarket HUB, imposto, cartão e margem calculam o preço de venda
          automaticamente — e você vê, na hora, o frete (Melhor Envio) até a capital de qualquer
          estado.
        </p>
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
                <TableHead className="w-[19%]">SKU</TableHead>
                <TableHead className="w-[12%]">Custo (API)</TableHead>
                <TableHead className="w-[15%]">
                  <div className="space-y-1">
                    <span>Imposto</span>
                    <Input
                      className="h-6 w-16 text-xs"
                      inputMode="decimal"
                      value={settingsDrafts.tax}
                      onChange={(e) =>
                        setSettingsDrafts((prev) => ({ ...prev, tax: e.target.value }))
                      }
                      onBlur={() => saveSetting("tax_rate_pct", settingsDrafts.tax)}
                    />
                    <span className="font-normal text-muted-foreground">% aliq.</span>
                  </div>
                </TableHead>
                <TableHead className="w-[13%]">
                  <div className="space-y-1">
                    <span>Cartão</span>
                    <Input
                      className="h-6 w-14 text-xs"
                      inputMode="decimal"
                      value={settingsDrafts.card}
                      onChange={(e) =>
                        setSettingsDrafts((prev) => ({ ...prev, card: e.target.value }))
                      }
                      onBlur={() => saveSetting("card_fee_pct", settingsDrafts.card)}
                    />
                    <span className="font-normal text-muted-foreground">%</span>
                  </div>
                </TableHead>
                <TableHead className="w-[13%]">
                  <div className="space-y-1">
                    <span>Margem</span>
                    <Input
                      className="h-6 w-14 text-xs"
                      inputMode="decimal"
                      value={settingsDrafts.margin}
                      onChange={(e) =>
                        setSettingsDrafts((prev) => ({ ...prev, margin: e.target.value }))
                      }
                      onBlur={() => saveSetting("desired_margin_pct", settingsDrafts.margin)}
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
                const calc = computeVariantPricing(row, settings);
                const freightInfo = freight[row.id];

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
                      {calc.hasCost && calc.impostoCents != null
                        ? formatCentsToBRL(calc.impostoCents)
                        : "—"}
                    </TableCell>
                    <TableCell>{formatPct(settings.card_fee_pct)}</TableCell>
                    <TableCell>{formatPct(settings.desired_margin_pct)}</TableCell>
                    <TableCell className="font-semibold text-[#12294f]">
                      {calc.precoCalculadoCents != null ? (
                        formatCentsToBRL(calc.precoCalculadoCents)
                      ) : !calc.denomValid ? (
                        <span className="text-destructive">cartão+margem ≥ 100%</span>
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
