import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
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
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
};

type FormState = {
  code: string;
  discountPercent: string;
  hasValidFrom: boolean;
  validFrom: string;
  hasValidUntil: boolean;
  validUntil: string;
  active: boolean;
};

const emptyForm: FormState = {
  code: "",
  discountPercent: "10",
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

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("coupons")
      .select("id, code, discount_percent, valid_from, valid_until, active")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Não foi possível carregar os cupons.");
      setLoading(false);
      return;
    }
    setCoupons(data ?? []);
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
      valid_from: form.hasValidFrom && form.validFrom ? new Date(form.validFrom).toISOString() : null,
      valid_until: form.hasValidUntil && form.validUntil ? new Date(form.validUntil).toISOString() : null,
      active: form.active,
    };

    const { error } = editingId
      ? await supabase.from("coupons").update(payload).eq("id", editingId)
      : await supabase.from("coupons").insert(payload);

    setSaving(false);
    if (error) {
      toast.error(
        error.code === "23505" ? "Já existe um cupom com esse código." : "Não foi possível salvar o cupom.",
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

            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="coupon-has-from">Tem data de início?</Label>
                <Switch
                  id="coupon-has-from"
                  checked={form.hasValidFrom}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, hasValidFrom: checked }))}
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
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, hasValidUntil: checked }))}
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

      <AlertDialog open={!!couponToDelete} onOpenChange={(open) => !open && setCouponToDelete(null)}>
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
