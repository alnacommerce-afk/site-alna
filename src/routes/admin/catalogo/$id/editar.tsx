import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/admin-shell";
import { ProductForm } from "@/components/admin/product-form";

export const Route = createFileRoute("/admin/catalogo/$id/editar")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: EditarProdutoPage,
});

function EditarProdutoPage() {
  const { id } = Route.useParams();

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Editar Produto</h1>
        <p className="text-sm text-muted-foreground">Atualize os dados, fotos e variações.</p>
      </div>
      <ProductForm productId={id} />
    </AdminShell>
  );
}
