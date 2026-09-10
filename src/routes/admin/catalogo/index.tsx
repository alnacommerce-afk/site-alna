import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export const Route = createFileRoute("/admin/catalogo/")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: CatalogoPage,
});

type ProductRow = {
  id: string;
  title: string;
  status: "draft" | "published";
  categoryName: string | null;
  thumbnailUrl: string | null;
  minPriceCents: number | null;
  maxPriceCents: number | null;
  variantCount: number;
};

function CatalogoPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [productToDelete, setProductToDelete] = useState<ProductRow | null>(null);

  async function loadProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select(
        `id, title, status,
         category:categories(name),
         product_images(storage_path, position),
         product_variants(price_cents)`,
      )
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Não foi possível carregar os produtos.");
      setLoading(false);
      return;
    }

    const rows: ProductRow[] = (data ?? []).map((p) => {
      const images = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position);
      const thumbnailUrl = images[0]
        ? supabase.storage.from("product-media").getPublicUrl(images[0].storage_path).data.publicUrl
        : null;
      const prices = (p.product_variants ?? []).map((v) => v.price_cents);

      return {
        id: p.id,
        title: p.title,
        status: p.status,
        categoryName: p.category?.name ?? null,
        thumbnailUrl,
        minPriceCents: prices.length ? Math.min(...prices) : null,
        maxPriceCents: prices.length ? Math.max(...prices) : null,
        variantCount: prices.length,
      };
    });

    setProducts(rows);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function confirmDelete() {
    if (!productToDelete) return;
    const product = productToDelete;
    setProductToDelete(null);

    const { data: productImages } = await supabase
      .from("product_images")
      .select("storage_path")
      .eq("product_id", product.id);
    const paths = (productImages ?? []).map((img) => img.storage_path);
    if (paths.length > 0) {
      await supabase.storage.from("product-media").remove(paths);
    }

    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) {
      toast.error("Não foi possível excluir o produto.");
      return;
    }
    toast.success("Produto excluído.");
    loadProducts();
  }

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Catálogo</h1>
          <p className="text-sm text-muted-foreground">Produtos cadastrados na loja.</p>
        </div>
        <Button asChild>
          <Link to="/admin/catalogo/novo">Novo Produto</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhum produto cadastrado ainda. Clique em "Novo Produto" para começar.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Foto</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Variações</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  {product.thumbnailUrl ? (
                    <img
                      src={product.thumbnailUrl}
                      alt=""
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{product.title}</TableCell>
                <TableCell>{product.categoryName ?? "—"}</TableCell>
                <TableCell>
                  {product.minPriceCents == null
                    ? "—"
                    : product.minPriceCents === product.maxPriceCents
                      ? formatCentsToBRL(product.minPriceCents)
                      : `${formatCentsToBRL(product.minPriceCents)} – ${formatCentsToBRL(product.maxPriceCents!)}`}
                </TableCell>
                <TableCell>{product.variantCount}</TableCell>
                <TableCell>
                  <Badge variant={product.status === "published" ? "default" : "secondary"}>
                    {product.status === "published" ? "Publicado" : "Rascunho"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/admin/catalogo/$id/editar" params={{ id: product.id }}>
                      Editar
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setProductToDelete(product)}>
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AlertDialog
        open={!!productToDelete}
        onOpenChange={(open) => !open && setProductToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir "{productToDelete?.title}"? Essa ação não pode ser desfeita.
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
