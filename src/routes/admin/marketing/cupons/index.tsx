import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL, formatCentsToInput, parseCentsFromInput } from "@/lib/money";
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
  const [personalCount, setPersonalCount] = useState({ total: 0, used: 0 });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("coupons")
      .select(
        "id, code, discount_percent, min_order_cents, max_uses, uses_count, show_on_site, valid_from, valid_until, active",
      )
      .eq("auto_generated", false)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Não foi possível carregar os cupons.");
      setLoading(false);
      return;
    }
    setCoupons(data ?? []);
    const [{ count: total }, { count: used }] = await Promise.all([
      supabase
        .from("coupons")
        .select("id", { count: "exact", head: true })
        .eq("auto_generated", true),
      supabase
        .from("coupons")
        .select("id", { count: "exact", head: true })
        .eq("auto_generated", true)
        .gte("uses_count", 1),
    ]);
    setPersonalCount({ total: total ?? 0, used: used ?? 0 });
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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

  async function handleSave() {
    const code = form.code.trim().toUpperCase();
    const discountPercent = Number(form.discountPercent);
    if (!code) {
      toast.error("Informe o código do cupom.");
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

      <p className="mb-4 text-sm text-muted-foreground">
        <strong className="text-[#12294f]">{personalCount.total}</strong> cupons pessoais gerados
        automaticamente (carrinho abandonado),{" "}
        <strong className="text-[#12294f]">{personalCount.used}</strong> já usados. Cada um vale uma
        vez, só para o e-mail do cliente, por 7 dias.
      </p>

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
