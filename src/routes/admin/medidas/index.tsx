import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/medidas/")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: MedidasPage,
});

type Field = "height" | "width" | "length" | "weight";

type MeasureRow = {
  id: string;
  sku: string;
  name: string;
  productTitle: string;
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  weight_g: number | null; // shown in grams, stored in kg
};

type Drafts = Record<string, Record<Field, string>>;

const FIELDS: { field: Field; label: string; unit: string }[] = [
  { field: "height", label: "Altura", unit: "cm" },
  { field: "width", label: "Largura", unit: "cm" },
  { field: "length", label: "Comprimento", unit: "cm" },
  { field: "weight", label: "Peso", unit: "g" },
];

function toInput(value: number | null): string {
  return value == null ? "" : String(value).replace(".", ",");
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

// grams <-> kg without floating point noise (e.g. 0.35 * 1000)
const gramsToKg = (g: number) => Math.round(g) / 1000;
const kgToGrams = (kg: number) => Math.round(kg * 1000);

function currentValue(row: MeasureRow, field: Field): number | null {
  if (field === "height") return row.height_cm;
  if (field === "width") return row.width_cm;
  if (field === "length") return row.length_cm;
  return row.weight_g;
}

function MedidasPage() {
  const [rows, setRows] = useState<MeasureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [savingFor, setSavingFor] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("product_variants")
        .select(
          "id, sku, name, package_height_cm, package_width_cm, package_length_cm, package_weight_kg, products(title)",
        )
        .order("sku");

      if (error) {
        toast.error("Não foi possível carregar as medidas.");
        setLoading(false);
        return;
      }

      const measureRows: MeasureRow[] = (data ?? []).map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        productTitle: (v.products as { title: string } | null)?.title ?? "",
        height_cm: v.package_height_cm,
        width_cm: v.package_width_cm,
        length_cm: v.package_length_cm,
        weight_g: v.package_weight_kg == null ? null : kgToGrams(v.package_weight_kg),
      }));
      setRows(measureRows);
      setDrafts(
        Object.fromEntries(
          measureRows.map((r) => [
            r.id,
            {
              height: toInput(r.height_cm),
              width: toInput(r.width_cm),
              length: toInput(r.length_cm),
              weight: toInput(r.weight_g),
            },
          ]),
        ),
      );
      setLoading(false);
    }
    load();
  }, []);

  function setDraft(rowId: string, field: Field, value: string) {
    setDrafts((prev) => ({ ...prev, [rowId]: { ...prev[rowId]!, [field]: value } }));
  }

  async function saveField(row: MeasureRow, field: Field) {
    const raw = drafts[row.id]?.[field] ?? "";
    const parsed = parseNumber(raw);
    const before = currentValue(row, field);

    if (Number.isNaN(parsed) || (parsed !== null && parsed <= 0)) {
      toast.error("Informe um número maior que zero.");
      setDraft(row.id, field, toInput(before));
      return;
    }
    if (parsed === before) return;

    const stored = field === "weight" && parsed !== null ? gramsToKg(parsed) : parsed;
    const patch =
      field === "height"
        ? { package_height_cm: stored }
        : field === "width"
          ? { package_width_cm: stored }
          : field === "length"
            ? { package_length_cm: stored }
            : { package_weight_kg: stored };

    setSavingFor(`${row.id}:${field}`);
    const { error } = await supabase
      .from("product_variants")
      .update(patch)
      .eq("id", row.id);
    setSavingFor(null);

    if (error) {
      toast.error("Não foi possível salvar a medida.");
      setDraft(row.id, field, toInput(before));
      return;
    }
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== row.id) return r;
        if (field === "height") return { ...r, height_cm: parsed };
        if (field === "width") return { ...r, width_cm: parsed };
        if (field === "length") return { ...r, length_cm: parsed };
        return { ...r, weight_g: parsed === null ? null : Math.round(parsed) };
      }),
    );
    toast.success("Medida atualizada — já vale no cálculo do frete.");
  }

  return (
    <AdminShell>
      <div className="mb-6 max-w-3xl">
        <h1 className="text-xl font-semibold">Medidas</h1>
        <p className="text-sm text-muted-foreground">
          Medidas e peso de <strong>uma unidade</strong> de cada SKU, só do produto (sem caixa nem
          envelope). O frete usa esses valores: quando o cliente leva várias unidades, o pacote
          cresce proporcionalmente à quantidade, com as unidades lado a lado, e o peso é a soma.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhum anúncio cadastrado ainda.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              {FIELDS.map((f) => (
                <TableHead key={f.field}>
                  {f.label} ({f.unit})
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-mono text-xs font-semibold">{row.sku}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.productTitle}
                    {row.name ? ` — ${row.name}` : ""}
                  </p>
                </TableCell>
                {FIELDS.map((f) => (
                  <TableCell key={f.field}>
                    <Input
                      className={`w-24 ${
                        currentValue(row, f.field) == null ? "border-amber-400" : ""
                      }`}
                      inputMode="decimal"
                      placeholder={f.unit}
                      value={drafts[row.id]?.[f.field] ?? ""}
                      onChange={(e) => setDraft(row.id, f.field, e.target.value)}
                      onBlur={() => saveField(row, f.field)}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      disabled={savingFor === `${row.id}:${f.field}`}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Campo em amarelo = sem medida cadastrada; o frete usa um valor padrão (16×11×2 cm, 300 g)
        até você preencher.
      </p>
    </AdminShell>
  );
}
