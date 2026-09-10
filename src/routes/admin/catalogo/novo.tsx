import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/admin-shell";
import { ProductForm } from "@/components/admin/product-form";

export const Route = createFileRoute("/admin/catalogo/novo")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: NovoProdutoPage,
});

function NovoProdutoPage() {
  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Novo Produto</h1>
        <p className="text-sm text-muted-foreground">
          Preencha os dados do produto, fotos e variações.
        </p>
      </div>
      <ProductForm />
    </AdminShell>
  );
}
