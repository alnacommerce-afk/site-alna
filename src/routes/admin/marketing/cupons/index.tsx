import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL, formatCentsToInput, parseCentsFromInput } from "@/lib/money";
import { loadSalesAverages, type SalesAverages } from "@/lib/admin/sales-averages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/admin/marketing/cupons/")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: CuponsPage,
});

type Coupon = {
  id: string;
  code: string;
  discount_percent: number;
  min_order_cents: number;
  max_uses: number | null;
  uses_count: number;
  show_on_site: boolean;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
};

// "Modelo" coupons only set the percentage of the random codes sent to each customer (one code per customer,
// single use, tied to their e-mail). Customers never type the model's own code.
type ModelCoupon = {
  id: string;
  code: string;
  discount_percent: number;
  model_label: string | null;
  generated: number;
  used: number;
};

type FormState = {
  code: string;
  discountPercent: string;
  minOrder: string;
  maxUses: string;
  showOnSite: boolean;
  hasValidFrom: boolean;
  validFrom: string;
  hasValidUntil: boolean;
  validUntil: string;
  active: boolean;
};

const emptyForm: FormState = {
  code: "",
  discountPercent: "10",
  minOrder: "",
  maxUses: "",
  showOnSite: false,
  hasValidFrom: false,
  validFrom: "",
  hasValidUntil: false,
  validUntil: "",
  active: true,
};

function toDateInput(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

function CuponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [models, setModels] = useState<ModelCoupon[]>([]);
  const [modelToEdit, setModelToEdit] = useState<ModelCoupon | null>(null);
  const [modelPercent, setModelPercent] = useState("");
  const [savingModel, setSavingModel] = useState(false);
  const [avgDays, setAvgDays] = useState("90");
  const [averages, setAverages] = useState<SalesAverages | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("coupons")
      .select(
        "id, code, discount_percent, min_order_cents, max_uses, uses_count, show_on_site, valid_from, valid_until, active",
      )
      .eq("auto_generated", false)
      .eq("is_model", false)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Não foi possível carregar os cupons.");
      setLoading(false);
      return;
    }
    setCoupons(data ?? []);
    const { data: modelRows } = await supabase
      .from("coupons")
      .select("id, code, discount_percent, model_label")
      .eq("is_model", true)
      .order("created_at", { ascending: true });
    const modelIds = (modelRows ?? []).map((m) => m.id);
    const issued = modelIds.length
      ? ((
          await supabase
            .from("coupons")
            .select("source_coupon_id, uses_count")
            .in("source_coupon_id", modelIds)
        ).data ?? [])
      : [];
    setModels(
      (modelRows ?? []).map((m) => {
        const mine = issued.filter((c) => c.source_coupon_id === m.id);
        return {
          ...m,
          generated: mine.length,
          used: mine.filter((c) => c.uses_count >= 1).length,
        };
      }),
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setAverages(null);
    loadSalesAverages(Number(avgDays)).then(setAverages);
  }, [avgDays]);

  function openCreateDialog() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(coupon: Coupon) {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      discountPercent: String(coupon.discount_percent),
      minOrder: coupon.min_order_cents > 0 ? formatCentsToInput(coupon.min_order_cents) : "",
      maxUses: coupon.max_uses === null ? "" : String(coupon.max_uses),
      showOnSite: coupon.show_on_site,
      hasValidFrom: !!coupon.valid_from,
      validFrom: toDateInput(coupon.valid_from),
      hasValidUntil: !!coupon.valid_until,
      validUntil: toDateInput(coupon.valid_until),
      active: coupon.active,
    });
    setDialogOpen(true);
  }

  function openModelDialog(model: ModelCoupon) {
    setModelToEdit(model);
    setModelPercent(String(model.discount_percent));
  }

  // Only the percentage of a model can be changed here; it applies to the codes generated from now on
  // (codes already sent keep the percentage they were issued with).
  async function handleSaveModel() {
    if (!modelToEdit) return;
    const percent = Number(modelPercent);
    if (!percent || percent <= 0 || percent > 100) {
      toast.error("Informe um desconto entre 1 e 100%.");
      return;
    }
    setSavingModel(true);
    const { error } = await supabase
      .from("coupons")
      .update({ discount_percent: percent })
      .eq("id", modelToEdit.id);
    setSavingModel(false);
    if (error) {
      toast.error("Não foi possível salvar a porcentagem.");
      return;
    }
    toast.success(`Pronto: os próximos cupons serão de ${percent}%.`);
    setModelToEdit(null);
    load();
  }

  async function handleSave() {
    const code = form.code.trim().toUpperCase();
    const discountPercent = Number(form.discountPercent);
    if (!code) {
      toast.error("Informe o código do cupom.");
      return;
    }
    // Orders keep their coupons as a comma-separated list, so a code can't contain a comma.
    if (code.includes(",")) {
      toast.error("O código do cupom não pode ter vírgula.");
      return;
    }
    if (!discountPercent || discountPercent <= 0 || discountPercent > 100) {
      toast.error("Informe um desconto entre 1 e 100%.");
      return;
    }

    setSaving(true);
    const payload = {
      code,
      discount_percent: discountPercent,
      min_order_cents: parseCentsFromInput(form.minOrder),
      max_uses: form.maxUses.trim() === "" ? null : Math.max(0, Math.floor(Number(form.maxUses))),
      show_on_site: form.showOnSite,
      valid_from:
        form.hasValidFrom && form.validFrom ? new Date(form.validFrom).toISOString() : null,
      valid_until:
        form.hasValidUntil && form.validUntil ? new Date(form.validUntil).toISOString() : null,
      active: form.active,
    };

    const { error } = editingId
      ? await supabase.from("coupons").update(payload).eq("id", editingId)
      : await supabase.from("coupons").insert(payload);

    setSaving(false);
    if (error) {
      toast.error(
        error.code === "23505"
          ? "Já existe um cupom com esse código."
          : "Não foi possível salvar o cupom.",
      );
      return;
    }
    toast.success(editingId ? "Cupom atualizado." : "Cupom criado.");
    setDialogOpen(false);
    load();
  }

  async function confirmDelete() {
    if (!couponToDelete) return;
    const coupon = couponToDelete;
    setCouponToDelete(null);
    const { error } = await supabase.from("coupons").delete().eq("id", coupon.id);
    if (error) {
      toast.error("Não foi possível excluir o cupom.");
      return;
    }
    toast.success("Cupom excluído.");
    load();
  }

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Cupons</h1>
          <p className="text-sm text-muted-foreground">
            Códigos de desconto usados no carrinho e nos e-mails de recuperação de carrinho.
          </p>
        </div>
        <Button onClick={openCreateDialog}>Novo cupom</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Média de uso do cupom
          </p>
          <p className="mt-1 text-3xl font-bold text-[#12294f]">
            {averages ? `${averages.couponPct.toFixed(1).replace(".", ",")}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {averages
              ? `${formatCentsToBRL(averages.couponCents)} de desconto em ${formatCentsToBRL(averages.grossCents)} vendidos · ${averages.ordersWithCoupon} de ${averages.paidOrders} pedidos pagos usaram cupom`
              : "Calculando..."}
          </p>
        </div>
        <Select value={avgDays} onValueChange={setAvgDays}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <section className="mb-8 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-[#12294f]">Cupons aleatórios para clientes</h2>
          <p className="text-sm text-muted-foreground">
            Cada cliente recebe um código diferente (por exemplo VOLTA-AB12CD), de uso único, só para o e-mail dele e
            válido por 7 dias. Aqui você define só a porcentagem: mudar vale para os cupons novos, os que já foram
            enviados mantêm a porcentagem de quando foram criados.
          </p>
        </div>
        {loading ? null : models.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Nenhum cupom aleatório configurado.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {models.map((model) => (
              <div key={model.id} className="flex items-start justify-between gap-3 rounded-lg border p-4">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-[#12294f]">{model.code}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{model.model_label ?? "Cupom aleatório"}</p>
                  <p className="mt-3 text-3xl font-bold text-[#12294f]">{model.discount_percent}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <strong className="text-[#12294f]">{model.generated}</strong> gerados ·{" "}
                    <strong className="text-[#12294f]">{model.used}</strong> usados
                    {model.generated > 0
                      ? ` (${Math.round((model.used / model.generated) * 100)}%)`
                      : ""}{" "}
                    em todo o período
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => openModelDialog(model)}>
                  Editar %
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mb-3">
        <h2 className="text-base font-semibold text-[#12294f]">Cupons normais (o mesmo código para todos)</h2>
        <p className="text-sm text-muted-foreground">
          Os descontos de todos os cupons somam, até 3 por pedido: vale tanto para estes quanto para os aleatórios.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : coupons.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhum cupom cadastrado ainda.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Pedido mínimo</TableHead>
              <TableHead>Usos / saldo</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((coupon) => (
              <TableRow key={coupon.id}>
                <TableCell className="font-mono font-semibold">{coupon.code}</TableCell>
                <TableCell>{coupon.discount_percent}%</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {coupon.min_order_cents > 0
                    ? formatCentsToBRL(coupon.min_order_cents)
                    : "Sem mínimo"}
                </TableCell>
                <TableCell className="text-sm">
                  {coupon.max_uses === null ? (
                    <span className="text-muted-foreground">
                      Sem limite ({coupon.uses_count} usos)
                    </span>
                  ) : (
                    <span>
                      {coupon.uses_count} / {coupon.max_uses} ·{" "}
                      <strong
                        className={
                          coupon.max_uses - coupon.uses_count <= 5
                            ? "text-destructive"
                            : "text-[#16a34a]"
                        }
                      >
                        saldo {coupon.max_uses - coupon.uses_count}
                      </strong>
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {coupon.valid_from || coupon.valid_until
                    ? `${coupon.valid_from ? toDateInput(coupon.valid_from) : "—"} até ${
                        coupon.valid_until ? toDateInput(coupon.valid_until) : "sem vencimento"
                      }`
                    : "Sem vencimento"}
                </TableCell>
                <TableCell>
                  <Badge variant={coupon.active ? "default" : "secondary"}>
                    {coupon.active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(coupon)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setCouponToDelete(coupon)}>
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar cupom" : "Novo cupom"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="coupon-code">Código</Label>
              <Input
                id="coupon-code"
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="ALNA10OFF"
                className="font-mono uppercase"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="coupon-discount">Desconto (%)</Label>
              <Input
                id="coupon-discount"
                type="number"
                min={1}
                max={100}
                value={form.discountPercent}
                onChange={(e) => setForm((prev) => ({ ...prev, discountPercent: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="coupon-min-order">Pedido mínimo (R$)</Label>
              <Input
                id="coupon-min-order"
                value={form.minOrder}
                onChange={(e) => setForm((prev) => ({ ...prev, minOrder: e.target.value }))}
                placeholder="Sem mínimo"
                inputMode="decimal"
              />
              <p className="text-xs text-muted-foreground">
                O desconto só vale quando os produtos do carrinho somam esse valor (sem contar o
                frete).
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="coupon-max-uses">Limite de usos</Label>
              <Input
                id="coupon-max-uses"
                type="number"
                min={0}
                value={form.maxUses}
                onChange={(e) => setForm((prev) => ({ ...prev, maxUses: e.target.value }))}
                placeholder="Sem limite"
              />
              <p className="text-xs text-muted-foreground">
                Conta quando o pagamento é confirmado. O cupom nunca é barrado: se passar do limite,
                o saldo fica negativo (-1, -2...) e você recebe um e-mail. Avisos em 5 e em 1 uso
                restante. Para repor, é só aumentar este número.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="coupon-show">Divulgar no site</Label>
                <p className="text-xs text-muted-foreground">
                  Mostra o código, a condição e o termômetro de cupons restantes na loja e no
                  carrinho (só um cupom por vez).
                </p>
              </div>
              <Switch
                id="coupon-show"
                checked={form.showOnSite}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, showOnSite: checked }))}
              />
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="coupon-has-from">Tem data de início?</Label>
                <Switch
                  id="coupon-has-from"
                  checked={form.hasValidFrom}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, hasValidFrom: checked }))
                  }
                />
              </div>
              {form.hasValidFrom ? (
                <Input
                  type="date"
                  value={form.validFrom}
                  onChange={(e) => setForm((prev) => ({ ...prev, validFrom: e.target.value }))}
                />
              ) : null}
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="coupon-has-until">Tem data de vencimento?</Label>
                <Switch
                  id="coupon-has-until"
                  checked={form.hasValidUntil}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, hasValidUntil: checked }))
                  }
                />
              </div>
              {form.hasValidUntil ? (
                <Input
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => setForm((prev) => ({ ...prev, validUntil: e.target.value }))}
                />
              ) : (
                <p className="text-xs text-muted-foreground">Sem vencimento.</p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="coupon-active">Ativo</Label>
              <Switch
                id="coupon-active"
                checked={form.active}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!modelToEdit} onOpenChange={(open) => !open && setModelToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Porcentagem do cupom aleatório</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {modelToEdit?.model_label ?? modelToEdit?.code}. A nova porcentagem vale para os próximos cupons
              enviados; os que já foram enviados não mudam.
            </p>
            <Label htmlFor="model-percent">Desconto (%)</Label>
            <Input
              id="model-percent"
              type="number"
              min={1}
              max={100}
              value={modelPercent}
              onChange={(e) => setModelPercent(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModelToEdit(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveModel} disabled={savingModel}>
              {savingModel ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!couponToDelete}
        onOpenChange={(open) => !open && setCouponToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cupom</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir o cupom "{couponToDelete?.code}"? Ele deixará de funcionar imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
