import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Category = { id: string; name: string };

const NEW_CATEGORY_VALUE = "__new_category__";

export function CategorySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (categoryId: string) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadCategories() {
    const { data, error } = await supabase.from("categories").select("id, name").order("name");
    if (error) {
      toast.error("Não foi possível carregar as categorias.");
      return;
    }
    setCategories(data ?? []);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    const baseSlug = slugify(name) || "categoria";
    let slug = baseSlug;
    let created: Category | null = null;

    for (let attempt = 1; attempt <= 5 && !created; attempt++) {
      const { data, error } = await supabase
        .from("categories")
        .insert({ name, slug })
        .select("id, name")
        .single();

      if (!error && data) {
        created = data;
        break;
      }
      if (error?.code === "23505") {
        slug = `${baseSlug}-${attempt + 1}`;
        continue;
      }
      toast.error(error?.message ?? "Erro ao criar categoria.");
      break;
    }

    setCreating(false);
    if (created) {
      toast.success("Categoria criada.");
      setNewName("");
      setDialogOpen(false);
      await loadCategories();
      onChange(created.id);
    }
  }

  return (
    <>
      <Select
        value={value}
        onValueChange={(selected) => {
          if (selected === NEW_CATEGORY_VALUE) {
            setDialogOpen(true);
            return;
          }
          onChange(selected);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione uma categoria" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
          <SelectItem value={NEW_CATEGORY_VALUE}>+ Criar nova categoria</SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="new-category-name">Nome</Label>
            <Input
              id="new-category-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Ex: Cozinha"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
