import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/money";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export const Route = createFileRoute("/admin/categorias/")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: CategoriasPage,
});

const NO_PARENT_VALUE = "__none__";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  image_url: string | null;
  position: number;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  imageFile: File | null;
  imagePreviewUrl: string | null;
  removeImage: boolean;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  parentId: NO_PARENT_VALUE,
  imageFile: null,
  imagePreviewUrl: null,
  removeImage: false,
};

function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  async function loadCategories() {
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, description, parent_id, image_url, position")
      .order("position");
    if (error) {
      toast.error("Não foi possível carregar as categorias.");
      setLoading(false);
      return;
    }
    setCategories(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function openCreateDialog() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(category: Category) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      parentId: category.parent_id ?? NO_PARENT_VALUE,
      imageFile: null,
      imagePreviewUrl: category.image_url,
      removeImage: false,
    });
    setDialogOpen(true);
  }

  function handleImageChange(file: File | null) {
    if (!file) return;
    setForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreviewUrl: URL.createObjectURL(file),
      removeImage: false,
    }));
  }

  async function handleSave() {
    const name = form.name.trim();
    if (!name) {
      toast.error("Informe o nome da categoria.");
      return;
    }

    setSaving(true);
    try {
      let imageUrl = form.removeImage ? null : form.imagePreviewUrl;

      if (form.imageFile) {
        const extension = form.imageFile.name.split(".").pop() || "jpg";
        const path = `categories/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("product-media")
          .upload(path, form.imageFile);
        if (uploadError) throw uploadError;
        imageUrl = supabase.storage.from("product-media").getPublicUrl(path).data.publicUrl;
      }

      const parentId = form.parentId === NO_PARENT_VALUE ? null : form.parentId;
      const slugBase = slugify(form.slug || name) || "categoria";

      if (editingId) {
        const { error } = await supabase
          .from("categories")
          .update({
            name,
            description: form.description || null,
            parent_id: parentId,
            image_url: imageUrl,
          })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Categoria atualizada.");
      } else {
        let slug = slugBase;
        let created = false;
        for (let attempt = 1; attempt <= 5 && !created; attempt++) {
          const { error } = await supabase.from("categories").insert({
            name,
            slug,
            description: form.description || null,
            parent_id: parentId,
            image_url: imageUrl,
            position: categories.length,
          });
          if (!error) {
            created = true;
            break;
          }
          if (error.code === "23505") {
            slug = `${slugBase}-${attempt + 1}`;
            continue;
          }
          throw error;
        }
        if (!created) throw new Error("Não foi possível gerar um slug único.");
        toast.success("Categoria criada.");
      }

      setDialogOpen(false);
      await loadCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar categoria.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!categoryToDelete) return;
    const category = categoryToDelete;
    setCategoryToDelete(null);

    const { error } = await supabase.from("categories").delete().eq("id", category.id);
    if (error) {
      toast.error("Não foi possível excluir a categoria.");
      return;
    }
    toast.success("Categoria excluída.");
    loadCategories();
  }

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Categorias</h1>
          <p className="text-sm text-muted-foreground">
            Organize os produtos da loja em categorias e subcategorias.
          </p>
        </div>
        <Button onClick={openCreateDialog}>Nova Categoria</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : categories.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhuma categoria cadastrada ainda. Clique em "Nova Categoria" para começar.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Imagem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Categoria mãe</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt=""
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-muted-foreground">/{category.slug}</TableCell>
                <TableCell className="text-muted-foreground">
                  {categories.find((c) => c.id === category.parent_id)?.name ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(category)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCategoryToDelete(category)}
                  >
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="category-name">Nome</Label>
              <Input
                id="category-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Cozinha"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="category-description">Descrição (opcional)</Label>
              <Textarea
                id="category-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <Label>Categoria mãe (opcional)</Label>
              <Select
                value={form.parentId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, parentId: value }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    {form.parentId === NO_PARENT_VALUE
                      ? "Nenhuma (categoria principal)"
                      : (categories.find((c) => c.id === form.parentId)?.name ?? "")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT_VALUE}>Nenhuma (categoria principal)</SelectItem>
                  {categories
                    .filter((c) => c.id !== editingId)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="category-image">Imagem (opcional)</Label>
              <Input
                id="category-image"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
              />
              {form.imagePreviewUrl ? (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={form.imagePreviewUrl}
                    alt=""
                    className="h-16 w-16 rounded object-cover"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        imageFile: null,
                        imagePreviewUrl: null,
                        removeImage: true,
                      }))
                    }
                  >
                    Remover imagem
                  </Button>
                </div>
              ) : null}
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
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir "{categoryToDelete?.name}"? Produtos e subcategorias vinculados a ela
              ficarão sem categoria.
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
