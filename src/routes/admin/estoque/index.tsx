import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { LOW_STOCK_THRESHOLD, notifyStockChanged } from "@/lib/admin/use-low-stock";
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

export const Route = createFileRoute("/admin/estoque/")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: EstoquePage,
});

type StockRow = {
  id: string;
  sku: string;
  name: string;
  stock_quantity: number;
  productTitle: string;
};

function EstoquePage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingFor, setSavingFor] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("product_variants")
        .select("id, sku, name, stock_quantity, products(title)")
        .order("sku");

      if (error) {
        toast.error("Não foi possível carregar o estoque.");
        setLoading(false);
        return;
      }

      const stockRows = (data ?? []).map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        stock_quantity: v.stock_quantity,
        productTitle: (v.products as { title: string } | null)?.title ?? "",
      }));
      setRows(stockRows);
      setDrafts(Object.fromEntries(stockRows.map((r) => [r.id, String(r.stock_quantity)])));
      setLoading(false);
    }
    load();
  }, []);

  async function saveStock(row: StockRow) {
    const parsed = Number.parseInt(drafts[row.id] ?? "", 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error("Informe um número inteiro maior ou igual a zero.");
      setDrafts((prev) => ({ ...prev, [row.id]: String(row.stock_quantity) }));
      return;
    }
    if (parsed === row.stock_quantity) return;

    setSavingFor(row.id);
    const { error } = await supabase
      .from("product_variants")
      .update({ stock_quantity: parsed })
      .eq("id", row.id);
    setSavingFor(null);

    if (error) {
      toast.error("Não foi possível salvar o estoque.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, stock_quantity: parsed } : r)));
    setDrafts((prev) => ({ ...prev, [row.id]: String(parsed) }));
    notifyStockChanged();
    toast.success("Estoque atualizado.");
  }

  const lowCount = rows.filter((r) => r.stock_quantity < LOW_STOCK_THRESHOLD).length;

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Estoque</h1>
        <p className="text-sm text-muted-foreground">
          Quantidade disponível de cada SKU. Cada venda paga desconta daqui automaticamente.
          {lowCount > 0
            ? ` ${lowCount} SKU${lowCount > 1 ? "s" : ""} com menos de ${LOW_STOCK_THRESHOLD} unidades.`
            : ""}
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
              <TableHead>Estoque</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isLow = row.stock_quantity < LOW_STOCK_THRESHOLD;
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-mono text-xs font-semibold">{row.sku}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.productTitle}
                      {row.name ? ` — ${row.name}` : ""}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        className={`w-28 ${isLow ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={drafts[row.id] ?? ""}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        onBlur={() => saveStock(row)}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                        disabled={savingFor === row.id}
                      />
                      {isLow && (
                        <span className="text-xs font-medium text-red-600">
                          {row.stock_quantity === 0 ? "Sem estoque" : "Estoque baixo"}
                        </span>
                      )}
                    </div>
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
